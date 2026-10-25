# Verification

Run `npm ci --ignore-scripts` and `npm run verify` from the checkout. FFmpeg and ffprobe must be installed. Verification checks repository links and pins, JavaScript and Python syntax, commit messages when Git history exists, and automated tests. It does not download models or render videos.

Browser checks are separate: `npm run test:preview`, `npm run test:direction`, `npm run test:proofs` and `npm run test:cache`. These use bundled speech. `npm run test:browser` renders a short video; `npm run test:proofs:revision` generates speech and needs the voice environment.

The included player uses bundled synthetic speech. Model-duration word timings are not independently measured acoustic alignment. Layout checks cover reported text and geometry, not every possible custom canvas mark. Phone emulation is not a physical-device test.

Windows, Linux x64, screen-reader use and execution in every supported agent host remain unverified. No measured human comprehension, expert parity, author-effort savings or adoption result is claimed.

Review each new explanation against its sources, listen to its speech and inspect every requested layout. Keep the editable project and verification results with the delivered output.
