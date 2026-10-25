# Tool inventory and setup

There are two dependency layers. Node and the external media tools run the production utilities. Python/model setup is optional until new narration is needed. The agent's own model subscription/API remains outside this package.

| Tool | Why it exists | Needed when |
| --- | --- | --- |
| Browser | Plays the included HTML player with its adjacent bundled media folder | Viewing that file only; no install/model needed |
| Node 22+ and npm | CLI, validation, project files, bundling and package checks | Running the kit |
| esbuild, pinned | Bundles scene/player modules into portable browser code | Preview, custom scenes, export/handoff |
| fflate, pinned | Produces the ZIP in JavaScript | Editable handoff |
| FFmpeg and ffprobe | Inspect actual audio duration, encode/mux/decode media | Dynamic preview preparation uses ffprobe; rendering uses FFmpeg; production fixture tests need the tools |
| Playwright plus compatible Chromium/Chrome | Deterministic frame capture and UI testing | Storyboards, video export, browser regression suite |
| uv and Python 3.12 | Isolated pinned speech environment | Setting up fresh Kokoro narration |
| Kokoro/Misaki/PyTorch/SoundFile and English tokenizer | CPU waveform generation and native model-duration timings | New English narration |
| Pinned Kokoro-82M snapshot and selected voices | Local model inference | New narration; reused from normal cache when present |
| Git | Local history, hooks and message audit | Development; not required just to watch the example |

Figtree and Newsreader fonts are bundled under their OFL notices. No model weights or speech API credentials are committed. [THIRD_PARTY.md](../THIRD_PARTY.md) separates component licenses.

## Setup routes for an agent

Commands below run from the kit root. If pasting into a fresh terminal, first replace the placeholder in `cd <ABSOLUTE_KIT_DIRECTORY>` with the actual checkout path. The agent should discover installed tools before changing anything.

**Inspect without new media:** open the docs/example HTML. For development checks, install Node packages and run `npm run verify`. The test fixtures may write temporary HTML/ZIP files; this command does not render video, infer speech or fetch models.

**Use bundled example speech:** run `npm ci --ignore-scripts`, then `npm run doctor -- --json`. Ensure FFmpeg/ffprobe are available. `preview` writes a player; `audition --bundled-only` compares looks/captions using the included voice. Headless Chromium is needed for storyboard/render, not merely writing the HTML preview.

**Create new narration:** use `npm run setup -- --browser --download-model` after the necessary tools and permissions are available. This is an explicit install/download operation. The locked Python environment and pinned model revision are used; setup writes only local ignored settings. FFmpeg and uv must be installed through an appropriate permitted host mechanism if absent.

`doctor` reports installed capabilities and repairs. It reports a missing Chromium installation even for preview-only work. You can leave Chromium uninstalled when you only need to generate an HTML preview; rendering video or capturing stills requires it. It does not itself install tools, prove that Chromium can launch under every sandbox, or certify a cloud platform. A successful package-presence check is weaker than actual speech or browser execution.

## Existing environments

`EXPLAINER_PYTHON`, `EXPLAINER_MODEL_PATH` and `EXPLAINER_BROWSER_PATH` select existing installations. Keep actual machine paths in the command environment or ignored local settings. Do not put another user's private workspace paths into a committed example.

Once the speech assets and tools exist, synthesis and rendering run locally. Initial dependency/model downloads need network access. Source research and authoring use the agent's own tools/provider, so local TTS does not make the whole interaction offline or costless.

## Development verification

`npm run lint` performs the targeted repository audit: required docs, local Markdown links, JSON, package-version consistency, dependency/action pins, tracked-file boundaries and skill pointers. It is not an ESLint or typecheck claim.

`npm run verify` adds JavaScript syntax checks, Python syntax if available, commit-history policy in a Git checkout, and the test suite. `npm run test:direction` checks the moving business example in every frame/layout and replays its portable handoff without making a video. `npm run test:browser` is separate because it launches Chromium and makes a short export. Neither hooks nor this workflow publish anything.

The committed CI definition is prepared for Node 22/24 on Ubuntu and uses read-only permissions and pinned actions. It has not run on GitHub. A separate clean Debian Linux arm64 / Node 22 container passed local verification and the short browser/export suite; that does not establish the proposed Ubuntu x64 CI matrix. No remote protection settings, required checks, auto-merge, release job or scheduled automation has been enabled.

Use [hosts.md](hosts.md) for the actual agent-host boundary and [verification limits](../verification/README.md) for tested and untested routes.
