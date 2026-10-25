# Direct the explanation before decorating it

Default for agent-authored explanations: animate a meaningful change when a process, relationship or transformation is the subject. Motion must reveal reasoning. A still chart or image is appropriate when it communicates the idea better; write down that reason instead of adding movement for its own sake.

## Before authoring a scene

Write a short direction note, either in the script/visual plan or a project-local `direction.md`:

| Decision | What to specify |
| --- | --- |
| Learning question | The concrete thing a viewer should be able to predict or explain |
| Persistent objects | Objects, labels, units, colors and scale that survive the sequence |
| Start → action → end | Initial state, one meaningful operation, and the result the viewer should notice |
| Invariant | What must remain true during motion: a sum, identity, ordering, geometric relationship or a stated assumption |
| Narration cue | The real timed word or phrase that starts the reveal; bind it after audio exists |
| Comparison and limit | What baseline stays visible and what the picture does not establish |
| Text equivalent | How the narration or visual description conveys the same mechanism |

For scripts, describe cues in words and stop at the requested stage. Never fabricate timestamps. After narration is available, use `cue(word, {occurrence, edge})` or real word IDs. Missing or ambiguous cues should fail visibly.

## Reusable directions

- **A whole and its parts:** retain the outline/scale, identify a component, then show the remainder. Preserve the sum. A reveal of known parts is different from a change in the underlying values.
- **A changed case:** keep the same objects and scale, change the input, show the resulting output, and retain a faint or labeled baseline. Label interpolation as illustrative when intermediate states are not observed data.
- **A process:** move the same token through named stages; show the transformation at each stage. Do not imply conservation when the process creates or destroys quantity.
- **An equation or proof:** identify what symbols refer to, transform only by justified operations, preserve matching objects, and state the step’s assumptions. Do not animate invalid equalities for visual convenience.
- **A counterexample:** keep the setup recognizable, change one assumption and show exactly where the prior conclusion breaks.

See `examples/revenue-and-contribution/direction.md` and its shared `scenes/economics.mjs`. `new --template business` copies this example and its editable module. Replace the synthetic content for a new source; do not relabel it as sourced evidence. Other subjects may use different modules or static primitives.

## Review before delivery

Inspect beginning, change, end, dense frames and scene boundaries in each requested layout. Scrub backward: the same time must produce the same state. Check actual geometry/labels and arithmetic through the transition, not just end screenshots. Keep identities, units and scale stable unless the change is explicit. Verify the relevant cue resolves and the completed result holds long enough to read. Keep labels clear of bottom captions.

Ask: if we remove this animation, which reasoning step disappears? If the answer is none, simplify it. If a changed case can be predicted only from narration, strengthen the diagram. Technical tests catch bad sums, missing cues and overflow; a person must still judge whether the explanation makes sense. Never turn a content-quality checklist into a claim of measured learning.

## Technical recipes

Use [the geometry and attention proofs](technical-proofs.md) for equations and dataflow. Prefer shared pure operations, bind transitions to real speech, and calculate labels and shapes from the same state. Inspect intermediate validity and one changed-input revision. A reveal fraction is not necessarily a physical or probabilistic state.

## Technical scenes: show the question, then test the picture

A prediction needs the proposed input and target rule visible throughout the silent interval. Conceal the answer, not the information needed to derive it. Use a separate prompt scene with `learningPhase: "predict"` and at least three seconds of `hold`, followed by the answer scene. Do not ask about a new query while the screen retains the old query; do not label an untransformed grid's identity matrix as the target shear.

Derive displayed operands, dimensions, shapes and counters from the same validated inputs. A changed-key or changed-value revision must change its label as well as its answer. Reject unsupported dimensions clearly. Use ≈ for rounded arithmetic. Excluded attention positions must have zero weight before normalization; setting a forbidden score to zero is not a mask.

Reveal prerequisites in order: roles, component arithmetic, normalization, then the weighted result. Show contribution size through length or area on a declared common scale. Draw a dataflow connection to the actual objects it connects. A moving dot or sweep with no endpoints does not explain the operation.

Run the generic scene check after authoring:

```text
npm run check:scenes -- --project projects/my-explainer --out projects/my-explainer/review-evidence
```

This prepares the preview, so changed narration may require local speech generation. It checks every frame in all four formats for text intersections and bounds, saves end-state images, checks every frame’s essential text at a 14 CSS-pixel minimum in a 430×932 phone emulation, and checks scenes with `learningPhase: "predict"` (or the legacy ID `predict`) for a three-second post-speech hold. Caption, matrix and operation text count as essential; decorative eyebrows and axis/origin ticks are explicitly exempt. The threshold is a project criterion, not an accessibility certification. Inspect motion and dense intermediate frames too: font size alone does not establish legibility, and a hold check cannot prove the answer is concealed. Test those semantic facts separately.

The command emits JSON and exits nonzero on failure. `src/player/visual-checks.mjs` exposes the same audit checks for custom harnesses. Custom drawing must report text through the supplied `text` helper (or equivalent audit boxes); unreported raw canvas drawing cannot be certified by these checks. Continue independent numerical checks, source review and a changed-case revision. Passing layout checks is not evidence that viewers learned.

For custom modules, use the [render API and population-selection recipe](custom-scenes.md). Check prediction descriptions as well as canvas labels: a scene-specific text alternative must not reveal the future answer.

For pacing and unused space, follow [the short review checklist](pacing.md).
