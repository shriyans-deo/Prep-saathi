---
name: PrepSaathi
description: An execution engine for Indian government exam aspirants, drawn as an OMR answer sheet where only black marks count.
colors:
  ground: "#cfe3f7"
  rail: "#1e4b73"
  rail-dark: "#163a5a"
  gap: "#a8520c"
  gap-fill: "#de9242"
  print: "#1d63b0"
  print-dark: "#174f8f"
  tint: "#eaf2fb"
  line: "#b9d0e8"
  ink: "#14141a"
  ink-hover: "#2c2c36"
  ink-disabled: "#8d8a92"
  ink-soft: "#4f5a66"
  sheet: "#ffffff"
  field-border: "#7c8fa3"
  placeholder: "#5f6b78"
  chart-grid: "#e3edf7"
  warn-bg: "#fdf3dc"
  good-bg: "#e6f4ec"
  error-bg: "#fbe4e4"
  error-text: "#7a1212"
  error-strong: "#8e1414"
typography:
  display:
    fontFamily: "Hind, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: "Hind, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Hind, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
  question:
    fontFamily: "Hind, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.375
  section:
    fontFamily: "Hind, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Hind, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  action:
    fontFamily: "Hind, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "Hind, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  tab:
    fontFamily: "Hind, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  mark: "2px"
  sheet: "4px"
  bubble: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section: "32px"
components:
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    typography: "{typography.action}"
    rounded: "{rounded.sheet}"
    padding: "0 16px"
    height: "44px"
  button-ink-hover:
    backgroundColor: "{colors.ink-hover}"
  button-ink-disabled:
    backgroundColor: "{colors.ink-disabled}"
  button-print:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.print-dark}"
    typography: "{typography.action}"
    rounded: "{rounded.sheet}"
    padding: "0 16px"
    height: "44px"
  button-print-hover:
    backgroundColor: "{colors.tint}"
  button-ghost:
    textColor: "{colors.print-dark}"
    typography: "{typography.action}"
    rounded: "{rounded.sheet}"
    padding: "0 16px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.tint}"
  button-danger:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.sheet}"
    padding: "0 16px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error-strong}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "8px 12px"
    height: "44px"
  segmented-item:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.print-dark}"
    padding: "0 12px"
    height: "36px"
  segmented-item-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  panel-tint:
    backgroundColor: "{colors.tint}"
    rounded: "{rounded.sheet}"
    padding: "16px"
  rail:
    backgroundColor: "{colors.print}"
    textColor: "{colors.sheet}"
    padding: "16px"
    width: "240px"
  rail-item-active:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.print-dark}"
    rounded: "{rounded.sheet}"
    padding: "0 10px"
    height: "40px"
  bubble:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.print}"
    rounded: "{rounded.bubble}"
    size: "26px"
  bubble-filled:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  notice-info:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "12px 14px"
  notice-warn:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "12px 14px"
  notice-good:
    backgroundColor: "{colors.good-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "12px 14px"
  notice-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error-text}"
    rounded: "{rounded.sheet}"
    padding: "12px 14px"
  chart-tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    typography: "{typography.label}"
    rounded: "{rounded.sheet}"
    padding: "8px 12px"
---

# Design System: PrepSaathi

## Overview

**Creative North Star: "The OMR Answer Sheet"**

An OMR scanner ignores the coloured print and reads only black marks. PrepSaathi works the same way: the plan is printed in blue, and only what the aspirant actually did is black. Every screen is a white sheet with a question printed on it and a record being filled in, so the uncomfortable number (hours planned against hours done) is visible before anything else.

Density is that of a working form: white sheets on a blue desk, rows divided by hairlines, one family of type, one mark. Nothing floats and nothing glows. The logo sets the palette: navy for the rail, a clear blue for print, orange for the gap.

The system refuses gradients, glows and soft shadows. There is no dark mode in this version; a night theme is deferred.

