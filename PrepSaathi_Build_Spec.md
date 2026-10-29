# PrepSaathi — Complete Build Spec

**Innov-a-thon 2.0 Round 2 · NIT Rourkela · 13–15 Nov 2026**
Team Bhole Chature · Spec dated 26 Oct 2026

---

## 1. Scope and constraints

**Time available:** ~18 days. Realistically 10–12 working days once the Round 1 PDD is submitted on 2 Nov.

**What this prototype has to prove, in order of importance:**

1. The execution gap is real and measurable, and the product makes it visible daily.
2. The daily loop closes — plan → study → prove → feedback → tomorrow's plan changes.
3. AI does something structurally useful, not decorative.
4. A user's own study material can be absorbed and turned into tasks and quizzes.

Anything that does not serve one of those four is cut.

**Known hard constraints — name these before a judge finds them:**

| Constraint | Reality | How to handle it |
|---|---|---|
| WhatsApp-first positioning | A web app cannot send WhatsApp messages without a Business API account, which needs business verification and a 2–4 week approval cycle | Build one **mocked WhatsApp thread screen** showing the same daily loop as chat bubbles. Say plainly: "this is the execution engine; WhatsApp is the delivery channel for Tier 2–3." |
| Low-bandwidth claim | A React web app is not low-bandwidth | Add a "Lite mode" toggle that drops charts to numbers and disables images. Even a partial implementation makes the claim honest. |
| Proof verification | A vision model checking a notebook photo is gameable in ten seconds | Call it a **friction and honesty nudge**, never "verification." |
| No-code backend | Lovable + Supabase is not production architecture | Frame as "a working proof of the loop," and have a one-slide answer for what production needs. |

**Explicitly not building:** payments, real WhatsApp integration, coach/parent dashboard (mock one screen if asked), offline sync, push notifications, voice transcription at scale.

---

## 2. System architecture

Three layers. Nothing else.

```
┌──────────────────────────────────────────────┐
│  FRONTEND — React (Lovable)                  │
│  8 screens, Recharts, Tailwind               │
│  Holds: no secrets, no business logic         │
└──────────────┬───────────────────────────────┘
               │ supabase-js (auth'd requests)
               ▼
┌──────────────────────────────────────────────┐
│  BACKEND — Supabase                          │
│  • Postgres (9 tables, RLS on all)           │
│  • Auth (email + password)                   │
│  • Storage (2 buckets: proofs, documents)    │
│  • Edge Functions (Deno) ← holds the API key │
└──────────────┬───────────────────────────────┘
               │ HTTPS, server-side only
               ▼
┌──────────────────────────────────────────────┐
│  AI LAYER — Groq or xAI (OpenAI-compatible)  │
│  4 prompt types, all returning strict JSON   │
└──────────────────────────────────────────────┘
```

**The one rule that matters:** the frontend never talks to the AI provider directly. Every AI call goes `frontend → edge function → provider`. The API key lives only in Supabase secrets. If you put the key in frontend code, anyone can open DevTools and take it, and scrapers find exposed keys in public repos within hours.

---

## 3. Database schema

Nine tables. Run this as a single SQL block in the Supabase SQL editor.

