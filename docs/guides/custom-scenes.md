# Custom browser scene API

Use this contract when no built-in visual or supplied recipe expresses the operation. Start with a job-local `scenes/example.mjs`; set a scene's visual to `{"type":"custom","module":"scenes/example.mjs"}`. The module must export a named synchronous `render` function. No install, network or alternate engine is needed.

```js
export function render({body, text, line, palette, time, cue}) {
  const {x, y, w, h} = body;
  const start = cue('Move'); // Must occur in this scene's actual narration.
  const p = Math.max(0, Math.min(1, (time - start) / 1));
  line(x, y + h / 2, x + w, y + h / 2, palette.line);
  text('Same object', x + p * w * .5, y + h / 2, 40,
    {maxWidth: w * .5, label: 'object'});
}
```

This is an API example, not evidence that sliding a label explains a mechanism. For production, name the object, operation, invariant and comparison in [scene direction](scene-direction.md).

## Arguments and units

| Argument | Contract |
| --- | --- |
| `ctx` | Canvas 2D context. Restore any changed global alpha, transform or clipping state. |
| `width`, `height` | Canvas dimensions in canvas pixels, not CSS pixels. |
| `body` | `{x,y,w,h}` content region, excluding heading and reserved caption area. Prefer relative positions and inspect all formats. |
| `time`, `duration`, `progress` | Scene-local seconds, scene duration including hold, and clamped time/duration. Never accumulate state across calls. |
| `scene` | Prepared scene including `id`, `visual`, actual `words`, timing and authored fields. |
| `portrait` | True when height/width exceeds 1.1; square is false. |
| `palette` | `bg`, `card`, `ink`, `muted`, `line`, `accent`, `primary`, `positive`. Use stable colors for stable meanings. |
| `text(value,x,y,size,options)` | Draws wrapped, top-aligned text and records audit boxes; returns drawn height. Options: `color`, `weight`, `align`, `family`, `maxWidth`, `lineHeight`, `label`. May shrink text to fit; check phone size afterward. |
| `line(x1,y1,x2,y2,color,width)` | Draws a rounded line; defaults are primary color and 5 pixels. |
| `card(x,y,w,h,{fill,border})` | Draws a rounded card; defaults use palette card/line. |
| `cue(wordOrId,{occurrence,edge})` | Returns scene-local seconds from real word timing. `edge` is `start` or `end`; occurrence is zero-based. Missing/ambiguous cues throw. |
| `audit` | Mutable array for semantic state or explicit geometry checks. Text helper boxes power generic checks. Custom marks need their own semantic/numerical tests. |

The renderer calls `render` on arbitrary times, including backwards seeks. Derive every frame from inputs and time. Do not depend on previous frames, timers, randomness, DOM events or external requests. Keep numerical operations pure and test them separately.

Imports must stay within the job or kit; browser bundling rejects paths outside those roots. Keep reusable job logic beside the scene. The handoff bundles imports into an editable module so the original checkout is not needed to replay it. Node-only imports are unsuitable. Verify the relocated handoff, not just its ZIP filename.

## Probability and selection recipe

When explaining conditioning, show the original population and the selected subset. Keep each token's identity and group color while it moves into the selected set; retain outlines or faint unselected items so the denominator change is visible. State what one token represents. Derive displayed counts and token membership from the same input. Check that selected plus unselected equals the original population throughout motion. Movement is a selection animation, not intermediate empirical observations. A bar that simply appears after an equation does not show how the population was filtered.

For discrete expected-frequency examples, reject noninteger counts or explicitly choose another representation. Do not silently round tokens while showing exact probabilities. A changed base rate must change the source population as well as the answer, while retaining the original comparison.

## Prediction and text alternatives

Each scene needs its own text equivalent. A prediction's description must convey its proposed inputs and rule without exposing its answer. Review the rendered description panel and the automatically displayed current-scene evidence as well as the canvas. Give prediction scenes a prompt-safe claim when the general mechanism claim would answer the question. Do not copy a whole-story summary into every `visualDescription`: that can reveal future answers and fail to describe the current screen. A learner may deliberately open later transcript/answer material; a prediction is a learning invitation, not secure assessment software.

## Verification

Run `npm run check:scenes -- --project <JOB> --out <EVIDENCE_DIRECTORY>`. It checks four layouts, all portrait frames at 430×932 emulation and the prediction hold. Inspect start, transition and end images yourself. Add numerical and token membership checks, deterministic backward replay, and a relocated editable-handoff check. Generic layout checks do not establish source validity, answer concealment, visual reasoning or comprehension.