**Key Characteristics:**
- Blue print is the plan and the structure; black ink is what the user did.
- One signature mark, the bubble, carries task state, quiz answers, navigation state and the 30-day record.
- One family, Hind, self-hosted, for Latin and Devanagari alike.
- Blue ground (#cfe3f7) and navy rail (#1e4b73) from the logo. Content sits on white sheets with a 1px border and 4px corners. No shadows.
- Lite mode removes charts, proof images and animation, and the screens still work.

## Colors

Two inks on white paper: a saturated drop-out blue that structures the page and a ballpoint black that records the user, with a small set of state colours used only for meaning.

### Primary
- **Drop-out Blue** (#1d63b0): The desktop rail, the auth and onboarding bands, section rules, bubble outlines, planned chart lines, the gap figure in the opening sentence, and icons that sit beside printed labels. White text on it passes AA at 5.6:1.
- **Deep Blue** (#174f8f): The dark step for small printed text: section titles, table headers, stat labels, secondary button text, unfinished task rows, and the rail's hover state.
- **Pale Blue** (#eaf2fb): The panel tint, info notices, button hover, skeletons and the unfilled track of progress bars.
- **Hairline Blue** (#b9d0e8): Row dividers, table rules, chart axis lines, unselected quiz option outlines, and bubbles for days before the user joined.

### Secondary
- **Ballpoint Black** (#14141a): Filled bubbles, the executed chart line, the user's own numbers, primary actions, and selected states. It is also the default colour of reading text, because copy has to be legible, but no plan or printed structure is ever drawn in it.
- **Black Hover** (#2c2c36) and **Black Disabled** (#8d8a92): The hover and disabled steps of the primary action, and nothing else.

### Neutral
- **Sheet White** (#ffffff): The surface of every section, and text on blue or black. The logo always sits on white, because its navy lettering disappears on the rail.
- **Desk Blue** (#cfe3f7): The system background behind every screen.
- **Logo Navy** (#1e4b73): The rail and the auth panel. Hover step #163a5a.
- **Gap Orange** (#a8520c for text, #de9242 at 25% for chart fill): Only for what needs attention: the gap figure, weak topics, missed check-ins and the streak flame.
- **Soft Ink** (#4f5a66): Supporting copy, hints, dates, source labels and chart axis labels.
- **Field Border** (#7c8fa3): The resting outline of inputs, a warm grey.
- **Placeholder** (#5f6b78): Placeholder text in inputs.
- **Chart Grid** (#e3edf7): Horizontal chart gridlines only.

### Semantic
State colours sit on top of the palette and appear only when they mean something.
- **Warn Wash** (#fdf3dc): Warning notices, with black text.
- **Good Wash** (#e6f4ec): Success notices, with black text.
- **Error Wash** (#fbe4e4): Error notices and the hover of destructive controls.
- **Error Text** (#7a1212): Text on the error wash.
- **Error Strong** (#8e1414): Field error text, the error toast, and destructive hover text.

### Named Rules
**The Drop-Out Rule.** Print is the plan and the structure; ink is what the user actually did. If a mark or a figure records something the user did, it is black. If it states what the sheet asks for, it is blue. Reading text and primary actions are the only other uses of black.

**The Meaning Only Rule.** Warn, good and error colours appear only on a state that is true right now. They are never decoration, section colour or category colour, and every notice also carries an icon so status never rests on colour alone.

## Typography

**Display Font:** Hind (with system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Hind (same stack)

**Character:** A sturdy, slightly bookish humanist face drawn for both Latin and Devanagari, so Hindi never looks like a fallback. It reads like a printed form, not a product brand. Weights 400, 500, 600 and 700 are self-hosted through Fontsource for both subsets, with no request to a font service.

### Hierarchy
- **Display** (700, 2.5rem on phones and 3.5rem from 640px, line-height 1.15, measure 14ch): The auth screen's single statement. The study timer uses the same size at line-height 1 with tabular figures.
- **Headline** (700, 1.75rem on phones and 2.25rem from 640px, line-height 1.25, measure 34ch, balanced wrap): The one sentence that names the gap on the dashboard, and the quiz result sentence. Printed figures in blue, the user's in black.
- **Title** (700, 1.75rem, line-height 1.25): Page titles and the large figures in stat blocks.
- **Question** (600, 1.25rem on phones and 1.375rem from 640px, line-height 1.375): The quiz question. Dialog titles use 1.25rem at 700.
- **Section** (600, 1.125rem, line-height 1.375, Deep Blue): Panel titles.
- **Body** (400, 1rem, line-height 1.5): Everything else. Long copy is capped at 65ch, and page subtitles at 42rem.
- **Action** (600, 1rem): Button text, or 0.875rem on small buttons and segmented controls.
- **Label** (500, 0.875rem, line-height 1.43): Stat labels, table headers, hints and metadata.
- **Tab** (500, 0.75rem, 600 when active): Bottom tab labels only.

### Named Rules
**The One Family Rule.** Hind is the only family, for both scripts. Hierarchy comes from size and weight, never from a second face. Numerals in tables are tabular.

**The Plain Label Rule.** A heading stands on its own. No eyebrow or small label is stacked above it, no text is set in tracked capitals, and no text is filled with a gradient.

## Layout

Mobile first. On phones the screen is a top bar, a single column and fixed bottom tabs; from 768px a sticky 240px blue rail replaces the tabs and top bar. Content sits in a column capped at 76rem, with a 16px gutter on phones and 24px from 640px, and 96px of bottom padding on phones so the tabs never cover the last row.

Sections stack on a 32px rhythm. Rows inside a section use 12px of padding with hairline dividers. Two-column layouts begin at 1024px (1280px on the squad screen) with the wider column first, usually at ratios between 1.4:1 and 1.7:1. Focused single-task views narrow to one measure: 42rem for the quiz and 36rem for onboarding. The auth screen splits into a blue band and a white form column from 1024px.

Touch targets: 44px for buttons and fields, 36px for small buttons and segmented items, 56px for bottom tabs, 52px for quiz options.

**The Next Action First Rule.** On phones the sentence comes first, then today's tasks, then the chart. Reorder the columns rather than shrinking them so the next thing to do is thumb-reachable.

## Elevation & Depth

The sheet is flat. There is no shadow vocabulary. Separation comes from white sheets on the blue ground, 1px borders, hairlines and solid fills. A dialog is set apart by a 1px blue border and a dimmed backdrop.

**The Flat Sheet Rule.** Nothing casts a shadow, at rest or on hover. Paper does not lift. State changes are colour changes.

## Shapes

Two geometries only. Rectangles have small, plain 4px corners: buttons, fields, dialogs, notices, tinted panels, tooltips and images. Marks are true circles: bubbles, and the small 8px-tall progress tracks that read as a line of ink. A 2px radius is used only for skeletons, focus outlines and legend swatches. Rules and outlines are 1.5px on marks and section tops, 1px elsewhere. A dashed 1.5px blue outline marks a drop zone, the same dash that means "planned" in a chart.

**The Sheet Rule.** Every section is a white sheet with a 1px border on the blue ground. Page headings sit directly on the ground. Nothing sits inside a second box.

## Components

### Buttons
Plain and heavy, like a stamp on a form.
- **Shape:** Gently squared (4px), 44px tall with 16px side padding, or 36px and 12px when small. Semibold, with an optional 16px icon and an 8px gap.
- **Primary (Ink):** Black with white text. At most one in a view of tasks: the next task's Start button is the only black button in the list.
- **Print (Secondary):** White with a 1px blue outline and Deep Blue text; hover fills with Pale Blue.
- **Ghost:** Deep Blue text with no outline; hover fills with Pale Blue. For Cancel, Back, and show-more toggles.
- **Danger:** White with a Soft Ink outline and black text, turning to the error wash and error text on hover. It is not red at rest, so that red only ever reports a consequence.
- **Hover / Focus:** Colour transitions over 150ms. Focus is a 2px black outline offset by 2px, on every control.
- **Loading / Disabled:** A 16px spinner appears and the button is disabled; disabled Ink goes to Black Disabled, and the others drop to 50% opacity.

### Panels
- **Sheet (default):** White, 1px line border, 4px corners, 16 to 20px padding, section title in Deep Blue with an optional aside on the right.
- **Tinted:** Pale Blue fill, 4px corners, 16px padding, used sparingly for a closing prompt.

### Inputs / Fields
- **Style:** White, 1px Field Border, 4px corners, 44px tall. The label sits above in medium weight, and the hint below in Soft Ink.
- **Focus:** Hover shifts the border to blue. Focus shifts it to black with the standard outline. The caret is blue.
- **Error:** Error Strong text below the field, replacing the hint.
- **Range:** The accent colour is black, since the value is the user's own.

### Segmented Control
A 1px blue outline around 36px semibold items. The selected item is black with white text, because it is the user's mark; the others are white with Deep Blue text and a Pale Blue hover. Used for the 7/30 day range, language, and proof type.

### Navigation
- **Rail (from 768px):** Drop-out Blue, sticky and full height, with white text and medium weight at 40px. Each primary item has a 16px hollow white circle. The active item is a white 4px block with Deep Blue semibold text and a filled black circle. Hover is Deep Blue. Secondary items and sign-out use 16px icons at the foot, under the streak and points.
- **Bottom tabs (phones):** White with a 1px blue top rule, five columns at 56px, respecting the safe area. Inactive tabs show a 20px icon in Deep Blue. The active tab swaps its icon for a filled 20px bubble and turns its label black and semibold.
- **More:** A dialog listing the remaining destinations as 48px rows with hairlines.

### Bubble (signature)
The product's one mark. It comes straight from the answer sheet the user already knows.
- **Empty:** A true circle with a 1.5px blue outline on white. It can hold a letter in blue at half its diameter.
- **Filled:** Solid black, with a black outline and white letter. The ink arrives through a 200ms clip-path wipe (cubic-bezier(0.16, 1, 0.3, 1)) that opens from off-centre, like one quick stroke of a pen. In forced-colours mode the fill uses CanvasText.
- **Sizes:** 16px for quiz progress, 20px for tabs and onboarding options, 24px to 28px for tasks, quiz options and the record.
- **Task row:** A 26px bubble beside a semibold topic. Unfinished rows are printed in Deep Blue; finished rows turn black and show minutes done. Screen readers get "Done" or "Not done" in text.
- **Quiz option:** A row at least 52px tall with a 28px lettered bubble. It has a hairline outline at rest, blue on hover and black when selected, and sits on a real radio input. Options are shown one question at a time with no going back, like an exam hall.
- **30-day record:** Ten columns of 28px outlined circles. A solid black dot grows inside each one in proportion to hours done against the daily target, with an 8px minimum if any time was logged, and a full bubble gets a black outline. Days before the user joined have a Hairline Blue outline. Each bubble has a text label, and a printed sentence explains the scale.
- **Empty state:** A 28px empty bubble above a heading and a line that teaches the next action. Never placeholder figures.

**The One Mark Rule.** If something can be marked, it is marked with a bubble. Checkboxes, toggles and radio buttons take this form over a visually hidden native input. Do not introduce a second completion mark.

### Charts
Built on Recharts, loaded only when a screen draws one, without entry animation, and always paired with the same numbers as a table.
- **Planned:** A dashed blue line, 2px, dash 6 5, with no dots.
- **Done:** A solid black line, 3px, with dots only at 10 points or fewer.
- **Gap:** The area between planned and done, filled with blue at 15%.
- **Today:** A thin 1px black line from yesterday to a hollow dot (white fill, 2px black outline, radius 5). Today is in progress, so it is excluded from the gap shading and gap totals. The one exception is a brand new account whose only data point is today, which is counted so the sentence has something honest to say.
- **Axes and grid:** Horizontal gridlines in Chart Grid. Labels at 12px in Soft Ink. No vertical grid.
- **Tooltip:** Solid black, 4px corners, white 0.875rem text, the user's figure in semibold.
- **Trend chart:** Both series are the user's, so both are black. Accuracy is 3px with filled dots, and consistency is 1.5px with hollow dots.

**The Dashed Plan Rule.** Planned is dashed blue and done is solid black, in every chart and every legend. The dataviz validator flags black as too low in lightness and chroma for a categorical slot. This is accepted on purpose, because it is the brand rule. Colour-vision and contrast checks pass, and dashed against solid is the secondary encoding.

### Notices and Toasts
- **Notice:** 4px corners, 12px by 14px padding, an 18px icon, and an optional action on the right. Info is Pale Blue, warn is Warn Wash, good is Good Wash, all with black text. Error is Error Wash with Error Text, announced as an alert.
- **Toast:** Fixed at the bottom, above the tabs on phones. Black for success and Error Strong for failure, with white text and an icon, for 4.5 seconds.

### Lite Mode
A persisted setting that adds a class at the document root. Charts become their tables and the chart code is never fetched, stored proof photos and voice notes stop loading, and all animation and transition is off. The bubble grid and tables stay, because they are text and CSS. Reduced motion is honoured separately at all times.

**The Lite Truth Rule.** Lite mode must keep the low-bandwidth claim true. Any new heavy surface needs a Lite version that shows the same numbers as text.

## Do's and Don'ts

### Do:
- **Do** draw every plan, label and structural rule in blue, and every user mark and user figure in black, per the Drop-Out Rule.
- **Do** use #174f8f, not #1d63b0, for small printed text.
- **Do** start a section with a 1.5px blue rule and a blue title, with no box around it.
- **Do** use the bubble for anything the user marks, over a real, visually hidden input.
- **Do** keep one black primary action per task list: the next task's Start button.
- **Do** pair every chart with its table and every coloured status with an icon or text.
- **Do** teach the next action in empty states, and show only measured or clearly labelled sample numbers.
- **Do** check every new screen in Hindi and in Lite mode.

### Don't:
- **Don't** use the word "verification" for proofs. A proof is an honesty nudge, and the copy says "proof", "counted" or "check-in".
- **Don't** place an eyebrow or small label above a heading.
- **Don't** use gradient text.
- **Don't** add shadows, at rest or on hover.
- **Don't** use a row of big-number stat cards above the content. The headline sentence already states the numbers.
- **Don't** draw a planned or printed value in black, or a completed mark in blue.
- **Don't** use warn, good or error colours for anything other than their state.
- **Don't** add a second typeface, or load Hind from a font service.
- **Don't** add dark mode styling yet. A night theme is deferred.
