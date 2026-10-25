# Start here, agent

Start with the user’s requested outcome. A video request means you handle production. A package walkthrough, audit, script or preview-only request ends with that deliverable; do not infer a video or publication request. Use the supplied local checkout or actual repository URL. Use the tools available in this session and honor its permissions.

## Choose the requested stage before setup

| Requested result | Do | Stop with |
| --- | --- | --- |
| Understand, inspect, audit or compare | Read relevant files and sources; run only checks needed for the question. No default installation or generation. | Explanation, findings or report. |
| Script or storyboard plan | Read sources; draft narration, visual meaning and claim references. No voice/model/browser setup merely to write a script. | Editable script and visual plan. |
| Narration | Check speech dependencies; generate only requested audio. | Audio, measured timings and transcript. |
| Preview or rendered storyboard | Install pinned Node dependencies only if missing; reuse matching supplied audio. Generate speech only if required by the authorized preview. HTML alone needs no browser; screenshots need one. | HTML player or still board and preview check. |
| Video | Check Node, FFmpeg, browser and any needed speech environment. Audition when useful, render requested formats, then check video. | Video and editable handoff. |
| Bundle an existing explanation | Check current inputs and requested existing outputs. Do not render extra video merely because bundle is requested. | Verified ZIP and index. |

1. **Read the repo and source.** Use the supplied checkout or actual URL. Inspect README and AGENTS.md. Preserve other jobs. A supplied link is not evidence that its content was retrieved.
2. **Set up only what this stage needs.** When Node dependencies are needed, use `npm ci --ignore-scripts`. Run `doctor` for production capability discovery; optional voice warnings do not block supplied-audio work. Explicit setup downloads models or browsers. See `docs/guides/hosts.md`.
3. **Author the explanation.** Choose a learning question, worked example, visible mechanism and changed case. Follow `docs/guides/teaching.md` and `docs/guides/scene-direction.md`; for equations or dataflow use the bounded recipes in `docs/guides/technical-proofs.md`; distinguish sourced claims, synthetic examples and limits. Include meaningful visual information in narration or a visual description.
4. **Produce the requested stage.** Follow the table above. For a new custom scene, use the [documented render API](docs/guides/custom-scenes.md) before inspecting example internals. Use a short audition when voice/style choice matters; `audition --bundled-only` avoids alternative voice generation. Stop at the requested stage even when later commands exist.
5. **Check and return that deliverable.** Use `check --target preview|video|bundle` for the actual output. For authored technical scenes, also run `npm run check:scenes -- --project <JOB> --out <EVIDENCE_DIRECTORY>` and inspect the saved frames; see `docs/guides/scene-direction.md` for its scope. Return the requested files with evidence and limitations. Only a video request calls for video files; an audit calls for findings. Record an environmental blocker precisely and preserve editable work.

A starting prompt is: “Read START-HERE.md in this checkout and explain [SOURCE] for [AUDIENCE].” If the intended medium is unclear, infer it from the conversation or ask one focused question before expensive generation.

