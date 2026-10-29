// PrepSaathi AI Edge Function
// Spec reference: §5
// Supported provider: Groq (OpenAI-compatible)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BASE = "https://api.groq.com/openai/v1/chat/completions";
const KEY = Deno.env.get("AI_API_KEY");
const MODEL = Deno.env.get("AI_MODEL") || "llama-3.3-70b-versatile";

const SYSTEM =
  "You are a study-planning engine for Indian government exam aspirants. Return ONLY valid JSON matching the requested schema. No markdown, no backticks, no preamble, no explanation.";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallbacks (§5)
const FALLBACKS: Record<string, unknown> = {
  daily_plan: {
    tasks: [
      {
        subject: "Quantitative Aptitude",
        topic: "Time, Speed and Distance",
        task: "Practice 15 problems",
        minutes: 45,
        type: "weak_topic",
        why: "Lowest mastery score in your profile",
      },
      {
        subject: "Reasoning",
        topic: "Syllogism",
        task: "Solve 20 questions",
        minutes: 30,
        type: "learning",
        why: "Due for reinforcement",
      },
      {
        subject: "English",
        topic: "Reading Comprehension",
        task: "2 passages, timed",
        minutes: 40,
        type: "revision",
        why: "Maintain your strongest area",
      },
    ],
    total_minutes: 115,
    focus_note: "Start with the weakest topic while focus is highest.",
  },
  quiz_feedback: {
    score: 3,
    concept_gap: "Application of core formulas under time pressure",
    feedback:
      "Review the fundamental formula relationships before calculating. Practice two-step simplification without shortcuts.",
    mastery_delta: -5,
    remedial_task: {
      task: "Review 5 standard solved examples on this concept",
      minutes: 20,
    },
    retest_in_days: 3,
  },
  doc_suggest: {
    summary:
      "Document covers foundational concepts and practice problems aligned with your exam syllabus.",
    detected_topics: ["Time, Speed and Distance", "Relative Velocity"],
    difficulty: "intermediate",
    overlaps_weak_topics: ["Time, Speed and Distance"],
    suggested_tasks: [
      {
        task: "Work through key formulas and first 10 examples in the document",
        minutes: 35,
        why: "Covers high frequency exam concept",
      },
    ],
    quiz: [
      {
        q: "What is the relative speed of two trains moving in the same direction with speeds v1 and v2 (v1 > v2)?",
        options: ["v1 + v2", "v1 - v2", "v1 * v2", "(v1 + v2)/2"],
        answer: "v1 - v2",
        concept: "Relative Speed in Same Direction",
      },
      {
        q: "If speed is doubled while distance remains constant, the time taken becomes:",
        options: ["Doubled", "Half", "Four times", "Unchanged"],
        answer: "Half",
        concept: "Inverse relation of speed and time",
      },
      {
        q: "To convert speed from km/h to m/s, multiply by:",
        options: ["5/18", "18/5", "3/8", "8/3"],
        answer: "5/18",
        concept: "Unit Conversion",
      },
      {
        q: "A train passes a pole in 10 seconds at 72 km/h. What is the length of the train?",
        options: ["150 m", "200 m", "250 m", "300 m"],
        answer: "200 m",
        concept: "Train Crossing Stationary Object",
      },
      {
        q: "Average speed for equal distances covered at speeds u and v is:",
        options: ["(u + v) / 2", "2uv / (u + v)", "uv / (u + v)", "sqrt(uv)"],
        answer: "2uv / (u + v)",
        concept: "Harmonic Mean for Average Speed",
      },
    ],
  },
  weekly_summary: {
    headline: "You executed 22 of 38 planned hours this week",
    pattern: "Your execution gap widened mid-week between Wednesday and Friday",
    win: "Quantitative Aptitude test score improved from 40% to 65%",
    next_week_focus: "Protect your evening study block to close the mid-week gap",
  },
};

