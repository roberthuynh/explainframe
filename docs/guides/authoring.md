# Authoring and revision

Run commands from the cloned kit root. Arguments naming a project may be absolute paths into the user’s permitted workspace.

## Start a job

`npm run new -- --path <NEW_PROJECT_DIRECTORY> --source <SOURCE_URL> --title "Working title"` creates a blank project. Use `--template business`, `math`, `geometry`, `attention` or `cache` to copy an included example. Do not present a copied example as an explanation of a new source: read the source and replace its content.

`project.json` has `schemaVersion: 1`, a title, sources, claim references, scenes, speech, captions and output presets. Use `npm run doctor -- --json` for diagnostics and `node bin/explain.mjs --help` for supported command options.

`schemas/project.schema.json` is the runtime shape contract, checked with pinned Ajv before defaults and semantic checks such as unique IDs and claim references. For pure JSON stdout, invoke `node bin/explain.mjs ...` directly or use `npm --silent run ...`; npm’s ordinary wrapper prints its own command banner.

For agent-authored work, start with [scene direction](scene-direction.md) and the business example’s editable direction note.

## Scene contract

Each scene has a stable slug `id`, `title`, spoken `narration`, `visual`, optional `takeaway`, optional claim IDs and a comprehension hold (default 0.8 seconds). Inserting/reordering scenes should not rename their IDs.

Visual types:

- `statement`: `value` and/or short `text`.
- `compare`: `items` with `label`, `value`, `detail` and optional `emphasis`.
- `steps`: an array of short strings in `items`.
- `bars`: `items` with label and nonnegative numeric value; optional prefix/suffix.
- `dots`: `count` (3–12), optional zero-based edge pairs and a short caption.
- `image`: `file`, a project-relative PNG/JPEG/WebP. Keep source and usage rights with the project. Images are included in self-contained previews.
- `custom`: `module`, a project-relative file under `scenes/`, exporting `render(api)`. The browser API supplies canvas context, dimensions, scene-local time, progress, palette, body bounds, text/card/line helpers and layout audit. Use those helpers for text auditing. Keep custom modules and their dependencies inside the project. esbuild bundles them; Node built-ins and imports outside the permitted project/kit boundary fail.

Animation uses scene-local time, a stable seed if randomness is needed, and explicit data. Do not use Date.now(), uncontrolled randomness, remote assets or asynchronous drawing inside a frame. Preview and export call the same renderer. The built-in caption layer stays shared.

## Speech and captions

`speech` controls `voice`, `speed`, English `language` (`a` or `b`) and a `lexicon` mapping exact words to IPA. Generate speech before binding visual timing. The official Python Kokoro path returns duration-derived token timings. Imported recordings need matching audio/timing metadata; do not fabricate word times or label estimates as measured.

For recordings, set `speech.backend` to `provided` and `speech.voice` to the actual speaker label. Each scene supplies relative `audio` and `timing` files. Timing metadata contains `textHash` and `audioHash` (SHA-256), `voice`, `speed`, `language`, `lexiconHash`, sample-derived `duration`, `words` with text/start/end, and `timingMethod: aligned-recording`. Use an appropriate authorized aligner outside this kit to create real timings. A script mismatch fails visibly instead of substituting a synthetic voice.

`caption.mode`: `karaoke`, `pop`, `plain`, or `none`. `caption.maxWords` (2–10) limits phrase chunks; `caption.safeBottom` (0.03–0.30 of height) reserves bottom space. Keep enough room for the intended destination’s UI. Platform overlays vary; inspect the actual output rather than treating one preset as a guarantee.

Narration cache keys include text, voice/speed/language, lexicon, model content fingerprint, backend versions and generator code. Final segment keys include the bundled renderer, fonts, visual input, speech, size, quality, and the detected browser/FFmpeg versions and host architecture. Unknown tool versions disable segment reuse. Do not hand-edit cache metadata to force a match. A stale or missing artifact must rebuild.

## Review and choose

```text
npm run narrate -- --project <PROJECT_DIRECTORY>
npm run audition -- --project <PROJECT_DIRECTORY>
npm run select -- --project <PROJECT_DIRECTORY> --selection <SELECTION_JSON>
npm run preview -- --project <PROJECT_DIRECTORY> --format portrait
npm run storyboard -- --project <PROJECT_DIRECTORY> --formats portrait,landscape,square,feed
```

The audition uses one scene, capped at 400 characters and four voices. Choose a short representative excerpt rather than synthesizing the whole video repeatedly. Use `--bundled-only` for a model-free audition of the included voice. The board’s voice, style and caption controls save a selection tied to the project and input fingerprints. If the script changes, regenerate the board; stale selections fail visibly. For autonomous work, use CLI selection flags and report the choice.

## Export and handoff

```text
npm run render -- --project <PROJECT_DIRECTORY> --quality draft --formats portrait
npm run render -- --project <PROJECT_DIRECTORY> --formats portrait,landscape,square,feed
npm run check -- --project <PROJECT_DIRECTORY> --json
npm run bundle -- --project <PROJECT_DIRECTORY>
```

Final preset dimensions: portrait 1080×1920, landscape 1920×1080, square 1080×1080, feed 1080×1350, at the project frame rate. Drafts downsample the same master layout. Exports use H.264, yuv420p and AAC at 48 kHz, with a documented −16 LUFS normalization target. The loudness target is a processing setting, not a measurement receipt.

Set `--captions none` for a clean export, or `--captions plain` for a calm subtitle treatment. This overrides the job for that command. To make a persistent choice, use `select`.

