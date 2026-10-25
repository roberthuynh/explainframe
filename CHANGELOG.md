# Changelog

## 0.2.0 (unreleased)

- Organize the engine, browser player and voice worker under `src/`; group schemas, documentation and tests by purpose.
- Keep integration check output in `.local/test-results/`, with an `EXPLAINFRAME_TEST_OUTPUT` override for isolated runs.
- Narrated browser scenes, word-highlighted captions and four export layouts.
- Review player with transcript, source context, text descriptions and revision notes.
- Editable ZIP handoffs with bundled speech, scene modules and component notices.
- Stage-specific checks, input fingerprints and per-scene reuse for revisions.
- Business, counting, geometry, attention and KV-cache templates.
- Layout checks for reported text bounds, intersections and phone scale.

Schema version 1 describes the project format. Prepared files from version 0.1 must be rebuilt. Node package publication is disabled with `private: true`.
