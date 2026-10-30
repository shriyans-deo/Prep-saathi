// Checks every AI task against the real provider, using a throwaway sample account.
// Usage: node --env-file=.env.local scripts/ai-test.mjs
const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` -> ${detail}` : ''}`);
  if (!ok) failed += 1;
};

async function call(path, { token, method = 'GET', body, extra } = {}) {
  const r = await fetch(`${URL}${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${token ?? KEY}`, 'Content-Type': 'application/json', ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  try {
    return { status: r.status, json: JSON.parse(text) };
  } catch {
    return { status: r.status, json: text };
  }
}

const ai = (token, task, payload = {}) => call('/functions/v1/ai', { token, method: 'POST', body: { task, payload } });

const signup = await call('/auth/v1/signup', { method: 'POST', body: {} });
const token = signup.json.access_token;
const uid = signup.json.user.id;
await call('/rest/v1/rpc/seed_my_demo_account', { token, method: 'POST', body: {} });

try {
  // Daily plan
  const plan = await ai(token, 'daily_plan', { regenerate: true });
  check('plan comes from AI', plan.json.source === 'ai', JSON.stringify(plan.json).slice(0, 300));
  console.log(`      focus: ${plan.json.tasks?.focus_note}`);
  for (const t of plan.json.tasks?.tasks ?? []) console.log(`      [${t.type}] ${t.topic}: ${t.task} (${t.minutes}m) | ${t.why}`);
  check('plan cites real data in its reasons', (plan.json.tasks?.tasks ?? []).filter((t) => !t.completed).every((t) => /\d/.test(t.why)));

  // Topic quiz
  const topics = (await call(`/rest/v1/mastery?user_id=eq.${uid}&select=topic_id,topics(topic_name)&order=score.asc&limit=1`, { token })).json;
  const quiz = await ai(token, 'topic_quiz', { topic_id: topics[0].topic_id });
  check('quiz generated', quiz.status === 200 && quiz.json.questions?.length >= 3, JSON.stringify(quiz.json).slice(0, 300));
  const questions = quiz.json.questions ?? [];
  check('every answer is one of its options', questions.every((q) => q.options.includes(q.answer)));
  console.log(`      topic: ${quiz.json.topic_name}; Q1: ${questions[0]?.q}`);

  // Answer two wrong on purpose
  const answers = questions.map((q, i) => (i < 2 ? q.options.find((o) => o !== q.answer) : q.answer));
  const before = (await call(`/rest/v1/mastery?user_id=eq.${uid}&topic_id=eq.${topics[0].topic_id}&select=score`, { token })).json[0].score;
  const result = await ai(token, 'quiz_submit', { quiz_id: quiz.json.id, answers });
  check('feedback comes from AI', result.json.source === 'ai', JSON.stringify(result.json).slice(0, 300));
  check('feedback names a concept', Boolean(result.json.concept_gap));
  console.log(`      ${result.json.score}/${result.json.total}. Gap: ${result.json.concept_gap}. ${result.json.feedback}`);
  const after = (await call(`/rest/v1/mastery?user_id=eq.${uid}&topic_id=eq.${topics[0].topic_id}&select=score`, { token })).json[0].score;
  check('quiz moves mastery by its delta', after === Math.max(0, Math.min(100, before + result.json.mastery_delta)), `${before} ${result.json.mastery_delta} ${after}`);
  const repeat = await ai(token, 'quiz_submit', { quiz_id: quiz.json.id, answers });
  const afterRepeat = (await call(`/rest/v1/mastery?user_id=eq.${uid}&topic_id=eq.${topics[0].topic_id}&select=score`, { token })).json[0].score;
  check('resubmitting does not change mastery again', repeat.status === 200 && afterRepeat === after);

  // Document mapping, using a topic that is NOT time-speed-distance, to prove no canned output
  const doc = await call('/rest/v1/documents', {
    token,
    method: 'POST',
    extra: { Prefer: 'return=representation' },
    body: {
      user_id: uid,
      filename: 'economics-notes.pdf',
      storage_path: `${uid}/economics-notes.pdf`,
      extracted_text:
        'Economics notes for SSC CGL. The Reserve Bank of India sets the repo rate, the rate at which it lends to commercial banks. A higher repo rate makes borrowing costlier and reduces inflation. The Cash Reserve Ratio is the share of deposits banks must keep with the RBI. GDP measures the total value of goods and services produced in a country in a year. Fiscal deficit is the gap between government expenditure and its revenue excluding borrowings. Direct taxes include income tax; indirect taxes include GST.',
    },
  });
  const mapped = await ai(token, 'doc_process', { document_id: doc.json[0].id });
  check('document analysed', mapped.status === 200 && mapped.json.processed === true, JSON.stringify(mapped.json).slice(0, 300));
  console.log(`      ${mapped.json.ai_summary}`);
  console.log(`      detected: ${JSON.stringify(mapped.json.detected_topics)}, overlap: ${JSON.stringify(mapped.json.weak_topic_overlap)}`);
  check('document summary reflects the document', /repo|RBI|Reserve Bank|GDP|inflation|deficit/i.test(mapped.json.ai_summary ?? ''));
  check('document is not mapped to the canned topic', !(mapped.json.detected_topics ?? []).includes('Time, Speed and Distance'));
  check('document quiz built', (mapped.json.quiz ?? []).length >= 3);
  const docQuiz = await ai(token, 'document_quiz', { document_id: doc.json[0].id });
  check('document quiz starts', docQuiz.status === 200 && Boolean(docQuiz.json.id), JSON.stringify(docQuiz.json).slice(0, 200));

  // Weekly reflection
  const weekly = await ai(token, 'weekly_summary');
  check('reflection comes from AI', weekly.json.source === 'ai', JSON.stringify(weekly.json).slice(0, 300));
  console.log(`      ${weekly.json.headline} | ${weekly.json.pattern} | ${weekly.json.win} | ${weekly.json.next_week_focus}`);

  // Proof note
  const proof = await call('/rest/v1/proofs', {
    token,
    method: 'POST',
    extra: { Prefer: 'return=representation' },
    body: { user_id: uid, proof_date: new Date().toISOString().slice(0, 10), proof_type: 'text', content_text: 'Solved 15 relative speed problems and revised the harmonic mean formula for average speed.' },
  });
  const note = await ai(token, 'proof_check', { proof_id: proof.json[0].id });
  check('proof note returned', Boolean(note.json.verdict), JSON.stringify(note.json).slice(0, 200));
  check('proof note does not claim verification', !/verified|proven|confirmed/i.test(note.json.verdict ?? ''));
  console.log(`      ${note.json.verdict}`);

  // Hindi
  await call(`/rest/v1/profiles?id=eq.${uid}`, { token, method: 'PATCH', body: { language_pref: 'hi' } });
  const hindi = await ai(token, 'daily_plan', { regenerate: true });
  check('plan is written in Hindi when the account is Hindi', /[ऀ-ॿ]/.test(hindi.json.tasks?.focus_note ?? ''), hindi.json.tasks?.focus_note);
  console.log(`      ${hindi.json.tasks?.focus_note}`);
} finally {
  await call('/rest/v1/rpc/delete_my_account', { token, method: 'POST', body: {} });
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll AI checks passed');
process.exit(failed ? 1 : 0);
