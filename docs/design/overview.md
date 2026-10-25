# Understand the package

Explainframe is a reusable production kit for an existing coding agent. You bring a question and source material. The agent researches, explains and writes the project. The kit turns that project into synchronized speech, drawings, captions and reviewable output.

The kit runs in your agent’s execution environment. Its Node package is marked `private: true` to prevent accidental npm publication.

## The three layers

| Layer | What it owns | What you direct |
| --- | --- | --- |
| Your existing agent | Source access, reasoning, script, choice of examples, custom scene code and repairs | What you want to understand, audience, length and revisions |
| The kit | Project validation, narration, timing, drawing helpers, caption placement, checks, caches and packaging | Default style or requested formats; it has no second LLM account or orchestration service |
| A project | Its sources, claims, narration, scene IDs, visuals, learning questions and local media | The actual explanation; keep this when asking for edits |

A repo URL alone does not make a text-only assistant capable of rendering. The host must provide appropriate file/shell tools and permissions. Similarly, `new --source URL` only records an unread source; it does not fetch, understand or verify the article. Source retrieval belongs to the authoring agent.

## How one explanation travels through it

1. **Question and source.** The agent reads the actual input and identifies what a viewer should be able to explain afterward. It records source IDs, claims, assumptions and limits.
2. **Project recipe.** `project.json` describes scenes and narration. A stable ID such as `costs` survives wording changes or scene reordering. Built-in visuals cover comparisons, steps, bars, split bars, dots and images; custom modules cover other deterministic drawings.
3. **Narration and measured time.** Local CPU Kokoro generates a waveform and model-duration token timestamps. Those timestamps place the active caption word and optional visual cues. They are not independent forced-alignment accuracy measurements. Display text and spoken text stay separate for formulas and numbers.
4. **Audition and review.** One short excerpt compares looks, captions and voices. The player offers replay, transcript, speed, mute, caption preference, current-scene evidence, optional questions and revision-note export.
5. **Requested output.** The same visual code is used for browser preview and frame export. FFmpeg assembles the frames and audio into MP4. Layouts adapt to 9:16, 16:9, 1:1 and 4:5 rather than cropping one fixed frame.
6. **Handoff.** A ZIP contains an index, player, current available exports, caption/transcript/source files and an editable project with speech. Only source files explicitly marked for inclusion travel with it.

You can request only an explanation, script or preview. Those requests do not require a finished MP4. The workflow should stop at the output you asked for rather than render gratuitously.

## Why revisions can reuse work

There are two main caches. Speech keys include narration, voice, language, speed, pronunciation, model contents, generator and backend versions. Video segments depend on actual drawing/audio/font content and output settings. A sentence edit should rebuild its scene's speech; a changed voice rebuilds the affected voice tracks; an appearance change does not require new speech.

Input fingerprints also follow imported drawing modules and referenced media. Checks can therefore detect that an old output became stale even if `project.json` was untouched. Completed scene segments can survive an interrupted render. A project lock prevents two jobs from writing the same project at once.

These are implemented contracts with regressions, not a claim that every edit is free or that every possible custom module is supported. Global style, font or timing changes can affect multiple scenes.

## What the viewer gets

The MP4 is the portable film. SRT/VTT are caption sidecars. The HTML player is a richer review surface: transcript, controls, evidence, questions and revision notes. It embeds fonts and speech, so basic playback does not need a running server. An editable project and ZIP are the route back to an agent for changes.

A learning question can expose whether the viewer can apply the idea, but clicking Reveal is not a learning-outcome measurement. Likewise, source IDs and arithmetic checks make a claim inspectable; they do not prove its support or correctness automatically.

## What is included and what is deliberately absent

The repository includes three complete video examples and five starter templates. It also includes the CLI, project schema, agent instructions, bundled narration, fonts, review tools and tests.

Not implemented as built-in services: arbitrary PDF/web ingestion, an LLM research engine, a hosted editor, cloud rendering, stock-media search, image generation, background-music/SFX production, general multilingual alignment, an advanced mathematical typesetter or social publishing. An authorized agent can use outside tools for some of those tasks, but that does not make them package features.

Initial speech generation is English. Imported aligned recordings are supported under the documented timing contract. Advanced math can use custom visuals; Manim and Remotion are not current dependencies or supported drop-in adapters.

## Verification

See [verification limits](../verification/README.md) for commands and limits.

Read [using the kit](../guides/using.md) for the human workflow, [tooling](../guides/tooling.md) for dependencies, [authoring](../guides/authoring.md) for the project contract and [contributing](../../CONTRIBUTING.md) for changes to the kit itself.
