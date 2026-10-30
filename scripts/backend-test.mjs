// End-to-end backend checks against a live project: RLS isolation, tamper resistance,
// streak rules, the daily loop and the edge function's auth.
// Usage: node --env-file=.env.local scripts/backend-test.mjs
// Uses throwaway anonymous users and deletes them at the end.
import { execSync } from 'node:child_process';

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;
if (!URL || !KEY) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` -> ${detail}` : ''}`);
  if (!ok) failed += 1;
};

const headers = (token) => ({ apikey: KEY, Authorization: `Bearer ${token ?? KEY}`, 'Content-Type': 'application/json' });

async function call(path, { token, method = 'GET', body, extra } = {}) {
  const r = await fetch(`${URL}${path}`, {
    method,
    headers: { ...headers(token), ...extra },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: r.status, json };
}

const rpc = (fn, token, body = {}) => call(`/rest/v1/rpc/${fn}`, { token, method: 'POST', body });
const ai = (token, task, payload = {}) => call('/functions/v1/ai', { token, method: 'POST', body: { task, payload } });

async function newUser() {
  const { status, json } = await call('/auth/v1/signup', { method: 'POST', body: {} });
  if (status !== 200) throw new Error(`signup failed: ${status} ${JSON.stringify(json)}`);
  return { id: json.user.id, token: json.access_token };
}

function adminSql(sql) {
  // Test setup only: the CLI uses the project owner's login, never the browser.
  return execSync(`supabase db query --linked -o json "${sql}"`, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
}

const a = await newUser();
const b = await newUser();
console.log('Created two throwaway users');

// Treat them as real users so they exercise the real-squad path rather than the sample one.
adminSql(`update profiles set is_demo=false where id in ('${a.id}','${b.id}')`);

try {
  // --- Onboarding and squads
  const onboard = (u) =>
    rpc('complete_onboarding', u.token, {
      p_exam: 'SSC CHSL',
      p_attempt: 1,
      p_city_tier: 'tier2',
      p_daily_target: 4,
      p_weak_subjects: ['English'],
    });
  check('onboarding succeeds', (await onboard(a)).status < 300);
  check('second onboarding succeeds', (await onboard(b)).status < 300);
  check('onboarding is idempotent', (await onboard(a)).status < 300);

  const bad = await rpc('complete_onboarding', a.token, { p_exam: 'NOT AN EXAM', p_attempt: 1, p_city_tier: 'x', p_daily_target: 4, p_weak_subjects: ['English'] });
  check('unknown exam rejected', bad.status >= 400);

  const profileA = (await call(`/rest/v1/profiles?id=eq.${a.id}&select=*`, { token: a.token })).json[0];
  const profileB = (await call(`/rest/v1/profiles?id=eq.${b.id}&select=*`, { token: b.token })).json[0];
  check('profile readable by its owner (the original recursion bug)', profileA?.exam === 'SSC CHSL', JSON.stringify(profileA));
  check('both users land in the same squad', profileA.squad_id && profileA.squad_id === profileB.squad_id);

  const mastery = (await call(`/rest/v1/mastery?user_id=eq.${a.id}&select=score,status,topics(subject)`, { token: a.token })).json;
  check('mastery seeded', mastery.length > 10, `${mastery.length}`);
  check('weak subject starts at 30 with status weak', mastery.filter((m) => m.topics.subject === 'English').every((m) => m.score === 30 && m.status === 'weak'));
  check('other subjects start at 60', mastery.filter((m) => m.topics.subject !== 'English').every((m) => m.score === 60));

  // --- Isolation between users
  const other = await call(`/rest/v1/profiles?id=eq.${b.id}&select=*`, { token: a.token });
  check('cannot read another profile', Array.isArray(other.json) && other.json.length === 0, JSON.stringify(other.json));
  const otherMastery = await call(`/rest/v1/mastery?user_id=eq.${b.id}&select=score`, { token: a.token });
  check("cannot read another user's mastery", otherMastery.json.length === 0);
  const anonRead = await call('/rest/v1/mastery?select=score');
  check('signed-out caller reads no mastery', Array.isArray(anonRead.json) && anonRead.json.length === 0);

  const board = await rpc('get_squad_board', a.token);
  check('squad board shows both members', board.json.length === 2, JSON.stringify(board.json));
  check('squad board exposes no names or ids', !JSON.stringify(board.json).includes(b.id) && !('name' in board.json[0]));
  check('squad board marks only me', board.json.filter((m) => m.is_me).length === 1);

  // --- Tamper resistance
  const tamper = await call(`/rest/v1/profiles?id=eq.${a.id}`, { token: a.token, method: 'PATCH', body: { streak_count: 999, total_points: 999999 } });
  check('cannot edit own streak or points', tamper.status >= 400, `${tamper.status}`);
  const tamperOther = await call(`/rest/v1/profiles?id=eq.${b.id}`, { token: a.token, method: 'PATCH', body: { name: 'hacked' }, extra: { Prefer: 'return=representation' } });
  check('cannot edit another profile', Array.isArray(tamperOther.json) && tamperOther.json.length === 0, JSON.stringify(tamperOther.json));
  const rename = await call(`/rest/v1/profiles?id=eq.${a.id}`, { token: a.token, method: 'PATCH', body: { name: 'Renamed' }, extra: { Prefer: 'return=representation' } });
  check('can edit own name', rename.json?.[0]?.name === 'Renamed', JSON.stringify(rename.json));
  const squadWrite = await call('/rest/v1/squads', { token: a.token, method: 'POST', body: { name: 'x', exam: 'SSC CHSL' } });
  check('cannot create squads directly', squadWrite.status >= 400);
  const forged = await call('/rest/v1/proofs', { token: a.token, method: 'POST', body: { user_id: b.id, proof_date: '2026-01-01', proof_type: 'text' } });
  check('cannot file a proof as someone else', forged.status >= 400, `${forged.status}`);

  // --- Streak rules
  const proof1 = await call('/rest/v1/proofs', {
    token: a.token,
    method: 'POST',
    body: { user_id: a.id, proof_date: '2020-01-01', proof_type: 'text', content_text: 'Solved twenty problems on error spotting today.' },
    extra: { Prefer: 'return=representation' },
  });
  check('proof accepted', proof1.status === 201, JSON.stringify(proof1.json));
  check('backdated proof is forced to today', proof1.json?.[0]?.proof_date !== '2020-01-01', proof1.json?.[0]?.proof_date);
  const after1 = (await call(`/rest/v1/profiles?id=eq.${a.id}&select=streak_count,total_points`, { token: a.token })).json[0];
  check('first proof starts streak and adds 50 points', after1.streak_count === 1 && after1.total_points === 50, JSON.stringify(after1));
  await call('/rest/v1/proofs', { token: a.token, method: 'POST', body: { user_id: a.id, proof_date: '2020-01-01', proof_type: 'text', content_text: 'A second proof on the same day.' } });
  const after2 = (await call(`/rest/v1/profiles?id=eq.${a.id}&select=streak_count,total_points`, { token: a.token })).json[0];
  check('second proof same day changes nothing', after2.streak_count === 1 && after2.total_points === 50, JSON.stringify(after2));

  const boardB = await rpc('get_squad_board', b.token);
  check('squad sees the check-in', boardB.json.find((m) => !m.is_me)?.checked_in_today === true);
  const feedB = await rpc('get_squad_feed', b.token, { p_limit: 20 });
  check('squad feed shows the event', feedB.json.some((e) => e.kind === 'proof' && !e.is_me), JSON.stringify(feedB.json).slice(0, 200));
  check('squad feed hides proof content', !JSON.stringify(feedB.json).includes('error spotting'));

  // --- Daily loop
  const plan = await ai(a.token, 'daily_plan');
  check('plan generated', plan.status === 200 && plan.json?.tasks?.tasks?.length >= 2, JSON.stringify(plan.json).slice(0, 200));
  console.log(`      plan source: ${plan.json?.source}, ${plan.json?.tasks?.total_minutes} min`);
  const firstWeak = plan.json.tasks.tasks[0];
  check('plan starts with a weak topic', firstWeak.mastery_at_plan <= 30, JSON.stringify(firstWeak));
  check('plan size respects a 4 hour target', Math.abs(plan.json.tasks.total_minutes - 240) <= 48, `${plan.json.tasks.total_minutes}`);
  const cached = await ai(a.token, 'daily_plan');
  check('plan is cached, not regenerated', cached.json.id === plan.json.id && cached.json.tasks.total_minutes === plan.json.tasks.total_minutes);

  const done = await rpc('complete_task', a.token, { p_task_index: 0, p_minutes: 30, p_notes: 'test' });
  check('task completes', done.status === 200 && done.json.completed_count === 1, JSON.stringify(done.json));
  check('task completion nudges mastery', done.json.mastery_after === (firstWeak.mastery_at_plan ?? 0) + 2, JSON.stringify(done.json));
  const again = await rpc('complete_task', a.token, { p_task_index: 0, p_minutes: 30 });
  check('completing twice does not double count', again.json.already_completed === true);
  const hours = await rpc('log_hours', a.token, { p_hours: 1.5 });
  check('hours add up', Number(hours.json) === 2, JSON.stringify(hours.json));
  const badHours = await rpc('log_hours', a.token, { p_hours: -3 });
  check('negative hours rejected', badHours.status >= 400);

  const weekly = await ai(a.token, 'weekly_summary');
  check('weekly reflection uses real numbers', weekly.status === 200 && weekly.json.headline.includes('2'), JSON.stringify(weekly.json).slice(0, 200));
  const weeklyEmpty = await ai(b.token, 'weekly_summary');
  check('no reflection without data', weeklyEmpty.status === 422, `${weeklyEmpty.status}`);

  // --- Storage
  const put = (token, path, type) =>
    fetch(`${URL}/storage/v1/object/${path}`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': type }, body: new Blob(['x'.repeat(100)], { type }) });
  check('can upload to own folder', (await put(a.token, `documents/${a.id}/t.pdf`, 'application/pdf')).status === 200);
  check("cannot upload to another user's folder", (await put(a.token, `documents/${b.id}/t.pdf`, 'application/pdf')).status >= 400);
  check('non-PDF rejected from documents', (await put(a.token, `documents/${a.id}/t.exe`, 'application/x-msdownload')).status >= 400);
  const listOther = await call(`/storage/v1/object/list/documents`, { token: b.token, method: 'POST', body: { prefix: a.id } });
  check("cannot list another user's files", Array.isArray(listOther.json) && listOther.json.length === 0, JSON.stringify(listOther.json).slice(0, 120));

  // --- Edge function
  const noAuth = await fetch(`${URL}/functions/v1/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'daily_plan' }) });
  check('edge function rejects signed-out callers', noAuth.status === 401, `${noAuth.status}`);
  check('edge function rejects unknown tasks', (await ai(a.token, 'steal_keys')).status === 400);
  const body = JSON.stringify(plan.json);
  check('no canned fallback text in the plan', !body.includes('Lowest mastery score in your profile'));
} finally {
  const del = await rpc('delete_my_account', a.token);
  check('account deletion works', del.status < 300, JSON.stringify(del.json));
  const gone = await call(`/auth/v1/user`, { token: a.token });
  check('deleted user can no longer act', gone.status >= 400 || !gone.json?.id, `${gone.status}`);
  await rpc('delete_my_account', b.token);
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
