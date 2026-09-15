"""Refresh public problem METADATA and openly licensed community editorials.
Never request LeetCode statements, cookies, credentials, or private/premium content.
Optional --editorial-root points to a sparse checkout of doocs/leetcode.
"""
import argparse
import datetime as dt
import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'content/catalog'
RAW = 'https://raw.githubusercontent.com/'
SOURCES = {
    'leetcode': RAW + 'doocs/leetcode/main/solution/README_EN.md',
    'videos': RAW + 'neetcode-gh/leetcode/main/.problemSiteData.json',
    'database': RAW + 'doocs/leetcode/main/solution/DATABASE_README_EN.md',
    'javascript': RAW + 'doocs/leetcode/main/solution/JAVASCRIPT_README_EN.md',
    'codeforces': 'https://codeforces.com/api/problemset.problems',
    'atcoder': 'https://kenkoooo.com/atcoder/resources/problems.json',
    'atcoder_models': 'https://kenkoooo.com/atcoder/resources/problem-models.json',
}
NOW = dt.datetime.now(dt.timezone.utc).isoformat()

def fetch(url, maximum=20_000_000):
    request = urllib.request.Request(url, headers={'User-Agent': 'Forge-learning-catalog/3.0 (public metadata only)'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                raw = response.read(maximum + 1)
            if len(raw) > maximum:
                raise ValueError('Source exceeds size cap')
            return raw.decode('utf-8')
        except Exception:
            if attempt == 2:
                raise
            time.sleep(5)

def ids(text):
    return {int(x) for x in re.findall(r'^\|\s*(\d+)\s*\|', text, re.M)}

def leetcode(index, video_text, database='', javascript=''):
    video_rows = json.loads(video_text)
    videos = {int(re.match(r'\d+', v.get('code', '')).group()): v for v in video_rows if re.match(r'\d+', v.get('code', ''))}
    db, js = ids(database), ids(javascript)
    output = []
    pattern = r'^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.*?)\s*\|\s*(Easy|Medium|Hard)\s*\|\s*(.*?)\s*\|'
    for match in re.finditer(pattern, index, re.M):
        number, title, path, tags, difficulty, remark = match.groups()
        number = int(number)
        video = videos.get(number)
        slug = video['link'].rstrip('/') if video else ''
        row = {'id': f'lc-{number}', 'platform': 'LeetCode', 'number': number, 'title': title,
               'url': f'https://leetcode.com/problems/{slug}/' if slug else f'https://leetcode.com/problemset/?search={number}',
               'directUrlVerified': bool(slug), 'reference': 'https://github.com/doocs/leetcode/blob/main' + path,
               'difficulty': difficulty, 'rating': None, 'tags': re.findall(r'`([^`]+)`', tags),
               'premium': '🔒' in remark, 'kind': 'sql' if number in db else 'javascript' if number in js else 'shell' if number in (192, 193, 194, 195) else 'algorithm'}
        if video and re.fullmatch(r'[\w-]{11}', video.get('video', '')):
            row.update(video={'id': video['video'], 'creator': 'NeetCode', 'source': 'https://github.com/neetcode-gh/leetcode/blob/main/.problemSiteData.json',
                              'selection': 'Creator-maintained problem-to-video mapping. English explanations with diagrams and code; not individually reviewed in full.', 'checked': NOW},
                       pattern=video.get('pattern', ''), neetcode150=bool(video.get('neetcode150')))
        output.append(row)
    if len(output) < 1000:
        raise ValueError('LeetCode source is incomplete; keeping previous snapshot')
    return output

def codeforces(text):
    obj = json.loads(text)
    if obj.get('status') != 'OK':
        raise ValueError('Codeforces API failed')
    output = []
    for p in obj['result']['problems']:
        if not isinstance(p.get('contestId'), int) or not re.fullmatch(r'[A-Za-z0-9]+', str(p.get('index', ''))):
            continue
        rating = p.get('rating')
        output.append({'id': f"cf-{p['contestId']}-{p['index']}", 'platform': 'Codeforces',
                       'number': f"{p['contestId']}{p['index']}", 'title': p['name'],
                       'url': f"https://codeforces.com/problemset/problem/{p['contestId']}/{p['index']}",
                       'difficulty': str(rating) if rating is not None else 'Unrated', 'rating': rating,
                       'tags': p.get('tags', []), 'kind': 'algorithm', 'premium': False})
    if len(output) < 1000:
        raise ValueError('Codeforces response is incomplete')
    return output

def atcoder(text, model_text):
    problems, models = json.loads(text), json.loads(model_text)
    output = []
    for p in problems:
        if not re.fullmatch(r'[\w-]+', p.get('id', '')) or not re.fullmatch(r'[\w-]+', p.get('contest_id', '')):
            continue
        raw = models.get(p['id'], {}).get('difficulty')
        # Display transformation used by AtCoder Problems; these are estimates, not official ratings.
        import math
        rating = round(400 * math.exp((raw - 400) / 400)) if raw is not None and raw < 400 else round(raw) if raw is not None else None
        output.append({'id': 'at-' + p['id'], 'platform': 'AtCoder', 'number': p.get('problem_index', p['id']),
                       'title': p.get('name') or p.get('title') or p['id'], 'contest': p['contest_id'],
                       'url': f"https://atcoder.jp/contests/{p['contest_id']}/tasks/{p['id']}",
                       'difficulty': str(rating) if rating is not None else 'Unrated', 'rating': rating,
                       'ratingSource': 'AtCoder Problems estimate', 'tags': [], 'kind': 'algorithm', 'premium': False})
    if len(output) < 1000:
        raise ValueError('AtCoder response is incomplete')
    return output

def write_catalog(name, problems, source, coverage):
    if len({p['id'] for p in problems}) != len(problems):
        raise ValueError('Duplicate catalog IDs')
    OUT.mkdir(parents=True, exist_ok=True)
    content = {'version': 1, 'platform': problems[0]['platform'], 'fetchedAt': NOW, 'source': source, 'coverage': coverage, 'problems': problems}
    target = OUT / (name + '.json')
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(content, ensure_ascii=False, separators=(',', ':')))
    temporary.replace(target)
    return content

def extract_editorial(markdown, problem_id):
    # Only the community's explicitly marked solution sections. Never include Description.
    sections = re.findall(r'<!-- solution:start -->(.*?)<!-- solution:end -->', markdown, re.S)
    solutions = []
    for section in sections:
        parts = section.split('<!-- tabs:start -->', 1)
        explanation = re.sub(r'<!--.*?-->', '', parts[0], flags=re.S).strip()
        # Client renders source text through a restricted, escaping formatter.
        codes = []
        if len(parts) > 1:
            for m in re.finditer(r'####\s+([^\n]+)\s*\n+```([^\n]*)\n(.*?)```', parts[1], re.S):
                label, lang, code = m.groups()
                if code.strip() and label.strip() in ('Python3', 'Python', 'C++', 'C', 'Java', 'C#', 'Go', 'Rust', 'Kotlin', 'Swift', 'Ruby', 'PHP', 'Scala', 'Dart', 'Elixir', 'Erlang', 'Racket', 'MySQL', 'PostgreSQL', 'JavaScript', 'TypeScript', 'Bash'):
                    codes.append({'language': label.strip(), 'code': code.strip()})
        prose = re.sub(r'^#+[^\n]*', '', explanation, flags=re.M).strip()
        if len(prose) >= 30 or codes:
            solutions.append({'explanation': explanation[:40000], 'codes': codes})
    if not solutions:
        return None
    match = re.search(r'^#\s+\[[^\n]+\]\((https://leetcode\.com/problems/[a-z0-9-]+/?)\)', markdown, re.M)
    return {'id': problem_id, 'author': 'Doocs / leetcode contributors', 'license': 'CC-BY-SA-4.0',
            'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/', 'solutions': solutions[:5],
            'officialUrl': match.group(1) if match else None,
            'adaptation': 'Extracted solution prose and selected language templates; official statement excluded. Formatting simplified; no correctness certification.'}

def editorials(checkout, problems):
    import urllib.parse
    target = ROOT / 'content/editorials'
    target.mkdir(parents=True, exist_ok=True)
    batches, written = {}, 0
    for p in problems:
        rel = urllib.parse.unquote(p['reference'].split('/blob/main/', 1)[1])
        candidate = (checkout / rel).resolve()
        if not candidate.is_relative_to(checkout.resolve()) or not candidate.is_file():
            continue
        editorial = extract_editorial(candidate.read_text(), p['id'])
        if not editorial:
            continue
        editorial['sourceUrl'] = p['reference']
        if editorial.get('officialUrl'):
            p['url'] = editorial['officialUrl']
            p['directUrlVerified'] = True
        batch = str(p['number'] // 100).zfill(2)
        p['editorialBatch'] = batch
        batches.setdefault(batch, {})[p['id']] = editorial
        written += 1
    for batch, content in batches.items():
        (target / f'lc-{batch}.json').write_text(json.dumps(content, ensure_ascii=False, separators=(',', ':')))
    return written

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--editorial-root', type=Path)
    args = parser.parse_args()
    errors = []
    for name in ('leetcode', 'codeforces', 'atcoder'):
        try:
            if name == 'leetcode':
                problems = leetcode(fetch(SOURCES[name]), fetch(SOURCES['videos']), fetch(SOURCES['database']), fetch(SOURCES['javascript']))
                if args.editorial_root:
                    print('Licensed community editorials:', editorials(args.editorial_root, problems))
                coverage = 'Community index snapshot. New, premium and retired problems may differ from the live platform. Official statements/tests are not mirrored.'
            elif name == 'codeforces':
                problems = codeforces(fetch(SOURCES[name]))
                coverage = 'Full public problemset.problems response at refresh time. Gym/private tasks and future additions are outside this snapshot.'
            else:
                text = fetch(SOURCES[name]); time.sleep(1.2)
                problems = atcoder(text, fetch(SOURCES['atcoder_models']))
                coverage = 'AtCoder Problems public dataset at refresh time; community coverage and estimated difficulties, not an official complete archive guarantee.'
            write_catalog(name, problems, SOURCES[name], coverage)
            print(name, len(problems))
        except Exception as error:
            errors.append(f'{name}: {type(error).__name__}: {error}')
    summary = {'updatedAt': NOW, 'catalogs': {}, 'errors': errors}
    for path in OUT.glob('*.json'):
        if path.name == 'manifest.json': continue
        data = json.loads(path.read_text())
        if not isinstance(data, dict) or 'problems' not in data: continue
        summary['catalogs'][path.stem] = {'count': len(data['problems']), 'fetchedAt': data['fetchedAt'], 'coverage': data['coverage'],
                                        'videos': sum(bool(p.get('video')) for p in data['problems']), 'editorials': sum(bool(p.get('editorialBatch')) for p in data['problems'])}
    (OUT / 'manifest.json').write_text(json.dumps(summary, indent=2))
    for error in errors: print(error)
    # Partial source outages keep the last valid snapshot and are made visible in manifest.
    if not summary['catalogs']: raise SystemExit(1)

if __name__ == '__main__':
    main()