```sql
-- 1. PROFILES (extends auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  exam text not null,                    -- 'SSC CGL' | 'IBPS PO' | 'UPSC' | ...
  attempt_number int default 1,
  city_tier text,                        -- 'metro' | 'tier2' | 'small_town'
  daily_target_hrs numeric default 6,
  streak_count int default 0,
  total_points int default 0,
  squad_id uuid references squads(id),
  language_pref text default 'en',       -- 'en' | 'hi'
  created_at timestamptz default now()
);

-- 2. SQUADS
create table squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  exam text not null,
  member_count int default 0,
  created_at timestamptz default now()
);

-- 3. TOPICS (seed ~60 rows, not user-generated)
create table topics (
  id uuid primary key default gen_random_uuid(),
  exam text not null,
  subject text not null,                 -- 'Quantitative Aptitude'
  topic_name text not null,              -- 'Time, Speed and Distance'
  difficulty text default 'intermediate'
);

-- 4. MASTERY (the brain — drives plan generation)
create table mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  topic_id uuid references topics(id),
  score int default 0,                   -- 0-100
  status text default 'weak',            -- 'weak' | 'learning' | 'mastered'
  attempts int default 0,
  last_tested_at timestamptz,
  updated_at timestamptz default now(),
  unique(user_id, topic_id)
);

-- 5. DAILY_PLANS (cache AI output here — never regenerate on render)
create table daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  plan_date date not null,
  tasks jsonb not null,                  -- see shape in §5
  generated_by_ai boolean default true,
  completed_count int default 0,
  created_at timestamptz default now(),
  unique(user_id, plan_date)
);

-- 6. STUDY_LOGS (the execution-gap data — the most important table)
create table study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  log_date date not null,
  planned_hrs numeric not null,
  actual_hrs numeric not null,
  topics_covered jsonb,
  created_at timestamptz default now(),
  unique(user_id, log_date)
);

-- 7. PROOFS
create table proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  proof_date date not null,
  proof_type text not null,              -- 'photo' | 'voice' | 'text'
  content_url text,                      -- storage path
  content_text text,                     -- for text proofs
  ai_verdict text,                       -- plausibility note, not verification
  created_at timestamptz default now()
);

-- 8. QUIZZES
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  topic_id uuid references topics(id),
  source_document_id uuid references documents(id),  -- null if syllabus-generated
  questions jsonb not null,
  user_answers jsonb,
  score int,
  ai_feedback text,                      -- concept-level, not score-level
  created_at timestamptz default now()
);

-- 9. DOCUMENTS (the differentiator)
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  extracted_text text,
  ai_summary text,
  detected_topics jsonb,
  weak_topic_overlap jsonb,
  suggested_tasks jsonb,
  processed boolean default false,
  created_at timestamptz default now()
);
```

### Row Level Security — do not skip

```sql
alter table profiles enable row level security;
alter table mastery enable row level security;
alter table daily_plans enable row level security;
alter table study_logs enable row level security;
alter table proofs enable row level security;
alter table quizzes enable row level security;
alter table documents enable row level security;

-- Repeat this pattern for each user-owned table:
create policy "own rows" on study_logs
  for all using (auth.uid() = user_id);

-- Topics are public read:
create policy "read topics" on topics for select using (true);

-- Squad members can see each other's streak only (not full profiles):
create policy "squad visibility" on profiles
  for select using (
    auth.uid() = id
    or squad_id = (select squad_id from profiles where id = auth.uid())
  );
```

Lovable frequently skips RLS. A technically literate judge may ask, and "any logged-in user can read every user's data" is an answer you do not want to give.

### Storage buckets

| Bucket | Public | Contents | Policy |
|---|---|---|---|
| `proofs` | No | notebook photos, voice notes | owner read/write only |
| `documents` | No | uploaded PDFs, note photos | owner read/write only |

---

## 4. Backend build

**Step-by-step:**

1. Create a Supabase project. Note the project URL and anon key — these are safe in the frontend.
2. Run the SQL block from §3.
3. Seed `topics`: 60 rows covering SSC CGL (Quantitative Aptitude, Reasoning, English, General Awareness) and UPSC (Polity, History, Geography, Economy, Environment). Roughly 8 topics per subject is enough.
4. Enable email auth. **Turn off email confirmation** for the demo, or you will be stuck waiting for a verification mail on stage.
5. Create the two storage buckets, both private.
6. Install the Supabase CLI and deploy the edge function (§5).
7. Set the secret:
   ```bash
   supabase secrets set AI_API_KEY=your_key_here
   supabase secrets set AI_MODEL=model_id_from_provider_docs
   ```

**Database triggers worth adding** (they make the app feel alive without frontend work):

```sql
-- Bump streak when a proof is submitted
create or replace function bump_streak() returns trigger as $$
begin
  update profiles
    set streak_count = streak_count + 1,
        total_points = total_points + 50
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_proof_insert
  after insert on proofs
  for each row execute function bump_streak();
```

Add a second trigger that recomputes `mastery.status` from `score` (`<40` weak, `40–70` learning, `>70` mastered) whenever a quiz is scored.

---

## 5. The AI / API layer

### Provider choice

