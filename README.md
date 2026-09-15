# Forge

Website address: [Open Forge](https://axsimarosmelos.github.io/forge/)

A personal competitive-programming learning studio, starting with basic Python.

## What is included

- 24 lessons with original explanations, worked examples, and recall checks.
- 104 curated Codeforces and LeetCode problem links.
- 54 lesson recall cards, custom cards, and a simple spaced-review scheduler.
- A 40-day roadmap, adaptive recommendations, and daily time and energy settings.
- A mistake journal, timed practice contests, and an optional Python scratchpad.

## Publish with GitHub Pages

1. Keep `index.html` and `.nojekyll` in the repository root on `main`.
2. Open repository **Settings → Pages**.
3. Choose **Deploy from a branch**, branch **main**, folder **/(root)**, then **Save**.
4. Use the published website address shown in Pages settings once deployment completes.

GitHub's instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

No npm install, build server, API key, or application backend is needed.

## Keep your progress

Progress is stored in the current browser with localStorage. It is not uploaded to GitHub and does not sync between devices. In Forge, use **Settings → Export progress** regularly. Import that JSON backup when changing devices or moving from a downloaded copy to the hosted website. Do not commit progress backups to the repository.

## Python scratchpad

The optional runner loads Pyodide 0.27.7 from jsDelivr using a web worker. It requires an internet connection and browser support. The rest of the app works independently of that download. Submit real problem solutions on Codeforces or LeetCode; the scratchpad is not a hidden-test judge.

## Personalization

Recommendations use built-in rules based on prerequisites, problem outcomes, recall ratings, and time and energy settings. This is not a live AI tutor or an official Codeforces rating estimator. Competition dates default to 20 and 40 days after initial setup and can be changed in Settings.

## Editing and validation

The entire website is in `index.html`: style, lesson data, and application JavaScript. The first version passed JavaScript syntax and application-logic checks, and all 24 Python lesson examples ran successfully. Browser visual/interaction testing and the externally loaded Python runner have not been verified in the creation environment.
