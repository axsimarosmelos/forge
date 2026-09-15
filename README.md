# Forge

[Open your learning studio](https://axsimarosmelos.github.io/forge/)

A personal competitive-programming learning platform with Python, C and C++ tracks, practice links, a mistake journal and spaced recall.

## What's new

- **C and C++ foundations:** six complete lessons in each language, runnable examples, prerequisite checks and recall cards.
- **STL and fast I/O:** a complete original C++17 module, code templates and a worked practice problem.
- **Algorithm Atlas:** 78 advanced study plans across algebra, data structures, dynamic programming, strings, graphs and geometry. Each includes dependencies, correctness goals, complexity, pitfalls, practice and reference links.
- **Code lab:** Python/C17/C++17 selector, separate drafts and C/C++ syntax highlighting.
- **Execution backend:** authenticated Node.js API using a separately deployed Judge0 sandbox, with asynchronous jobs and fixed CPU, memory and output limits.

The expanded curriculum contains **91 topics: 13 complete lessons and 78 clearly labeled blueprints**. The original Python course remains available: 24 lessons, 104 Codeforces/LeetCode problem links, 54 lesson recall cards, a 40-day roadmap, mock contests and adaptive recommendations.

## Start learning

Open **Learn** and choose Python, C foundations, C++ foundations or Algorithm Atlas. New C/C++ lesson completions add cards to **Review**. Use **Code lab** to switch language. Choose one primary contest language while building fluency; C is optional for the C++ track.

Learning content is available immediately on GitHub Pages. **Native C/C++ execution needs a separately deployed compiler API and Judge0 service.** Until connected, study, edit and download code; the native Run button explains the missing connection. Python retains its optional browser runner. GitHub Pages cannot host the native backend.

## Implementation and content

1. [Execution architecture, API contract and deployment instructions](ARCHITECTURE.md)
2. [Complete Node.js backend](backend/server.mjs)
3. [Full curriculum JSON](content/curriculum.json)
4. [Complete STL and fast-I/O module](content/cpp-stl-fast-io.md)
5. [C/C++ templates](templates)
6. [Frontend language/editor integration](frontend/native.js)

## Keep your progress

Progress is saved in this browser with localStorage. It does not automatically sync across devices. Use **Settings → Export progress**, then import your backup when moving devices. Existing Python progress is preserved. C/C++ drafts and lesson progress are included in new backups; compiler credentials stay in tab memory and are excluded. Never commit progress backups or API secrets.

## Personalization and expectations

Python recommendations use prerequisites, practice outcomes, recall ratings and daily time/energy settings. The new C/C++ tracks use prerequisite readiness and share the review queue; they do not replace the Python daily roadmap yet. This is a rules-based learning system, not a live AI tutor or an official rating estimator. The advanced atlas is long-term reference material. Competition dates default to 20 and 40 days after initial setup and can be changed in Settings.

## Publish and edit

Pages publishes `main` → `/(root)` with `index.html` and `.nojekyll`. No server is needed to view the learning content. The optional Python runner loads Pyodide 0.27.7 from jsDelivr and needs internet access.

For source changes, use Node 24 and Python 3:

```sh
npm install
npm run build
npm test
```

Tests additionally need GCC and G++. Commit the rebuilt `index.html` and `content/curriculum.json`. The [architecture guide](ARCHITECTURE.md) documents the source layout, validation coverage, compiler hosting and remaining deployment checks.
