# Commits and review descriptions

These are templates, not existing GitHub PRs. Replace verification placeholders with what actually happened. No PR is opened or posted by these examples.

## Documentation change

Title: `docs(usage): distinguish local setup from hosted installation`

Description:

> The setup guide now separates viewing the example from generating new speech. It lists the tools needed for each. Validation: record the local-link check and its actual result.

Only claim that check after running it. A docs-only commit may add `[skip ci]`; the PR title can stay concise.

## Runtime fix

Title: `fix(checks): detect changed scene dependencies`

Description:

> Changing an imported drawing module could leave the old video marked current. Checks now compare the prepared/export receipt with the actual transitive input fingerprint and require a refresh after an edit.
>
> Validation: record the regression command and result, plus relevant existing/new browser or export evidence. State any host that was not tested.

## Meaningful feature

Title: `feat(review): add changed-case questions`

Description:

> Viewers can predict a changed example, reveal the answer and replay its explanation. The prompt, answer and limitation remain in the editable handoff; responses are not uploaded or scored as learning outcomes.
>
> Validation: record reveal/replay, bundle-retention and responsive-layout results. This interaction does not establish a learning benefit.

Use the final behavior to write the title and description. Remove abandoned approaches, tool-brand footers, fabricated results and unrelated cleanup from the review narrative. Preserve real human and third-party credit where it belongs.
