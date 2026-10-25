# Use Explainframe through your agent

You do not need to read the implementation or run these commands yourself. Open the local kit folder in an agent with file and shell tools. It should read the entry docs and handle the mechanics.

## Four requests that mean different things

**Understand the package:** “Read this checkout and explain what it does, its dependencies and limits. Do not make a video or publish anything.”

**Develop an explanation first:** “Use this kit to explain [source] for [audience]. Give me the learning goal, script and storyboard proposal first. No voice or video yet.” The agent can write a scene plan without generating media.

**Make an explainer:** “Read AGENTS.md and use this kit to explain [source or topic] for [audience]. Use bottom karaoke captions, an audition board and an editable handoff. Make [formats] and keep it local.”

**Revise:** “In the costs scene, make the subtraction visible. Keep the voice and the other scenes. Refresh the affected preview and requested outputs.” You can also copy or download a revision note from the player and give it to your agent; it names the scene and timestamp. The player collects the request rather than editing the video.

Use the checkout’s actual folder or repository URL. No global installation is required.

Start with a short explanation you intend to share or revise. A script or preview lets you check the idea before producing a video. First-time setup can require downloads and permission prompts; no fixed completion time is promised.

## Choose a useful task

Use Explainframe when a visual sequence helps someone understand an idea and you want a video you can share or revise. That might be a lesson, research walkthrough, product explanation, team process, sales explanation or decision comparison.

Bring a question or material your agent can actually read: an article, paper, spreadsheet, repository, process note or script. The agent handles source access and interpretation. Explainframe handles the project, speech, drawings, captions and output files. A source link alone is not evidence that the agent read it.

For a product, explain its mechanism or workflow; screen capture is not a built-in feature. For a decision, label assumptions and keep comparisons on a consistent scale. For research, distinguish the source’s findings from your illustration. A synthetic example is not customer or experimental evidence.

## What you should provide

Start with the thing to understand and who will watch. Add a length, style, learning question or output format when you have a preference. The agent should use reasonable defaults and ask only for missing information that materially changes the result. It must obtain actual authorized access to a private source; a pasted link is not evidence that it read it.

For example: “Explain why revenue can rise while contribution falls to classmates who know basic accounting. About a minute. Use a worked example and distinguish contribution from profit.” This is enough for the agent to develop a brief, not a claim that the script has already been written or verified.

## What to review

First review the explanation: did it choose the right question, make the mechanism visible, preserve the source's meaning and say what the example leaves out? Then review the production: pronunciation, timing, readable captions and format. An audition is a short taste comparison, not a required repeated approval gate.

The finished player has scene titles/times and source/claim context. Optional changed-case questions ask you to apply the rule, reveal a reasoned answer and replay the relevant part. It does not upload or grade your response. Caption and mute controls change playback preferences; use audition/select or ask the agent when the exported video settings should change.

## What to keep

Keep the ZIP and its editable project. An MP4 alone is the viewing copy, not the complete revision source. The ZIP's index links the files actually included. Its file hashes can reveal changes or corruption; they do not certify the explanation's truth.

The project manifest preserves text, scene IDs, sources, claims and settings. Bundled speech lets another capable executor preview or render that project without regenerating narration. A script/voice change still needs a speech environment or a new aligned recording.

## What happens on failure

The CLI returns a structured error and repair action. Your agent should repair an ordinary missing dependency, stale receipt or bad input within its available permissions. If the host cannot install tools, launch a browser or read the source, it should say exactly which capability is missing and preserve the editable work. You should not need to debug Python versions yourself.

Use the check target that matches the request. A preview can pass `check --target preview` without an MP4; a requested film must pass video checks for the requested formats; a ZIP must pass bundle checks. Passing any of those remains separate from source and teaching review.
