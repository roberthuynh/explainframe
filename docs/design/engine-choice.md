# Renderer decision

The kit uses Canvas, Chromium and FFmpeg for deterministic drawings, frame capture and encoding.

The needed scenes are quantities, comparisons, sequences, small graphs and cue-driven custom drawings. They already fit the current scene contract. A migration would add dependency and integration work without a demonstrated missing scene. Current macOS/Linux tests cover execution and export, not comparative animation quality.

| Candidate | Documented fit | Trigger to evaluate it |
| --- | --- | --- |
| [Manim Community](https://docs.manim.community/en/stable/examples.html) | Mathematical constructions, equations and transformations in Python | A required equation transformation or geometric construction is too cumbersome with the current primitives |
| [Motion Canvas](https://motioncanvas.io/docs/) | TypeScript generator animations with a real-time editor, built for informative vector animation synchronized to voice | A complex staged vector sequence needs timeline/editor control the current API lacks |
| [Remotion](https://www.remotion.dev/docs/) | React-based video composition, player and render tooling | A project already has reusable React visuals or needs that composition model |
| Current kit | JSON primitives plus custom deterministic browser modules; existing Kokoro/caption/handoff flow | Default for the supplied examples and comparable scenes |

These rows come from official documentation inspected October 22, not installed performance tests. Check each candidate’s current license before adopting or copying it.

If a concrete unmet scene appears, compare just that scene: same source, script, audio, timings, output sizes and visual requirement. Record implementation effort, dependencies, cold/warm render time, determinism, caption alignment, editable handoff, accessible description and actual screenshots. Use a temporary adapter that returns an image sequence or video plus timing metadata; preserve the shared caption and source contracts. Recommend a migration only after the observed result justifies it. Do not install multiple engines merely to fill a benchmark table.
