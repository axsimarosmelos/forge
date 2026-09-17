# Deep Practice: from transcript to learning behavior

Source: the user-supplied transcript of **“You can progress more in 6 minutes than you would in a month | Daniel Coyle”**, Big Think Clips. This document describes Forge's implementation choices. It does not independently verify the interview's anecdotes or numerical claims, and the transcript is not redistributed.

| Idea in the transcript | Forge behavior |
| --- | --- |
| Small chunks and slow fundamentals | One named chunk, one observable success criterion, and presets for traces, boundaries, and invariants. |
| Reach, notice a mistake, adjust, reach again | Each repetition records an attempt and evidence. Missed/guided repetitions require a gap and an adjustment; the next repetition explicitly retries that chunk. |
| Practice near the edge of ability | Coaching uses up to ten recent repetitions of the same chunk. It waits for five records before suggesting a stretch or simplification. |
| Ignition through a future self or model | A saved aspiration, model/example, and practice cue appear in the studio. |
| Observe and learn with others | Prompts to inspect worked examples, predict the next step, and record peer feedback or a borrowed technique. No fabricated community activity or automatic sharing. |
| Return to the work | Completed sessions produce a journal reflection and a recall prompt due in 24 hours. |

## Deliberate boundaries

- The default six-minute window is a focus aid. No “month of progress in six minutes,” measured intelligence, 37× improvement, or fixed-hour mastery claim is made.
- The 70–90% band is a product heuristic around the transcript's 80% suggestion. Guided repetitions are not clean repetitions. A clean retry shows a local repair, not delayed retention or transfer; tomorrow's recall is the next check.
- Observations and outcomes are self-reported. The existing Python/C/C++ execution workspaces remain the place to run tests. Practice repetitions cannot grant platform acceptance, change solved totals, or raise catalog difficulty bands.
- Help opened through the linked problem workspace is tracked through reloads. Forge cannot detect help used outside its own UI.
- The practice clock uses wall time across navigation/reloads. Pause it when taking a break. Time expiry pauses the clock and invites reflection without marking anything learned or completed.

## Implementation

`frontend/deep-practice-core.js` contains the clock, record validation, repair relationships and coaching rules. `frontend/deep-practice.js` adds the route, forms, motivation, notebook, and existing journal/review integration. CSS and scripts are embedded into the generated `index.html` by the established build pipeline. No new service or frontend dependency is required for GitHub Pages.

The optional `state.deepPractice` extension is validated on load/import. Existing backups without it remain valid. Saves and portable backups use Forge's current persistence path; reset clears the extension with the rest of progress. The notebook is capped at 200 sessions, each with at most 50 repetitions, to bound history. Existing storage warnings still apply if browser quota is exhausted. Export a backup before clearing saved history.

Run `npm run build && npm test`. `tests/deep-practice-browser.mjs` is exercised by `tests/browser-smoke.mjs` on Chromium and covers real forms, guided-help persistence, retry chains, timer expiry, mobile width, escaping, and backup/import/reset. Browser CI runs on pull requests and main pushes.
