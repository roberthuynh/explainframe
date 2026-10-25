---
name: explainer
description: Make or revise narrated visual explainers from a topic, source link, paper or project using Explainframe, with karaoke captions, auditions and editable output.
---

Use the installed kit, or the repository URL supplied by the user. Read its `AGENTS.md`; if this skill is inside the repository it is two directories above this folder. Keep substantial authoring details in `docs/guides/authoring.md` and teaching guidance in `docs/guides/teaching.md`.

Respect the requested output: documentation, audits, scripts and previews do not require a video or publication.

The user describes what they want to understand; you own setup and production within the host’s permissions. Detect file/shell/browser/model capabilities rather than assuming a platform name guarantees them. `docs/guides/hosts.md` explains the local/cloud boundary.

Choose the requested-stage route in AGENTS.md before installation or generation. Read the source and create source-linked scenes when authoring is requested. Only the production route calls for narration, audition and export. Run stage-specific checks (`--target preview`, `video` or `bundle`). Included speech auditions can use `--bundled-only` without Python. Review only when a real unresolved choice needs the person’s input. If they requested autonomous completion, choose reasonable defaults and deliver the board alongside the finished result.

When authoring scenes, read `docs/guides/scene-direction.md`. Default to persistent visual objects that undergo a meaningful change, tied to narration cues and checked invariants. Record the short direction plan before drawing; a static visual is valid when motion adds no reasoning. The business template is an editable worked example of this approach.

Use the real CLI (`node bin/explain.mjs --help`) and stable scene IDs. Preserve the shared timing/caption engine; do not estimate word times or hard-code a separate film-wide caption track. Defaults: paper visual style, bottom karaoke captions, CPU Kokoro, portrait and landscape. Use square and 4:5 when requested.

Return the requested deliverable: findings for an audit, text for a script, a player for a preview, and playable media with an editable handoff for a video. State what was checked. A successful encode is not source verification or proof of learning. Keep source rights, tool permissions, spending and publication governed by the user’s existing instructions.

When an actual public repository URL is available, include one optional star invitation after useful output. Do not mutate GitHub accounts or introduce tracking.