**Groq** (`https://api.groq.com/openai/v1`) — free tier, very fast, runs Llama models. Best for a demo: no billing surprise, sub-second responses.
**xAI Grok** (`https://api.x.ai/v1`) — paid, stronger reasoning.

Both are OpenAI-compatible, so switching is one base URL and one model string. **Check the provider's docs for the current model ID before you paste** — model names change frequently and a stale ID returns a 404 that looks like a broken app.

### The single edge function

One function, four tasks. Deploy as `supabase/functions/ai/index.ts`.

```ts
const BASE = "https://api.groq.com/openai/v1/chat/completions";
const KEY = Deno.env.get("AI_API_KEY");
const MODEL = Deno.env.get("AI_MODEL");

const SYSTEM = "You are a study-planning engine for Indian government exam aspirants. Return ONLY valid JSON matching the requested schema. No markdown, no backticks, no preamble, no explanation.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { task, payload } = await req.json();
    const prompt = buildPrompt(task, payload);

    const r = await fetch(BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!r.ok) {
      return new Response(JSON.stringify(FALLBACKS[task]), { headers: cors });
    }

    const data = await r.json();
    let text = data.choices[0].message.content;
    text = text.replace(/```json|```/g, "").trim();

    // Validate before returning — never ship unparsed model output to the UI
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = FALLBACKS[task];
    }

    return new Response(JSON.stringify(parsed), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: true }), { headers: cors });
  }
});

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};
```

### Task 1 — Daily plan generation

**Trigger:** first dashboard load of the day, or the Regenerate button.
**Cache in `daily_plans`. Never regenerate on re-render** — free tiers rate-limit, and a 429 mid-pitch is fatal.

```
Generate today's study plan.

EXAM: {exam}
DAILY TARGET: {daily_target_hrs} hours
WEAK TOPICS (score < 40): {weak_topics}
LEARNING TOPICS (40-70): {learning_topics}
YESTERDAY: planned {planned} hrs, completed {actual} hrs, finished {n} of {m} tasks
LAST QUIZ: {topic} scored {score}%

Rules:
- 3 to 4 tasks only. Total minutes must be within 20% of the daily target.
- At least one task on a weak topic.
- At least one revision task on a previously mastered topic.
- If yesterday's completion was below 60%, reduce total minutes by 25%.
- "why" must reference the user's actual data, never generic encouragement.

Return ONLY:
{
  "tasks": [
    {
      "subject": "Quantitative Aptitude",
      "topic": "Time, Speed and Distance",
      "task": "Practice 15 relative-motion problems",
      "minutes": 45,
      "type": "weak_topic",
      "why": "You scored 38% here on 22 Oct"
    }
  ],
  "total_minutes": 180,
  "focus_note": "One line on what today is really about"
}
```

**Fallback object** (used when the call fails or returns unparseable text):

```json
{
  "tasks": [
    {"subject":"Quantitative Aptitude","topic":"Time, Speed and Distance","task":"Practice 15 problems","minutes":45,"type":"weak_topic","why":"Lowest mastery score in your profile"},
    {"subject":"Reasoning","topic":"Syllogism","task":"Solve 20 questions","minutes":30,"type":"learning","why":"Due for reinforcement"},
    {"subject":"English","topic":"Reading Comprehension","task":"2 passages, timed","minutes":40,"type":"revision","why":"Maintain your strongest area"}
  ],
  "total_minutes": 115,
  "focus_note": "Start with the weakest topic while focus is highest."
}
```

### Task 2 — Quiz feedback (concept-level)

**Trigger:** quiz submission. This is your `<24 hour feedback` claim made real.

```
A user answered a 5-question quiz.

TOPIC: {topic}
QUESTIONS AND ANSWERS: {questions_with_user_answers}

Identify the single underlying concept gap behind the wrong answers.
Do not restate which questions were wrong. Name the concept.

Return ONLY:
{
  "score": 3,
  "concept_gap": "Relative motion when two objects move in the same direction",
  "feedback": "Two sentences, plain language, no encouragement filler",
  "mastery_delta": -8,
  "remedial_task": {"task":"...","minutes":25},
  "retest_in_days": 3
}
```

`mastery_delta` writes back to `mastery.score`, which changes tomorrow's plan. **Say that out loud in the pitch** — it is what makes this a system rather than a set of features.

