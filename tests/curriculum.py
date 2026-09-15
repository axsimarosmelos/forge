"""Validate the curriculum and compile only trusted repository-authored examples.
Never use this script to execute user submissions; those belong in Judge0.
Requires Python 3, GCC, G++, and a C++17 standard library.
"""
import json
import random
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'content/curriculum.json').read_text())
lessons = [l for m in data['modules'] for l in m['lessons']]
by_id = {l['id']: l for l in lessons}
assert len(by_id) == len(lessons) == 91
assert sum(l['content_status'] == 'complete' for l in lessons) == 13
visiting, visited = set(), set()
def visit(key):
    assert key in by_id, f'Missing prerequisite {key}'
    assert key not in visiting, f'Prerequisite cycle at {key}'
    if key in visited:
        return
    visiting.add(key)
    for dependency in by_id[key]['prerequisites']:
        visit(dependency)
    visiting.remove(key)
    visited.add(key)
for lesson in lessons:
    visit(lesson['id'])
    assert lesson['objectives'] and lesson['recall_cards']
    if lesson['content_status'] == 'blueprint':
        assert len(lesson['study_outline']) == 6
        assert lesson['complexity']['time'] and lesson['complexity']['extra_space']
        assert lesson['practice']['steps'] and lesson['source_urls']
    else:
        assert len(lesson['checks']) == 2

with tempfile.TemporaryDirectory(prefix='forge-trusted-tests-') as tmp:
    tmp = Path(tmp)
    def compile_code(source, name, lang):
        path = tmp / (name + ('.c' if lang == 'c' else '.cpp'))
        path.write_text(source)
        binary = tmp / name
        command = ['gcc' if lang == 'c' else 'g++', '-std=c17' if lang == 'c' else '-std=c++17', '-O2', '-Wall', '-Wextra', '-Werror', str(path), '-o', str(binary)]
        subprocess.run(command, check=True, capture_output=True, timeout=20)
        return binary
    def execute(binary, stdin):
        return subprocess.run([str(binary)], input=stdin, text=True, capture_output=True, check=True, timeout=3).stdout
    for lesson in lessons:
        if lesson['content_status'] != 'complete':
            continue
        binary = compile_code(lesson['code'], lesson['id'], lesson['language'])
        assert execute(binary, lesson.get('stdin', '')) == lesson['expected_output'], lesson['id']
    binaries = {}
    for template in (ROOT / 'templates').iterdir():
        binaries[template.stem] = compile_code(template.read_text(), template.stem, 'c' if template.suffix == '.c' else 'cpp')
    assert execute(binaries['c17-starter'], '7 12\n') == '19\n'
    assert execute(binaries['cpp17-starter'], '7 12\n') == '19\n'
    assert execute(binaries['stl-workbench'], '') == 'eights 2\nsum 25\nfrequency 2\nremaining twos 1\nideas 1\nminimum 3\nfirst 7\nfirst task 2\n'
    # An independent brute-force oracle catches duplicate and missing-threshold bugs.
    rng = random.Random(20260915)
    cases = [([0], [0, 1]), ([10, 10, 10], [0, 10, 11]), ([10**9], [0, 10**9])]
    cases += [([rng.randrange(30) for _ in range(rng.randrange(1, 60))], [rng.randrange(35) for _ in range(30)]) for _ in range(100)]
    for scores, queries in cases:
        stdin = f'{len(scores)} {len(queries)}\n' + ' '.join(map(str, scores)) + '\n' + '\n'.join(map(str, queries)) + '\n'
        expected = []
        for threshold in queries:
            qualifying = [score for score in scores if score >= threshold]
            expected.append(f'{len(qualifying)} {min(qualifying) if qualifying else -1}')
        actual = execute(binaries['scoreboard-thresholds'], stdin)
        assert actual == '\n'.join(expected) + '\n'

html = (ROOT / 'index.html').read_text()
embedded = json.loads(re.search(r'<script id="native-curriculum" type="application/json">(.*?)</script>', html, re.S)[1])
assert embedded == data, 'Rebuild index.html after curriculum changes'
assert '<template id="stl-article">' in html
print('PASS: 91 topics, acyclic prerequisites, complete/blueprint distinction, 13 executable lesson examples, 4 templates, 103 independent-oracle practice cases, and embedded curriculum consistency.')
