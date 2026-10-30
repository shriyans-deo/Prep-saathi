# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Indian government exam aspirants (SSC CGL, SSC CHSL, IBPS PO, IBPS Clerk, UPSC CSE, UPSC CAPF, RRB NTPC), weighted toward Tier 2-3 cities and small towns. They self-study or attend coaching, often on repeat attempts, usually on a mid-range Android phone with patchy bandwidth, and they use the product at the start of the study day, between sessions, and at night when they log what actually happened. Hackathon judges at Innov-a-thon 2.0 (NIT Rourkela, 13-15 Nov 2026) are a second audience for the pitch.

## Product Purpose

PrepSaathi is an execution engine, not a content product. It closes the daily loop: plan, study, prove, get feedback, and tomorrow's plan changes because of what the aspirant actually did today. Success means an aspirant can see the gap between hours planned and hours executed, can name their three weakest topics, and sees that gap narrow.

## Positioning

Content is solved; the binding constraint is execution. PrepSaathi measures planned-versus-executed hours daily, generates the plan from measured topic mastery, and reads the aspirant's own coaching PDFs and connects them to those measured gaps. Competitors end their loop at "content delivered"; this one ends at "tomorrow changed".

## Operating Context

The daily loop: morning plan generated from mastery and yesterday's completion, timed study sessions, 5-question concept quizzes, uploading coaching PDFs, 20-second proof of work (photo, voice or text), and a six-person pseudonymous squad that sees check-ins. Sessions are short and frequent. Exam-hall habits (one question at a time, no going back) are familiar and deliberately reused in the quiz.

## Capabilities and Constraints

- Screens: Auth, Onboarding, Dashboard, Today's Plan with Study Session, Library, Quiz, Proof, Squad, Progress, WhatsApp preview.
- Stack: React 19, Vite, Tailwind 4, Recharts, Supabase (Postgres with RLS, Auth, Storage, Edge Functions), Groq via an edge function only; deployed on Vercel.
- WhatsApp is not integrated (Business API needs verification). The WhatsApp screen must be an honest preview, not a claim of live delivery.
- Proof is a friction and honesty nudge, never "verification". That word is banned for proofs.
- Lite mode must make the low-bandwidth claim true (no charts, no images, no heavy animation).
- English and Hindi are both first-class; Devanagari must render as well as Latin.
- Mastery scoring is a simple delta model, not knowledge tracing.

## Brand Commitments

Name: PrepSaathi ("saathi" means companion). Voice: direct, honest, specific to the user's data, no filler encouragement. The user chose a new visual identity on 2026-10-31, replacing the deck's navy/blue/orange; the pitch deck will be updated to match the app.

## Evidence on Hand

Real syllabus topics per exam in the database. No testimonials, user counts, survey figures or outcomes are available; none may be invented. Sample data exists only inside clearly labelled demo accounts.

## Product Principles

- Every number on screen is measured from this user's activity, or it is not shown. Empty states teach the next action instead of showing placeholder figures.
- Name the gap plainly. The product's job is to make an uncomfortable number visible and then make it actionable.
- If AI is unavailable, say so and fall back to honest rule-based output. Never pass canned text off as AI.
- Sample data is always labelled and never mixes with real users' data.
- Fast and legible on a cheap phone on 3G beats impressive on a laptop.

## Accessibility & Inclusion

WCAG 2.2 AA. Mobile-first with thumb-reachable navigation. Bilingual English and Hindi. Must not rely on colour alone for status. Respects reduced motion.