### Task 3 — Document mapping (your differentiator)

**Trigger:** document upload, after text extraction.

```
Map this study material to the exam syllabus.

EXAM: {exam}
USER'S WEAK TOPICS: {weak_topics}
DOCUMENT TEXT (first 3000 chars): {text}

Return ONLY:
{
  "summary": "Two sentences, plain language",
  "detected_topics": ["Quadratic Equations","Polynomials"],
  "difficulty": "intermediate",
  "overlaps_weak_topics": ["Quadratic Equations"],
  "suggested_tasks": [
    {"task":"Work through pages 1-4 and solve the 12 examples","minutes":40,"why":"Covers your weakest topic"}
  ],
  "quiz": [
    {"q":"...","options":["a","b","c","d"],"answer":"a","concept":"..."}
  ]
}

Generate exactly 5 quiz questions, drawn only from the document's content.
```

Cap extracted text at 3000 characters. Longer input costs more, runs slower, and does not improve output for this task.

### Task 4 — Weekly reflection

**Trigger:** Sunday, or a manual button during the demo.

```
Summarise this user's week.

DAILY LOGS: {7_days_of_planned_vs_actual}
TASKS COMPLETED: {n} of {m}
QUIZZES: {scores}

Return ONLY:
{
  "headline": "You planned 38 hours and executed 22",
  "pattern": "Your gap concentrates on Thursday and Friday evenings",
  "win": "Syllogism accuracy went from 45% to 72%",
  "next_week_focus": "One specific thing"
}
```

The `pattern` line is the single most quotable AI output in the product — it tells the user something about themselves they did not know.

### Document text extraction

- **PDFs:** `pdf.js` in the browser. No server cost, works offline, keeps the file off your backend until the user confirms.
- **Photos of handwritten notes:** send the image to a vision-capable model as base64. If your provider's free tier has no vision model, skip photo upload for the demo and support PDFs only — do not fake it.

---

## 6. Frontend — complete screen spec

**Stack:** React + Tailwind + Recharts + supabase-js. All Lovable defaults.

**Design tokens — match the deck, not the current build:**

```
--navy:    #0B1F3A   (headers, sidebar, chart axis)
--blue:    #2563EB   (primary actions, executed line)
--sky:     #60A5FA   (secondary data series)
--orange:  #F97316   (streaks, warnings, gap fill)
--grey:    #94A3B8   (planned line, muted text)
--bg:      #F8FAFC
font: Inter
```

The current build is green/orange. When the slide and the screen do not match, it reads as two different projects. Change the app, not the deck.

### Navigation

Sidebar (desktop) / bottom tabs (mobile), in this order:

**Dashboard · Today's Plan · Library · Quiz · Proof · Squad · Progress**

Drop "Study Session" as a nav item — it is what the Start button opens into. Keep the Hindi toggle and the sync pill; both are genuine credibility signals for the Tier 2–3 positioning. **Remove the "Edit with Lovable" badge before the pitch.**

---

### Screen 1 — Auth

Email + password, sign up and log in. One screen, split layout, product promise on the left panel. Redirect to Onboarding if `profiles.exam` is null, otherwise to Dashboard.

### Screen 2 — Onboarding (3 steps)

Matches the "Simple 4 Steps" slide in the deck.

**Step 1:** Which exam? Which attempt? → `profiles.exam`, `attempt_number`
**Step 2:** Daily target hours (slider, 2–12). Pick 3 subjects you find hardest → seeds `mastery` at score 30 for those topics, 60 for the rest.
**Step 3:** Auto-join a squad matching your exam → `squad_id`. Show the five pseudonymous members you are joining.

Progress bar across the top. No skip button — the mastery seeding in step 2 is what makes the first daily plan non-generic.

### Screen 3 — Dashboard (the demo screen)

**Header:** date · "Welcome back, {name}" · streak flame · points.
**Under the header, one line of plain text:** *"You've executed 22 of 38 planned hours this week."* This states the thesis before any chart renders.

**Primary chart — Execution Gap.** Full width, largest element on the page. Detail in §8.

**Today's Plan card.** Three task rows: subject, topic, minutes, mastery %, progress bar, Start button. Header label: **"AI-generated from your weak topics"** so the judge knows it was not hand-entered.

