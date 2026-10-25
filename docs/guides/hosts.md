# Hosts and setup

This repository is a portable production kit, not a hosted agent service. The existing agent reasons and authors; local scripts produce speech and video in the execution environment available to that task.

## Capability-based entry

1. Can the agent read the supplied source and repository?
2. Can it create files and run Node, Python and FFmpeg in an approved workspace?
3. Can it install the pinned dependencies/model and launch headless Chromium?
4. Can it return playable local artifacts to the user?

If the answer is no, report the exact missing capability. A text-only conversation cannot render merely because it received a GitHub link. Do not silently send material to a separate hosted video service.

## Codex and Claude Code

Use the shared AGENTS.md. The repository adapters point to the canonical skill. Clone into a permitted workspace, then run `npm ci --ignore-scripts` and `npm run doctor -- --json`. Existing host approval and network controls still apply.

## ChatGPT Work and Work-style hosts

OpenAI documents skills with instructions and optional scripts as a shared authoring format for ChatGPT and Codex. Plugin packaging is the distribution route for installed Work skills across surfaces; a bare repository URL is not automatic skill installation. Reading AGENTS.md gives a capable agent a direct route without requiring a plugin first. [Official skill documentation](https://learn.chatgpt.com/docs/build-skills).

A Work task may use approved local resources or cloud execution. Cloud environments do not automatically inherit laptop files, cached models or browser sign-ins; local access requires an online authorized computer and appropriate controls. Detect actual tools and filesystem access. [Work execution boundaries](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-overview).

The same capability test applies to other Work-style hosts. Their names alone are not compatibility evidence. Record the exact route tested in the verification record; do not claim an untested host integration.

## Explicit setup

For agent execution in the cloned repository:

```text
npm ci --ignore-scripts
npm run doctor -- --json
npm run setup -- --browser --download-model
```

`setup --browser` installs Playwright’s Chromium into its normal user cache. `setup --download-model` uses uv to create the kit’s Python environment from `uv.lock`, installs the English tokenizer if missing, and fetches a pinned Kokoro snapshot and three English voices. It writes local settings only to the gitignored `.local/` folder. Install FFmpeg through an appropriate permitted mechanism if the host lacks it; setup does not require or silently obtain administrator rights.

The voice dependency pins the tested PyTorch version. Linux uses the explicit CPU wheel index so a cloud CPU job does not pull a CUDA stack. This follows [uv’s PyTorch index guidance](https://docs.astral.sh/uv/guides/integration/pytorch/). It is dependency configuration, not a claim that every Linux host has been tested.

Reuse an existing speech environment with `--python <KOKORO_PYTHON>` during explicit setup. For a session that already has the pinned models, set `EXPLAINER_PYTHON` and `EXPLAINER_MODEL_PATH` in the agent’s command environment. An existing browser can be selected with `EXPLAINER_BROWSER_PATH`. Those are machine-local settings, never committed examples.

The bundled examples can play and render without Python/model setup. New narration needs the speech environment. Once prepared, speech inference and rendering do not require external services. The authoring agent may still process context through its provider; “local voice” does not mean offline reasoning.
