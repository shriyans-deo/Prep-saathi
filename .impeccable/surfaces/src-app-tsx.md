---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

Scope: the whole authenticated PrepSaathi app plus its auth screen. Visitor mode: Operate.
Audience and job: Indian government exam aspirants on mid-range Android phones run the daily loop (plan, study, quiz, prove) and read how far their execution is from their plan. Judges see it on a laptop at the pitch.
Constraints: every number measured or labelled sample; English and Hindi first-class; Lite mode must drop charts and images; no dark mode in this version (the sheet is white).
Unresolved: dark or night theme is deferred.

## Direction contract

THESIS: On an OMR sheet the scanner ignores the coloured print and reads only black marks. PrepSaathi works the same way: the plan is printed in rose, and only what you actually did is black. It refuses the category's stat-card dashboard with soft shadows and an indigo accent.

OWN-WORLD: White sheet ground. Rose drop-out ink #C4264A (dark step #A81D3D for small text) carries the rail, rules, labels, outlines and planned values. Ballpoint black #14141A carries only the user's own marks and data: filled bubbles, executed line, their numbers, primary actions. Pale rose #FBE9EE is the panel tint. Hairline rose rules, 4px corners, no shadows. Hind for Latin and Devanagari at one family.

STORY: A visitor reads one plain sentence stating planned hours, done hours and the gap, sees where the gap opened, and does the next unfilled task. Filling bubbles builds a visible record. The next day's plan changes because of the marks.

FIRST VIEWPORT: Rose rail left with filled-bubble active item. Date and one large sentence with the gap in rose. Below, two columns: left the planned-versus-executed chart with 7/30 toggle and legend; right today's tasks as bubble rows with the next task's Start button in black, then 30-day bubble grid. On phones the sentence, then tasks, then the chart, with bottom tabs.

FORM: OMR answer sheet, position 1 on my ordered list, IMPECCABLE'S PICK. seed:68d90124dee7e928. Signature move: the bubble. Marking a task done fills its bubble with black ink in one quick stroke; quiz options, nav state and the 30-day record use the same mark.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
