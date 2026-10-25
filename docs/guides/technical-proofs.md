# Technical proofs, and how to reuse them

These examples show how to connect narration, calculations and drawings. The examples include narration, measured word timings, text alternatives, a changed case and a learner question. No proprietary studio material or creator assets are included.

## Ask your agent

“Use this checkout to explain a matrix as a transformation. Start from the geometry template, keep the basis arrows identifiable, show a changed input, and deliver a preview.”

“Use the attention template to explain how query/key matching creates a weighted blend. Keep it a toy example and show what changes when only the query changes.”

The actual commands, from the kit root:

```text
node bin/explain.mjs new --template geometry --path projects/my-geometry
node bin/explain.mjs preview --project projects/my-geometry
node bin/explain.mjs new --template attention --path projects/my-attention
node bin/explain.mjs preview --project projects/my-attention
```

Templates include the original audio. A copied example previews without Python. Changing narration requires the configured local voice environment or matching imported speech. Read the returned JSON for the review file. For an authorized video, follow with `render --project ... --formats portrait,landscape,square,feed --quality final`, then `check --target video` and `bundle` with the same project. Do not infer video permission from a preview request.

## What each example teaches

**Geometry:** A=[[1,1],[0,1]] sends (x,y) to (x+y,y). Gold and green matrix columns match the right/up basis arrows; the blue vector is their unchanged linear combination. The grid, current matrix and vector update from one operation. Start at (1,1), end at (2,1), then try (1,2), ending at (3,2). A ghost retains the original. Intermediate A(t) describes the illustrated shear, not a false claim that the final A produced a half-finished result. The grid domain includes all planned inputs/endpoints and stays fixed throughout the lesson. The authored layout bounds coordinates to ±20; larger or denser scenes need another layout and checks.

**Attention:** q=(2,0), K=[[1,0],[0,1]], V=[[2,0],[0,4]]. Compute Kq/√2, then softmax, then the weighted values. Weights are about (0.80443,0.19557); output is about (1.60886,0.78228). Changing only q to (0,2) reverses the weights and gives (0.39114,3.21772). Full precision drives geometry and calculations; visible decimals are approximate. The weight bars reveal known results before the mix; their partial reveal is not a normalized intermediate distribution. During the changed-query sweep, the whole operation is recomputed, not independently interpolated. This is one unmasked attention head, not a complete model or a causal explanation of token importance.

The primary references are [3Blue1Brown's basis-vector explanation](https://www.3blue1brown.com/lessons/linear-transformations/) and [Vaswani et al., section 3.2.1](https://arxiv.org/html/1706.03762v7), read October 23, 2026. Source principles are credited; numeric examples, scenes and audio are authored here.

## The small reusable operation contract

[src/player/operations.mjs](../../src/player/operations.mjs) supplies `matvec(matrix, vector)`, stable `softmax(scores)`, `attention(query, keys, values, {mask})`, `maskedSoftmax(scores, mask)`, `lerp(a,b,progress)` and `between(time,cue,start,end)`. Operations are pure, reject invalid dimensions/nonfinite inputs, and never advance their own clocks. They do not certify a script or choose a pedagogically useful picture.

`between` resolves both endpoints from real speech and rejects a reversed/zero-length interval. A cue can be a word or `{word, occurrence, edge}`; repeated words need an explicit occurrence. Missing cues fail through the normal cue resolver. Keep values, geometry and displayed equations derived from the same state function. Keep the mathematical invariant separate from the reveal fraction.

Use the geometry and attention `scenes/lesson.mjs` files as bounded recipes. Their layouts still need authored judgment; they are not general symbolic algebra, arbitrary tensor diagrams or a Manim replacement. The attention layout is specifically two positions with two-component keys/values. Changing dimensions requires revising its labels/layout and tests.

## Revision and handoff

Templates bundle scene dependencies into readable project-local modules, so a job can live outside the kit folder. ZIP handoffs preserve one shared module per original module rather than splitting it into separate minified copies for every scene. Exports keep named operations, and required legal notices remain. The standalone player is still compact; it is not the editing surface.

Direction notes travel through the existing explicit `sources[].file` plus `includeInBundle: true` contract. An unrelated local document is never copied automatically. The two templates explicitly include their original direction notes. Review them alongside project.json and the scene module when revising.

A quantity revision requires updating affected narration, descriptions, source notes and expected answers, not just the picture. Tests exercise a relocated geometry ZIP with input (4,2), output (6,2), and two changed narration scenes (prediction and answer). They also change visual styling in both relocated examples with Python unavailable, preserving supplied speech. This is an automated same-session revision, not independent-agent usability or an effort benchmark.

## What the checks establish

`npm run test:proofs` requires a browser and supplied audio, but no synthesis or video. It checks every frame in four formats for equations, weights, fixed-scale geometry, plot containment, text intersections, reverse scrubbing and portable revision, and captures review frames plus a 430×932 phone emulation. `npm run test:proofs:revision` depends on the geometry handoff produced by `test:proofs` and the existing local Kokoro setup; it synthesizes the two affected scenes. `npm run verify` includes pure operation and copied-template tests without synthesis.

Inspect actual images and motion as well. Receipts only test declared geometry; they cannot judge whether a learner understands the argument. Actual MP4 checks cover full decode, dimensions, frames and audio/video duration. They do not independently certify acoustic alignment or pronunciation.

## Cache showcase and the next reusable pieces

Use `new --template cache` for the original one-layer KV-cache example. Four position-aware input vectors and nonidentity projection matrices produce real keys and values. Appending retains prior pairs; a query at position three excludes the fourth position; query four recomputes scores and weights. The visible cached/full comparator runs two separate code paths. A prefix edit demonstrates that stale reuse is wrong and rebuilding matches the fresh reference. The recipe explicitly supports four two-component inputs and rejects other dimensions until its layout and narration are revised.

The primary references are the attention paper above and [Transformers' caching explanation](https://huggingface.co/docs/transformers/main/cache_explanation), read October 23, 2026. This illustrates K/V reuse in autoregressive inference. It is not a complete model, measured speedup or memory benchmark. Fixed position information is already included in the toy inputs. Real multilayer prefix edits can require suffix rebuilding across layers; the one-layer repair must not be generalized.

A boolean `mask` has one entry per score and at least one included position. Excluded positions get zero weight and do not enter normalization. Invalid masks fail. Input scores stay finite for auditing; the implementation normalizes only included scores, equivalent to excluding forbidden logits before softmax. Never multiply a forbidden score by zero and then normalize it with the others.

`npm run test:cache` checks actual cache frames and four layouts, phone type, prediction hold, unchanged saved states, displayed blocked position, full/cached equality and counters, and creates an editable handoff. Unit tests independently calculate the full-prefix reference without the shared math helper, compare every append and prove that changed-prefix stale reuse differs. `node tests/integration/attention-revision.mjs` changes keys and values in a portable template and checks real browser labels and output while Python is unavailable. `npm run check:scenes` is the reusable layout check described in [scene direction](scene-direction.md).

