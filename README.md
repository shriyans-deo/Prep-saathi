# PrepSaathi

An execution engine for Indian government exam aspirants. It measures the gap between the hours you plan and the hours you actually study, and rewrites tomorrow's plan from it.

The daily loop: **plan → study → quiz → prove → tomorrow changes**.

## Stack

- React 19, Vite, Tailwind 4, Recharts (charts and pdf.js load only when needed)
- Supabase: Postgres with row level security, Auth, Storage, one Edge Function
- Groq (OpenAI-compatible), called only from the Edge Function so the key never reaches the browser

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and anon key
npm run dev
```

## Set up a backend from scratch

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase functions deploy ai --use-api
supabase config push
supabase secrets set AI_API_KEY=<your-groq-key>
```

If your network blocks Postgres ports (`db push` fails to connect), apply each file in `supabase/migrations` in order with `supabase db query --linked -f <file>`.

Optional function secrets: `AI_MODEL`, `AI_FALLBACK_MODEL`, `AI_VISION_MODEL`, `AI_TRANSCRIBE_MODEL`, `AI_BASE_URL`, `ALLOWED_ORIGINS`. Groq model IDs change, so check the [model list](https://console.groq.com/docs/models) if AI calls start failing.

## Checks

```bash
npm run build          # type-check and production build
npm run lint
npm run i18n:check     # every interface string has Hindi
npm run test:backend   # RLS, tampering, streaks and the daily loop, against the linked project
```

## How honesty is enforced

- Every number comes from the user's own activity. There is no fallback content in the UI.
- If AI is down, plans and reflections are calculated from real data by rules and say so on screen. Quizzes and document analysis show an error and offer a retry, because they cannot be done honestly without AI.
- Proof is an honesty nudge, not verification, and is described that way.
- "Explore with sample data" signs in anonymously and seeds a private account. Sample data is labelled on every screen, never mixes with real squads, and is deleted after 2 days.

## Known limitations

- WhatsApp delivery is not live (the Business API needs approval). The WhatsApp screen is a labelled preview, and users can send their real plan through a WhatsApp share link.
- Scanned PDFs are not supported, only PDFs with selectable text.
- Mastery is a simple delta model, not knowledge tracing.
- Rule-based fallback text is in English even when the interface is in Hindi.
