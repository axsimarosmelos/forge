# Forge

[Open your learning studio](https://axsimarosmelos.github.io/forge/)

A personal competitive-programming studio with Python, C and C++ lessons, a searchable problem library, a four-month learning plan and spaced recall.

## Start here

1. **Learn**: choose one language. All **115 lessons/topics** have specific references and a Python Tutor visualization button. Python has 24 lessons; C/C++ has 13 complete lessons and 78 advanced algorithm blueprints, clearly labeled.
2. **Four-month plan**: set your start date, language and daily time budget. The end is four calendar months later. Original 20/40-day competition preparation remains in its own tab.
3. **Problem library**: search LeetCode, Codeforces and AtCoder by title, ID and tags; filter difficulty, progress, selected videos and community solutions.
4. **Problem workspace**: write code, run your chosen input, watch a selected walkthrough, reveal solutions, save notes and record an honest attempt.
5. **Review**: retrieve the idea from memory, rate your recall and revisit it later. Turn problem notes into recall cards.

## Current coverage

The September 15, 2026 snapshot indexes **4,055 LeetCode, 11,401 Codeforces and 9,532 AtCoder tasks**. It includes **449 creator-maintained NeetCode video mappings**, **4,052 licensed Doocs community solution entries** (prose and/or code), and **37 original Forge beginner briefs with original examples**. These are source snapshots, not a guarantee of every private, premium, retired or newly published task.

Official statements and hidden judge tests are not mirrored. Each workspace has an official link and space for your own permitted study text. A brief is a compact restatement, not the complete official constraints. Community content retains its attribution and license. Some tasks have code templates without prose; missing videos and explanations are labeled. Selected video mappings have not all been individually reviewed in full. See [catalog sources and refresh instructions](CATALOGS.md).

## Personalization

The plan counts distinct independently solved LeetCode tasks and calculates the remaining daily pace. The default full-set goal includes SQL, JavaScript, shell and Premium-marked tasks; those may need additional environments or access. The daily queue respects your time budget and prerequisites even when the full-set target would need more time.

Codeforces starts around 800; AtCoder starts in its lowest estimated band. Four independent solves within 45 minutes out of five distinct nearby tasks raise the band by 100. Three stuck results lower it, down to the starting floor. Repeating one task and solving unrated tasks do not inflate numeric evidence. LeetCode unlocks Medium after ten distinct independent Easy solves, and Hard after thirty independent Medium solves. These are local learning rules, not official ratings or an AI tutor.

Revealing an explanation or video makes the current attempt guided, including after reload. Helped/stuck attempts create next-day recall cards. Original course recommendations also use quiz mistakes, prerequisites, recall and daily energy.

## Execution and progress

Python runs in a dedicated browser worker using Pyodide 0.27.7, loaded from jsDelivr. Workspace tests have a ten-second execution deadline and distinguish output from runtime errors. They test your chosen input, not platform hidden tests; outcomes remain self-reported. Python Tutor and YouTube load when requested and are third-party services.

**Native C/C++ execution needs the separately hosted compiler API and Judge0 service.** GitHub Pages hosts the frontend and cannot run this backend. Until connected, study, edit, visualize and download code. Tokens remain in tab memory. See [execution architecture and deployment](ARCHITECTURE.md).

Progress stays on this browser/device. Lesson/attempt metadata uses localStorage; larger drafts and notes use IndexedDB. **Settings → Export progress** includes both in one portable JSON backup. Import replaces active progress; reset starts fresh. Clearing browser data can remove progress. Hosting does not add cloud synchronization. Do not commit personal backups or API secrets.

## Development

Use Node 24, Python 3, GCC and G++:

```sh
npm install
npm run build
npm test
python3 -m http.server 8000
```

Open the HTTP-served site; file URLs do not load catalog JSON. Commit rebuilt index.html plus generated curriculum, references and briefs. GitHub Pages publishes main / repository root. Catalog/editorial JSON loads separately.

- [Curriculum JSON](content/curriculum.json) and [complete STL module](content/cpp-stl-fast-io.md)
- [Lesson references](content/lesson-references.json) and [original task briefs](content/problem-briefs.json)
- [Planning rules](frontend/catalog-core.js), [study UI](frontend/study.js), [draft persistence](frontend/workspace-storage.js)
- [Native editor](frontend/native.js), [backend](backend/server.mjs), [templates](templates)
- [Chromium checks](.github/workflows/browser-checks.yml): catalog rendering, Python execution, IndexedDB reload, mobile sizing and backup/import/reset
