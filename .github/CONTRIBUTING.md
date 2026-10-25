# Contributing

Describe the problem, keep the change focused and record the checks you ran. Use the repository’s available review channel. Do not include credentials or private source material.

## Scope and responsibility

Keep a change focused on a concrete use case or reproduced failure. When changing a dense function, make the touched control flow readable; keep unrelated formatting out of the change. Discuss a large engine/framework change before implementing it. Small fixes and documentation corrections need no separate proposal ceremony. Preserve unrelated work and do not rewrite existing history merely to tidy it.

AI-assisted work is welcome. A responsible human remains accountable for the change, its verification and claims. Do not pretend a simulated agent review is human review, or report tests that were not run.

## Authorship and attribution

- **No AI authors or AI co-authors.** Do not add `Co-authored-by` or similar attribution for Claude, Codex, ChatGPT, Copilot or other AI agents. Do not append generated-with-AI promotional footers to commits or PRs.
- Use the actual responsible human's configured Git identity. Never invent another person's identity, email, contribution or approval.
- Genuine human co-authors may receive credit with their agreement. Preserve upstream copyright, license notices, font notices and required attribution. This policy does not erase third-party credit or conceal the kit's AI-assisted workflow.
- The message hook and verification command reject common AI/bot attribution patterns. They cannot prove the true identity behind an arbitrary name; the rule remains a contributor responsibility.

`AGENTS.md` and `CLAUDE.md` apply the same rule to coding agents. No global agent configuration or credentials are changed.

## Local checks

Use the setup appropriate to your host in [docs/guides/tooling.md](../docs/guides/tooling.md). From the kit root:

```text
npm ci --ignore-scripts
npm run verify
```

`verify` checks repository structure/links/JSON/pins, JavaScript syntax, Python syntax when available, Git message history when present, and the test suite. It does not synthesize speech or render video. FFmpeg/ffprobe are needed for the production fixture tests. This is not a TypeScript or ESLint check: the current codebase is JavaScript with its own targeted static audit.

For a prose-only change, `npm run lint` and a visual/readability check of changed documents are sufficient. For runtime, schema, timing or handoff changes, run `npm run verify` and the relevant behavioral tests. `npm run test:proofs` checks the technical examples in four layouts and relocated editable handoffs. Its optional `test:proofs:revision` follow-up synthesizes a changed scene and requires the local voice setup. `npm run test:direction` verifies the moving business example and portable scene replay without video. `npm run test:preview` exercises the browser player using existing speech without a video export. `npm run test:interrupt` exercises the actual render CLI and a frozen browser against a fake encoder that produces no media (POSIX hosts). `npm run test:browser` additionally exercises the player and a short export; use it when that scope changes, not for every typo. New voice/backend or rendering changes need their own relevant media evidence before being called verified.

To opt into the repository-local message hook:

```text
npm run hooks:install
```

The installer refuses to replace an existing hooks path. Preserve existing guard hooks and integrate this check if necessary. `npm ci` never installs hooks automatically. Verification and future CI also check messages because local hooks can be bypassed.

## Branches, commits and PRs

Use `codex/<short-description>` for agent-created branches. Commit subjects use `type(scope): concrete change`; types are `feat`, `fix`, `chore`, `docs`, `test`, `refactor`. Use an optional `!` and a `BREAKING CHANGE:` explanation for an incompatible interface change. Explain the reason in the body when it is not obvious. Doc-only commits use `[skip ci]` after local document checks.

Examples:

```text
fix(captions): retain the final spoken word
chore(repo): add contribution and message checks
docs(usage): explain the local entry point [skip ci]
```

PR titles use the same format. Lead the description with the concrete problem and resulting behavior. Record actual validation and material limits. A small PR can be two sentences; delete irrelevant template sections. Never describe a prototype as released, an unrun host as tested, or an AI review score as learner evidence. See [PR examples](../docs/guides/pr-examples.md).

Use a conventional final title when merging. Repository settings and publication require the maintainer’s authorization.

## Files and versions

Keep jobs, caches, virtual environments, models, credentials and personal source material out of commits. The curated synthetic demo packages are intentional small fixtures; arbitrary generated projects belong in ignored workspaces. Do not remove or regenerate the demo media for an unrelated change.

Pin runtime dependencies and update their lockfiles with the package manager. Keep CLI, Node package and Node lock versions consistent. The internal Python voice environment has its own version. Track changes in [CHANGELOG.md](../docs/CHANGELOG.md). The Node package is marked `private: true` to prevent accidental npm publication. The JSON project's `schemaVersion` is a separate interchange-contract version.

Keep license/component boundaries in [THIRD_PARTY.md](../docs/THIRD_PARTY.md) accurate. A permissive code license does not relicense models, fonts, external FFmpeg builds or user material.