`dist/` contains the review player, captions, transcript, sources, timeline and rendered formats. `bundle` adds the editable project and audio assets. The current tools do not automatically publish or upload those files. Use the host’s approved display/artifact tools to return them.

Clean and alternate caption exports have distinct filename suffixes, so requesting a clean version does not overwrite a karaoke MP4. Validation of a command override should use the same override; persistent choices belong in `project.json` through `select`.

## Failure and recovery

JSON errors include a code and repair action. A project lock prevents conflicting jobs. If a process was interrupted, inspect `build/.lock` and its PID before removing it; never delete a live job’s lock. Completed scene segments are retained, so resuming a render reuses valid segments.

The renderer rejects detected text overflow and failed declared numerical checks. It checks every exported frame’s text bounds and fully decodes the MP4 afterward. These checks do not detect every overlap, subtle animation issue, pronunciation error or unsupported factual claim. Inspect actual output and keep human/source review separate.

## Teaching and traceable sources

Add an optional `teaching` object with `audience`, `goal`, `prerequisite`, `limit` and `questions`. Each question has `id`, `question`, `answer`, optional `explanation` and a `scene` ID for replay. Answers start hidden in the player and remain local. These interactions do not measure learning gains.

Claims can add `basis` (for example, sourced fact, inference or synthetic example), `locator`, `note` and `limit`. Sources can add `locator` and `note`. The current scene's claim references drive the evidence panel. A locator can identify a page, section, table or an authored note; do not invent one.

For local supporting notes, use a project-relative `source.file`. Only set `includeInBundle: true` when that specific file is intended to travel with the handoff. Otherwise the bundle preserves the citation/locator and records that the original document remains with its owner. Source files are fingerprinted for staleness; no raw source collection is copied automatically. The business example demonstrates this contract using an original synthetic note.

`stacked-bars` shows a whole split into parts. Give 1–3 `items`, each with a label and 2–3 `segments` containing `label` and a nonnegative `value`. Totals use the supplied label and optional currency prefix; no revenue unit is inferred. Include units in the authored label. All bars share the same scale. The math example includes editable custom modules demonstrating triples and independent binary choices.

## Check the intended delivery

- `check --target preview`: validates current prepared inputs, timing, and the actual HTML hash in `dist/review.json` without requiring an MP4. Old players without this receipt must be rebuilt with `preview`.
- `check --target video`: additionally checks all project formats, or the formats explicitly named with `--formats`.
- `check --target bundle`: additionally verifies the current handoff manifest, files and ZIP hash.

Without a target, the checker uses video when a render receipt exists, otherwise preview. It never generates narration as a side effect of checking. Referenced assets, transitive custom modules, imported media and runtime changes invalidate old prepared/export receipts. Rebuild the affected outputs rather than relabeling an old file current.

`bundle` returns `archive`, `index`, `editableProject` and `manifest` paths. Give the human `handoff.zip`; its `index.html` links the player and included files. Custom scene dependencies are bundled into portable modules. Only current verified video files travel. Bundled speech continues to preview/render without Python. Revision notes downloaded from the player include a scene ID and timestamp for the next agent.

Frame capture, browser initialization and encoder input each have a 30-second deadline. Encoder completion has a 120-second deadline. Interrupts wake pending waits, terminate the encoder (force kill after 1.5 seconds if necessary), close the browser and release the project lock. Browser cleanup is bounded to 30 seconds during normal completion and 5 seconds during cancellation. Doctor checks that the configured browser is an executable file; actual launch remains a separate browser check.

Standalone players include readable license notices. ZIP handoffs also include `licenses/` files covered by the handoff hashes. User-supplied assets and custom code still need their own appropriate notices.

## Describe meaningful visual information

Built-in charts, comparisons, steps and graph connections produce text alternatives from their authored data. Add `scene.visualDescription` when the relationship, transformation or meaning needs more explanation. This text appears beside the canvas, follows the current scene, and travels in `transcript.md` and the editable ZIP.

For `custom` or `image` scenes, provide that description or set `visualMeaningInNarration: true` only after reviewing that the narration already conveys the relevant visual information. `check` reports missing coverage. The flag is an author attestation, not automated proof of equivalent meaning. Describe the takeaway and relationships; avoid only describing colors or decoration.

Example: “Revenue increases from $100 to $150, while variable costs increase from $60 to $105; contribution increases from $40 to $45.” Do not put unverified conclusions in an alternative. Caption wording remains the spoken words. A written description does not add spoken audio description to an MP4 or establish WCAG conformance. See [W3C guidance](https://www.w3.org/WAI/media/av/description/).

## Local timing and cache receipts

`build/job.json` retains start/end timestamps, total monotonic elapsed milliseconds, named stage durations/status, and available speech/scene reuse counts on both success and failure. Preparation includes narration, so its duration is not independent speech timing. Selection has a total duration; setup/doctor are capability operations outside job receipts.

`dist/render.json` and each encoded segment record the selected browser executable/version, FFmpeg and ffprobe versions, Node, platform/architecture, kit and pinned package versions. Per-result `elapsedMs` is cumulative since that render command began, not the isolated time for one format. These files stay local; nothing sends telemetry.

Speech keys change with text, voice, speed, language, lexicon, model/backend/generator. Render keys change with the rendered scene inputs and tool versions. A second render can reuse scene encoding but still mux, decode and verify the deliverable. Record cold/warm runs separately. Do not optimize from one tiny sample or compare elapsed times across different machines as engine benchmarks.
