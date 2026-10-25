# Explainframe documentation

Start with [using Explainframe](guides/using.md). Agents should read the root [AGENTS.md](../AGENTS.md) before setup or production.

## Setup and use

- [Usage and requested outputs](guides/using.md)
- [Local tools and dependencies](guides/tooling.md)
- [Local and cloud hosts](guides/hosts.md)
- [Project authoring and schema](guides/authoring.md)

## Explanation design

- [Teaching guidance](guides/teaching.md)
- [Scene direction](guides/scene-direction.md)
- [Narration and pacing](guides/pacing.md)
- [Custom scene API](guides/custom-scenes.md)
- [Technical proof recipes](guides/technical-proofs.md)

## Architecture and development

- [System overview](design/overview.md)
- [Engine choice](design/engine-choice.md)
- [Contribution checks](../.github/CONTRIBUTING.md)
- [PR examples](guides/pr-examples.md)
- [Verification record and limits](verification/README.md)

- [Changelog](CHANGELOG.md)
- [Licenses and component notices](THIRD_PARTY.md)
- [Examples](../examples/README.md)

## Local artifacts

Integration checks write to `.local/test-results/`. Set `EXPLAINFRAME_TEST_OUTPUT` to an isolated directory when preserving a particular run. The output includes screenshots and test results.

Generated jobs stay in ignored `projects/` or another user-selected directory. Each job owns its `build/` cache and `dist/` delivery files. The repository's `examples/` folder retains the supplied media needed to run the curated examples offline.