function buildPrompt(task: string, payload: Record<string, unknown>): string {
  switch (task) {
    case "daily_plan": {
      const exam = payload.exam || "SSC CGL";
      const target = payload.daily_target_hrs || 6;
      const weak = Array.isArray(payload.weak_topics)
        ? payload.weak_topics.join(", ")
        : payload.weak_topics || "Time, Speed and Distance";
      const learning = Array.isArray(payload.learning_topics)
        ? payload.learning_topics.join(", ")
        : payload.learning_topics || "Syllogism, Number System";
      const yesterday = payload.yesterday || {
        planned: 6,
        actual: 4,
        completed_tasks: 2,
        total_tasks: 3,
      };
      const lastQuiz = payload.last_quiz || {
        topic: "Time, Speed and Distance",
        score: 38,
      };

      return `Generate today's study plan.

EXAM: ${exam}
DAILY TARGET: ${target} hours
WEAK TOPICS (score < 40): ${weak}
LEARNING TOPICS (40-70): ${learning}
YESTERDAY: planned ${yesterday.planned ?? 6} hrs, completed ${yesterday.actual ?? 4} hrs, finished ${yesterday.completed_tasks ?? 2} of ${yesterday.total_tasks ?? 3} tasks
LAST QUIZ: ${lastQuiz.topic ?? "Quantitative Aptitude"} scored ${lastQuiz.score ?? 40}%

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
}`;
    }

    case "quiz_feedback": {
      const topic = payload.topic || "Quantitative Aptitude";
      const qa = JSON.stringify(payload.questions_with_user_answers || []);
      const score = payload.score ?? 3;

      return `A user answered a 5-question quiz.

TOPIC: ${topic}
QUESTIONS AND ANSWERS: ${qa}
SCORE: ${score} of 5

Identify the single underlying concept gap behind the wrong answers.
Do not restate which questions were wrong. Name the concept.

Return ONLY:
{
  "score": ${score},
  "concept_gap": "Relative motion when two objects move in the same direction",
  "feedback": "Two sentences, plain language, no encouragement filler",
  "mastery_delta": -8,
  "remedial_task": {"task":"Practice 10 focused relative speed problems","minutes":25},
  "retest_in_days": 3
}`;
    }

    case "doc_suggest": {
      const exam = payload.exam || "SSC CGL";
      const weak = Array.isArray(payload.weak_topics)
        ? payload.weak_topics.join(", ")
        : payload.weak_topics || "Time, Speed and Distance";
      const text = String(payload.text || "").slice(0, 3000);

      return `Map this study material to the exam syllabus.

EXAM: ${exam}
USER'S WEAK TOPICS: ${weak}
DOCUMENT TEXT (first 3000 chars): ${text}

Return ONLY:
{
  "summary": "Two sentences, plain language",
  "detected_topics": ["Topic 1","Topic 2"],
  "difficulty": "intermediate",
  "overlaps_weak_topics": ["Topic 1"],
  "suggested_tasks": [
    {"task":"Work through examples and formulas","minutes":40,"why":"Covers your weakest topic"}
  ],
  "quiz": [
    {"q":"...","options":["a","b","c","d"],"answer":"a","concept":"..."}
  ]
}

Generate exactly 5 quiz questions, drawn only from the document's content.`;
    }

    case "weekly_summary": {
      const logs = JSON.stringify(payload.daily_logs || []);
      const completed = payload.tasks_completed || "16 of 24";
      const quizzes = JSON.stringify(payload.quizzes || [40, 60, 60, 80]);

      return `Summarise this user's week.

DAILY LOGS: ${logs}
TASKS COMPLETED: ${completed}
QUIZZES: ${quizzes}

Return ONLY:
{
  "headline": "You planned 38 hours and executed 22",
  "pattern": "Your gap concentrates on Thursday and Friday evenings",
  "win": "Syllogism accuracy went from 45% to 72%",
  "next_week_focus": "Protect your evening study hours"
}`;
    }

    default:
      throw new Error(`Unsupported task: ${task}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { task, payload } = await req.json();

    if (!task || !FALLBACKS[task]) {
      return new Response(
        JSON.stringify({ error: `Invalid task. Must be one of: ${Object.keys(FALLBACKS).join(", ")}` }),
        { status: 400, headers: cors }
      );
    }

    if (!KEY) {
      console.warn("AI_API_KEY secret is not set in Supabase. Returning fallback response.");
      return new Response(JSON.stringify(FALLBACKS[task]), { headers: cors });
    }

    const prompt = buildPrompt(task, payload || {});

    const r = await fetch(BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
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
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error(`AI provider call failed (${r.status}): ${errText}`);
      return new Response(JSON.stringify(FALLBACKS[task]), { headers: cors });
    }

    const data = await r.json();
    let text = data.choices?.[0]?.message?.content || "";
    text = text.replace(/```json|```/g, "").trim();

    // Validate before returning — never ship unparsed model output to the UI (§5)
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI JSON response:", e);
      parsed = FALLBACKS[task];
    }

    return new Response(JSON.stringify(parsed), { headers: cors });
  } catch (e) {
    console.error("AI edge function error:", e);
    return new Response(JSON.stringify({ error: true, message: String(e) }), {
      status: 500,
      headers: cors,
    });
  }
});