**Right column, top to bottom:**
- **Daily Goals** — seeded with two complete, one pending. Never show "No goals set yet."
- **Squad Snapshot** — members completed today, average streak, link through.
- **Quick Actions** — four buttons: Upload document · Take quiz · Submit proof · Log hours.

**Below the fold:** the accuracy/consistency curve from the current build, kept as a secondary chart.

### Screen 4 — Today's Plan

Full task list. Each card carries the task, estimated minutes, current mastery on that topic, and the **why** line from the AI. Tap opens Study Session: a timer, the topic, a note field, and a Done button. Completing writes `study_logs`, increments `daily_plans.completed_count`, and nudges `mastery`.

A **Regenerate plan** button with a caption: *"uses yesterday's completion."* It demonstrates the loop is adaptive rather than a static timetable.

### Screen 5 — Library (the differentiator)

Two taps from the dashboard.

**Upload flow:** drop zone → file to Storage → extract text → spinner with real stage labels ("reading document… mapping to syllabus… building quiz") → result card.

**Result card contents, in this order:**
1. Two-line summary
2. Topics detected, as chips
3. **The overlap line, highlighted:** *"This covers Quadratic Equations — one of your three weakest topics."*
4. Suggested tasks, each with an **Add to tomorrow's plan** button
5. **Generate 5-question quiz from this** button

That third item is the moment the demo lands. The system read the user's own coaching PDF and connected it to the user's own measured gaps. Nothing in the Indian prep market does this.

**Document grid below:** thumbnail, filename, topic tags, mastery indicator per document.

### Screen 6 — Quiz

One question per screen, no back navigation, progress dots at the top. On submit, show **concept-level feedback, not a score**:

> **3 of 5.** The pattern is relative motion in time–speed–distance, not percentages.

