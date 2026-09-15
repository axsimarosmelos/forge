# Catalogs and study workspaces

Forge publishes static metadata snapshots beside the app. The browser loads three catalog files and requests an editorial batch only when help is revealed. Personal code and notes stay separate.

## Provenance

| Content | Source | Stored content |
| --- | --- | --- |
| Codeforces | Official problemset.problems API | Public IDs, titles, links, ratings and tags; no Gym/private archive |
| AtCoder | Kenkoooo / AtCoder Problems datasets | Task metadata and estimated difficulty; missing estimates stay unrated |
| LeetCode | Doocs / leetcode community index | IDs, titles, difficulty, tags, Premium markers and source links |
| Videos | NeetCode creator-maintained data | 449 exact creator-maintained mappings plus separately recorded Codeforces/AtCoder selections; no copied transcripts or video |
| Community solutions | Doocs / leetcode, CC BY-SA 4.0 | Contributor solution sections; official Description sections excluded |
| Beginner briefs | Original Forge writing | 37 compact restatements, original examples and optional nudges |
| Lesson references | Python docs, Beej, LearnCpp, USACO Guide, cp-algorithms | Topic-specific links and selection reasons for all 115 lessons/topics |

See [NOTICE](content/catalog/NOTICE.md) and [licenses](licenses). Adapted Doocs entries retain their author, exact source URL, license and adaptation notice. HTML is escaped, Markdown rendering is restricted, and KaTeX uses trust:false. No upstream scripts execute during generation.

The community index may lag the live platform. Premium markers do not grant access. SQL/JavaScript/shell tasks are indexed and included in the default full-set goal, but need their own execution environments. Some solutions have code only. Empty headings/code fences are excluded. No universally best-video claim is made. Four additional selections are recorded in `content/selected-walkthroughs.json`, including a Japanese AtCoder contest broadcast labeled as such. Selection is based on source/title correspondence, not a full independent viewing of every video. Missing videos have an exact-task YouTube search and a place to save your personal choice.

## Refresh

Choose **GitHub → Actions → Refresh problem catalogs → Run workflow**. It also runs when its script/configuration changes. It also runs weekly on Monday at 06:17 UTC. **Reload catalog snapshots** in Forge reloads published files; it does not refresh upstream sources.

The workflow checks out licensed Doocs Markdown and fetches public metadata. AtCoder requests are spaced. Each failed source preserves its last valid snapshot; manifest.json records dates and errors. Successful refreshes commit static output for Pages. APIs can change and snapshot coverage is not a guarantee about private or future tasks.

For a local refresh with network access:

```sh
python3 scripts/sync_catalogs.py --editorial-root /path/to/doocs-leetcode
```

The source checkout must contain solution/*/*/README_EN.md. Its code is never executed.

## Planning and persistence

The catalog core owns calendar arithmetic, metadata/backup validation, unique solve counts, time budgets and difficulty rules. The study UI integrates them with the existing course and maps matching legacy task IDs without rewriting old records.

Workspaces retain separate Python/C/C++ code, input, expected output, personal task text, notes, optional video and last help time. Local testing does not mark official acceptance. Guided/stuck attempts join the existing recall scheduler.

Draft bodies use IndexedDB; small progress metadata retains the original localStorage key. Exports wait for hydration and include every active workspace. Import/reset selects a new generation, so old rows cannot resurrect discarded notes. Previous generations are ignored. Database failures show a backup warning and use original storage where possible. Progress remains local: export when moving devices.

## Validation

npm test covers backend limits/authentication, calendar edges, unique evidence and adaptation, readiness, safe metadata/media URLs, extraction, legacy frontend gates, backups and C/C++ examples. Chromium CI loads actual catalogs under a repository subpath, runs the Python worker, reloads drafts, checks guided recall, verifies mobile routes and exercises export/import/reset. Third-party availability and the separate native compiler remain service-dependent.

The solution extractor now retains Java, C#, Go, Rust, Kotlin, Swift and other available community code alongside the previous language subset on the next refresh. Existing snapshots are retained until that refresh. Loading a template is offered when its language matches a browser runner or a connected compiler runtime. SQL dialects are not silently treated as interchangeable.
