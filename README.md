# Explainframe

Make ideas clear with narrated, editable videos.

Give your coding agent a source, a question and an audience. Explainframe turns its script and visuals into an explainer with narration, captions and the files to revise it.

Use it to teach a concept, explain a product, walk through research, train a team or make the case for a decision. You direct the explanation. Your agent writes the script and scenes, runs the tools and handles revisions.

[Download and watch the examples](#watch-the-examples) · [Usage](docs/guides/using.md) · [Setup](docs/guides/tooling.md)

![The language-model example shows words becoming tokens and numeric representations.](examples/llm/poster.png)

## Watch the examples

The examples below use English narration and captions. The LLM video is the best place to start.

### What happens between your prompt and the next token?

https://github.com/user-attachments/assets/ed1d92a3-2593-42c2-af72-fe65ade96c94

### What is Erdős problem 643?

https://github.com/user-attachments/assets/2466875c-3b80-4193-b490-355eda3d3631

### Why does “you” change in Vietnamese?

https://github.com/user-attachments/assets/9eb92b84-f720-4816-a781-4d4aea395b68

On GitHub, choose **Code → Download ZIP**, extract the folder, then open `samples.html` in your browser. If you already cloned the repo, open that file in your checkout. The download includes all three videos, captions and interactive players. You do not need to install anything to watch them.

GitHub displays the HTML files as source. The [gallery](samples.html) and interactive links below play when you open them from the downloaded folder. You can also open each example’s `landscape.mp4` or `portrait.mp4` directly.

| Example | What it explains |
| --- | --- |
| [What happens between your prompt and the next token?](examples/llm/demo.html) | Tokens, context, probabilities and the generation loop. |
| [What is Erdős problem 643?](examples/erdos-643/demo.html) | The same six dots split into triples in two different ways. |
| [Why does “you” change in Vietnamese?](examples/vietnamese-address/demo.html) | How terms of address express relationships between speakers. |

## You bring the idea. Your coding agent handles setup.

You do not need to write code or install the tools yourself. Use a coding agent with file and terminal access, plus permission to install dependencies and run local programs. A text-only chat can help write a script, but cannot run video production by itself.

**What you do:**

- Give your agent this repository URL and ask it to clone the repo, or download the repo and open its folder in your coding agent.
- Provide the source or topic, who the explanation is for, and what you want back: a script, preview or finished video. Make sure the agent can read any source files or links.
- Approve installation or download requests if your environment requires them. Your agent cannot grant itself permissions or unlock a restricted computer.
- Review the explanation, pronunciation and pacing. Ask for changes, then keep the editable handoff with the finished video.

**What your agent handles:** checking installed tools, installing missing dependencies within your permissions, preparing narration, writing scenes, generating the requested output, running checks and making revisions. It should use the stage-specific [setup guide](docs/guides/tooling.md), fix ordinary setup problems and tell you precisely if the environment blocks something.

To check that the tools work before making your own video, give your agent this prompt:

> Read START-HERE.md and run the included LLM demo using its bundled speech. Handle the required setup and open the preview. Do not download a voice model or create new narration.

You should see a narrated explanation of how a language model generates its next token. This uses the included audio and tests the preview workflow.

Then give it your own topic:

> Use this repository to explain [source or topic] for [audience]. Read START-HERE.md, check my environment and handle the setup needed for the task. Ask for any required permissions. Start with a script and preview; do not render a video yet.

For a finished video in one pass, replace the last sentence with: “Make a short narrated video with captions and an editable handoff.”

## What could you explain?

| Use | Example brief |
| --- | --- |
| A concept or lesson | Show why cash flow can fall while profit rises. |
| Research or a technical idea | Walk through how attention combines information, with a small worked example. |
| A business or product | Explain how a marketplace earns money, or how an integration works. |
| A process or training task | Show how an expense moves from submission to approval. |
| A decision or a set of results | Compare two pricing choices, or explain what changed in a forecast. |
| Educational content | Make a short explanation for a class, workshop, newsletter or social post. |

These are example briefs, not prebuilt lessons. Explainframe works best with narrated diagrams, charts, comparisons, processes and worked examples. Screen recordings, character animation and cinematic footage need other tools or custom work.

## What can you start from?

A question, article, paper, spreadsheet, codebase, process description or script. Your agent needs access to read the material; Explainframe does not fetch or interpret it itself. A recording can supply narration if it has aligned word timings. Add a length, style or format if you have a preference.

## Revise the explanation

“The costs scene moves too slowly. Show the subtraction, keep the voice and make a vertical version too.”

Save a scene-specific note in the player, then copy or download it and give it to your agent. The player collects the request; your agent makes the edit. Keep the editable handoff so the next revision has the scenes, speech and sources to work from.

## What you get

- MP4 video, word-highlighted captions and SRT/VTT caption files.
- An HTML review player with transcript, sources, playback controls and revision notes.
- An editable ZIP with the project, scene code and speech.
- Portrait, landscape, square and 4:5 layouts.
- Local English narration with Kokoro, or your own recording with aligned timings.
- Three complete examples covering language-model generation, Erdős 643 and Vietnamese terms of address.

Examples link to their sources and identify simplified diagrams and fictional scenarios. Review the source interpretation, pronunciation, pacing and visuals before sharing your own explanation.

## What needs to be installed?

Your agent handles these steps; this is what it will need on the computer or execution environment running the job:

| Task | Requirements |
| --- | --- |
| Watch the included HTML example | A browser. No coding-agent account or tool installation needed. |
| Build a preview using bundled example speech | Node.js 22+, npm, FFmpeg and ffprobe. No Python or speech-model setup needed. |
| Render a video | The preview tools plus Chromium. |
| Generate new narration | Node.js tooling plus uv, Python 3.12, the pinned speech environment and Kokoro model files. Chromium is only needed for video rendering or still capture. |

We have tested production on macOS and a short export in a Debian Linux arm64 container. Windows and Linux x64 remain unverified. See [verification limits](docs/verification/README.md).

Initial dependency and model downloads need internet access. If setup needs administrator access or your computer blocks an installation, your agent should explain the specific step that needs your help. There is no fixed first-run completion time.

You do not need a separate speech API account, paid video editor or hosted rendering service. Your coding agent may have its own subscription or API costs. Developers can also use the CLI directly without an authoring agent.

Speech and rendering run locally after setup. Your authoring agent still has its own provider and data policy. Explainframe collects no telemetry and does not publish your work.

## Agents and contributors

Start with [START-HERE.md](START-HERE.md) and [AGENTS.md](AGENTS.md). [Authoring](docs/guides/authoring.md) covers the project format; [custom scenes](docs/guides/custom-scenes.md) covers the drawing API. Use custom scenes from sources you trust: they execute JavaScript.

Run `npm ci --ignore-scripts`, then `npm run verify` from the checkout. See [CONTRIBUTING.md](CONTRIBUTING.md) for checks and [verification limits](docs/verification/README.md) for limits. Automated checks do not establish viewer comprehension or time savings.

MIT code. Fonts, dependencies and models retain their own licenses; see [THIRD_PARTY.md](THIRD_PARTY.md).

## Repository layout

The [documentation index](docs/README.md) links the guides, design notes and verification record.

| Folder | Purpose |
| --- | --- |
| `bin/` | The `explain` command launcher. |
| `src/engine/` | The Node pipeline, checks and editable handoffs. |
| `src/player/` | The browser player, captions and scene drawing. |
| `src/voice/` | The offline Python narration worker. |
| `schemas/` | The project JSON contract. |
| `examples/` | Curated scenes, supplied narration and playable demos. |
| `tests/unit/`, `tests/integration/` | Unit tests and browser/pipeline checks. |
| `scripts/` | Repository verification and maintenance commands. |
| `skills/` | The canonical agent workflow; host adapters point here. |

Local settings and test output stay in ignored `.local/`. Node and Python dependencies stay in `node_modules/` and `.venv/`. Each authored project keeps its own `build/` and `dist/` outputs. These local folders do not belong in commits.