Two buttons follow: *Add remedial task to tomorrow* and *Retry in 3 days* (spaced repetition — you already cite SM-2 in the deck's references, so this closes that loop).

Results write to `mastery`, which changes tomorrow's plan.

### Screen 7 — Proof of Work

Three tabs: **Photo · Voice · Text**. Matches the mobile mock already in the deck.

Upload → AI plausibility line (*"appears to be handwritten maths work, consistent with today's topic"*) → streak increments → squad feed updates. Recent submissions list below with timestamps and a "Counted" badge.

### Screen 8 — Squad

Six pseudonymous members (Aspirant A–F). Each row: today's check-in status, streak, hours logged. **Red flag on anyone who missed today, including the user.** Squad activity feed beneath.

Label the card with the mechanism: *"Loss aversion — your squad sees the gap."*

### Screen 9 — Progress

- **Topic mastery bars**, sorted weakest-first, red/amber/green bands. This answers the exact question your interviews showed aspirants cannot answer: *name your three weakest topics.* Put that framing on the screen.
- **30-day streak heatmap**, GitHub-style.
- **Weekly AI reflection card** — the four lines from Task 4.

### Screen 10 — WhatsApp mock (static, for the pitch)

A single screen rendering the same daily loop as a chat thread: morning goal voice note, AI plan reply, midday quiz link, evening proof photo, streak confirmation. Static, no backend. Its entire job is to make the deck's positioning credible from the stage.

---

## 7. End-to-end data flow

The daily loop, traced through every layer:

```
08:00  User opens app
       → frontend checks daily_plans for today
       → miss: invoke('ai', {task:'daily_plan', payload:{mastery, logs, target}})
       → edge function → provider → JSON → cached in daily_plans
       → dashboard renders 3 tasks

08:20  User taps Start on task 1
       → Study Session timer runs
       → Done → insert/update study_logs (planned_hrs, actual_hrs)
       → daily_plans.completed_count++
       → Execution Gap chart updates live

10:00  User taps "Take quiz"
       → 5 questions from topics table (or from a document)
       → submit → invoke('ai', {task:'quiz_feedback'})
       → returns concept_gap + mastery_delta
       → mastery.score updated → trigger recomputes status
       → remedial task queued for tomorrow

14:00  User uploads a coaching PDF
       → pdf.js extracts text client-side
       → file to Storage, text to documents.extracted_text
       → invoke('ai', {task:'doc_suggest'})
       → returns topics, overlap, tasks, 5 quiz questions
       → "Add to tomorrow's plan" writes into tomorrow's daily_plans.tasks

21:00  User submits proof photo
       → Storage upload → proofs row
       → trigger bumps streak_count and total_points
       → squad feed shows "Aspirant D completed today"

Sunday → invoke('ai', {task:'weekly_summary'})
       → reflection card on Progress screen

Next morning → plan generation reads yesterday's completion
            → if below 60%, total minutes drop 25%
            → THE LOOP IS CLOSED
```

That last arrow is the whole pitch. Every other edtech product's loop ends at "content delivered." Yours ends at "tomorrow changed because of what you did today."

---

## 8. Dashboard and graphs

Recharts throughout. Four charts.

### Chart 1 — Execution Gap (the hero)

**This replaces the current "Daily Improvement" chart.** Accuracy and consistency is a generic edtech chart that every competitor has. Planned-vs-executed hours is the one chart no competitor can show, because no competitor collects it.

| Property | Value |
|---|---|
| Type | Dual-line with shaded area between |
| Series A | Planned hours — grey `#94A3B8`, dashed |
| Series B | Executed hours — blue `#2563EB`, solid, 3px |
| Fill between | Light red, 15% opacity, labelled **"Execution Gap"** |
| X-axis | Last 7 days (toggle to 30) |
| Y-axis | Hours, 0 to max+2 |
| Below chart | Three stats: `Planned 38h · Executed 22h · Gap 42%` |

Data query:

```sql
select log_date, planned_hrs, actual_hrs
from study_logs
where user_id = auth.uid()
  and log_date > current_date - 30
order by log_date;
```

### Chart 2 — Topic mastery

Horizontal bars, sorted ascending by score. Red `<40`, amber `40–70`, green `>70`. Topic name on the left, score on the right. Twelve rows.

### Chart 3 — Streak heatmap

30 cells in a 5×6 grid. Opacity scales with hours logged. Empty cells are visibly grey, which makes gaps obvious in a way a streak number never does.

### Chart 4 — Squad comparison

Grouped bars, pseudonymous labels, check-ins this week. The user's own bar highlighted in orange. Being fourth of five is the product working.

### Optional fifth — cohort retention

Your users against a baseline decay curve. With a dozen demo users this is theatre, so **label it "projected."** Do not let a judge catch seeded data presented as measured.

---

## 9. Seed data

**Do this before building the dashboard.** An empty dashboard is the most common way a prototype dies on stage: everything is built and nothing shows.

For the demo account, seed:

| Table | Volume | Shape |
|---|---|---|
| `study_logs` | 30 rows | Planned 5–7h. Executed starts at ~2.2h, rises to ~4.8h over the last 10 days. **The narrowing gap is the story.** |
| `mastery` | 12 topics | 3 red (<40), 5 amber, 4 green |
| `profiles` | 1 | streak_count 12, total_points 2450 |
| `squads` + members | 6 | Aspirant A–F, streaks 4–18 days, 4 of 6 checked in today |
| `documents` | 2 | Pre-processed, with topics and overlap populated |
| `quizzes` | 4 | Scores 40%, 60%, 60%, 80% — visible improvement |
| `daily_plans` | 7 | Varied completion counts |
| `proofs` | 12 | Matching the streak |

The narrowing gap matters because it lets you say, pointing at a real line: *"this user's execution gap went from 55% to 25% over three weeks."*

Write this as a single SQL seed script so you can re-run it if the demo database gets dirty.

---

## 10. Build order

Paste these as sequential Lovable prompts. Lovable degrades badly if you ask for everything at once.

| Day | Prompt / task |
|---|---|
| 1 | **Scaffold.** "Study-execution app for Indian government exam aspirants. Navy `#0B1F3A` and blue `#2563EB`, Inter font, mobile-first, sidebar on desktop. Supabase email auth. Create these tables with RLS: [paste §3]. Nav: Dashboard, Plan, Library, Quiz, Proof, Squad, Progress." |
| 1 | Run the topics seed (60 rows) and the demo-account seed script. **Before building any UI.** |
| 2 | **Onboarding**, 3 steps, writes to profiles and seeds mastery. |
| 3 | **Dashboard** with the four charts from §8. Hero chart first. |
| 4 | Deploy the **edge function**. Give Lovable the code from §5 directly rather than describing it. Test each of the four tasks with curl before wiring the UI. |
| 5 | **Daily plan generation** wired to the dashboard, cached in `daily_plans`. |
| 6–7 | **Library:** upload, pdf.js extraction, doc_suggest, result card, quiz generation. The biggest single piece. |
| 8 | **Quiz** flow with concept feedback and mastery writeback. |
| 9 | **Proof** upload + streak trigger. **Squad** screen. |
| 10 | **Progress** screen, weekly reflection, WhatsApp mock screen. |
| 11 | **Polish:** loading states, error fallbacks, empty states, Hindi strings for dashboard and plan. |
| 12 | Rehearse the demo. Record the backup video. |

---

## 11. Demo script and Q&A

### The 90-second run — rehearse until automatic

1. **Dashboard.** Streak, three tasks, Execution Gap chart. *"This is the only screen in Indian edtech that shows an aspirant the gap between what they planned and what they actually did."* — **10s**
2. **Point at mastery bars.** *"Her weak topic is time and distance. The system decided that from her last quiz, not from a timetable she wrote in January."* — **10s**
3. **Upload a real SSC PDF.** Wait for the result card. *"This is her own coaching material. The system just mapped it to her syllabus, found that it covers one of her three weakest topics, and built a quiz from it."* — **25s**
4. **Take the quiz, miss two deliberately.** Show concept-level feedback. *"Not 'you got three right.' It names the concept."* — **20s**
5. **Submit proof.** Streak increments, squad screen updates. — **15s**
6. **Back to the Execution Gap chart.** *"Our survey of N aspirants found they plan X hours and execute Y. This chart is that finding, running as a product."* — **10s**

**Record a backup screen capture of this exact run on your phone.** Venue wifi fails, free-tier APIs rate-limit, and preview URLs sleep. A 90-second video has saved more pitches than any amount of preparation.

### Questions you will be asked

| Question | Answer |
|---|---|
| "Isn't this just a to-do app with streaks?" | "A to-do app takes a plan from you. This one generates the plan from measured mastery and changes it based on yesterday's completion. Also, nobody else collects planned-vs-executed hours." |
| "How do you stop users gaming the proof?" | "We don't fully. It's a friction and honesty nudge, not verification. The real enforcement is the squad — pseudonymous peers see your check-in." |
| "Who lacks self-discipline but keeps opening a discipline app?" | **Name this before they do.** "That's the hardest objection to our model. Three design answers: WhatsApp-native so there's no app to open, squad-side loss aversion rather than self-motivation, and 20-second proof-of-work instead of two-minute logging." |
| "Why would they pay ₹999 when YouTube is free?" | "They don't pay for content. ₹999 is 4% of what a coaching centre charges, and the survey shows the binding constraint is execution, not content access." |
| "Is this production-ready?" | "No. It's a working proof of the execution loop. Production needs the WhatsApp Business API, a real content pipeline, and proper model evaluation." |

---

## 12. Cut list and honest limitations

**Cut in this order if time runs out:**

1. Doubt-solving chatbot (every competitor has one; it proves nothing)
2. Voice logging
3. AI proof verification (keep upload, drop the verdict line)
4. Squad real-time updates (seeded data is indistinguishable in a demo)
5. Weekly reflection
6. Hindi toggle beyond the dashboard

**Never cut:**

- The Execution Gap chart
- AI daily plan generation
- Document upload → suggestions → quiz

Those three are the entire argument. Everything else is surface.

**Limitations to state before a judge finds them:**

- Not WhatsApp yet — Business API needs verification and a 2–4 week approval cycle.
- Proof verification is gameable and is framed as a nudge, not a check.
- Built on no-code tooling; this is a loop proof, not production architecture.
- Seeded demo data where labelled; real usage data is Round 1's survey, not the app's.
- Mastery scoring is a simple delta model, not an IRT or knowledge-tracing implementation.

A named gap reads as planning. An unnamed one, found by a judge in Q&A, reads as not having thought it through.
