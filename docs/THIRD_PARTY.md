# Attribution and component boundaries

This kit’s code is MIT. Dependencies, models, fonts and media retain their own licenses. No model weights or commercial media are bundled.

## References that informed the design

- [mexicat/pdoom-video](https://github.com/mexicat/pdoom-video), MIT, commit `fa164b74fd0b26a99375715b619c55b4a0fb3d05`: deterministic browser-frame rendering, timing and easing conventions. This kit implements its own small scene/player runtime; it does not include the song, lyrics, characters or film assets.
- [paper-explainer](https://github.com/Z-ai-dAnwar/paper-explainer), MIT, commit `02cb2fc8c95b5b1301536ec3d1f0a78d06a56865`: reference for a simple narrated learning player and separate content/engine design.
- [video-production-skill](https://github.com/Aaryan-Kapoor/video-production-skill), MIT, commit `662738c012174788d860fdee9627239e23cffef6`: reference for durable jobs, agent-oriented helpers and production verification.
- [paper-videos](https://github.com/lucastononro/paper-videos), MIT, commit `d6523181715d2c18c7ed7a53cf1e92b3453d4082`: reference for work saved per beat and focused revisions.

These are design references, not copied workflow documents. No proprietary or noncommercial competitor source was incorporated. The kit does not depend on Remotion or a commercial rendering service.

## Runtime dependencies

- Playwright: Apache-2.0. Its browser binaries have their own notices and are installed separately.
- fflate: MIT. ZIP packaging uses the pinned local library; see [upstream](https://github.com/101arrowz/fflate).
- Ajv: MIT. Validates project JSON against the shipped schema before semantic checks. It is a CLI dependency and is not embedded in the player.
- esbuild: MIT. The native binary is selected by its package.
- Kokoro inference library and Kokoro-82M model: Apache-2.0. Model revision `f3ff3571791e39611d31c381e3a41a3af07b4987`; downloaded only during explicit setup. Python dependencies and the English tokenizer retain their respective notices.
- FFmpeg: external executable, not redistributed in this kit. Its build configuration determines applicable LGPL/GPL and codec terms. Inspect the actual distribution used for your deployment.

## Fonts and example material

Figtree and Newsreader are bundled for offline rendering under the SIL Open Font License. Full notices and fetched-file hashes are in `assets/fonts/`. The fonts are unmodified.

The original scripts, diagrams and generated speech in all bundled examples, including the LLM, Vietnamese and Erdős videos, are demonstration material under this repository’s MIT license. Referenced articles, papers and other source material retain their own rights. They do not contain private source records, copyrighted class readings, account information or third-party songs. User-provided sources and media remain the user’s responsibility to use appropriately.
