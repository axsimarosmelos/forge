"""One topic-specific reading selection for every Python, C and C++ lesson."""
import json
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PY = 'https://docs.python.org/3/'
BEEJ = 'https://beej.us/guide/bgc/html/split/'
CPP = 'https://www.learncpp.com/cpp-tutorial/'
USACO = 'https://usaco.guide/'
refs = {}
def add(key, title, url, why, publisher):
    refs.setdefault(key, []).append({'title': title, 'url': url, 'why': why, 'publisher': publisher})
py = {
'hello': ('Numbers and variables', 'tutorial/introduction.html#numbers'),
'input': ('input() and integer conversion', 'library/functions.html#input'),
'if': ('if statements', 'tutorial/controlflow.html#if-statements'),
'loops': ('for loops and range()', 'tutorial/controlflow.html#for-statements'),
'lists': ('Lists and their operations', 'tutorial/datastructures.html#more-on-lists'),
'strings': ('Strings and indexing', 'tutorial/introduction.html#text'),
'functions': ('Defining functions', 'tutorial/controlflow.html#defining-functions'),
'counting': ('Dictionaries', 'tutorial/datastructures.html#dictionaries'),
'sorting': ('Sorting HOWTO', 'howto/sorting.html'),
'math': ('Integer arithmetic operators', 'reference/expressions.html#binary-arithmetic-operations'),
'binary': ('bisect: sorted-array search', 'library/bisect.html'),
'stack': ('Using lists as stacks', 'tutorial/datastructures.html#using-lists-as-stacks'),
'recursion': ('Function definitions and calls', 'tutorial/controlflow.html#defining-functions'),
'heap': ('heapq: priority queues', 'library/heapq.html'),
}
for key, (title, path) in py.items():
    add(key, title, PY+path, 'Read the exact language operation used in this lesson, then trace the Forge example.', 'Python documentation')
alg = {
'complexity': ('Time complexity and constraints', USACO+'general/time-complexity'),
'brute': ('Complete search', USACO+'bronze/intro-complete'),
'prefix': ('Prefix sums', USACO+'silver/prefix-sums'),
 'twopointers': ('Two pointers', USACO+'silver/two-pointers'),
'greedy': ('Introduction to greedy algorithms', USACO+'bronze/intro-greedy'),
'window': ('Sliding-window and two-pointer reasoning', USACO+'silver/two-pointers'),
'bfs': ('Breadth-first search', 'https://cp-algorithms.com/graph/breadth-first-search.html'),
'dfs': ('Depth-first search', 'https://cp-algorithms.com/graph/depth-first-search.html'),
'dp': ('Introduction to dynamic programming', 'https://cp-algorithms.com/dynamic_programming/intro-to-dp.html'),
'contest': ('How to practice effectively', USACO+'general/practicing'),
}
for key, (title, url) in alg.items():
    add(key, title, url, 'Focus on the invariant and complexity. Some reference examples use C++; Forge supplies the Python lesson.', 'USACO Guide' if 'usaco' in url else 'cp-algorithms')
add('bfs', 'collections.deque for a FIFO queue', PY+'library/collections.html#collections.deque', 'Use append and popleft to implement the queue in Python.', 'Python documentation')
add('recursion', 'Recursion', USACO+'bronze/complete-rec', 'Follow a complete call tree and identify the base case.', 'USACO Guide')
c = {
'c-start': ('Hello, World and compilation', 'hello-world.html'),
'c-io': ('Formatted input and output', 'file-inputoutput.html'),
'c-control': ('Variables, operators and flow control', 'variables-and-statements.html'),
'c-arrays': ('Arrays, bounds and pointers', 'arrays.html'),
'c-pointers': ('Pointers and dereferencing', 'pointers.html'),
'c-memory': ('Manual memory allocation', 'manual-memory-allocation.html'),
}
for key, (title, path) in c.items():
    add(key, title, BEEJ+path, 'A focused, beginner-oriented chapter from the author of Beej’s Guide to C.', 'Beej’s Guide to C')
add('c-arrays', 'Null-terminated strings', BEEJ+'strings.html', 'Connect the final zero byte to array capacity and safe input.', 'Beej’s Guide to C')
cpp = {
'cpp-start': ('Statements and program structure', 'statements-and-the-structure-of-a-program/'),
'cpp-io': ('cin, cout and endl', 'introduction-to-iostream-cout-cin-and-endl/'),
'cpp-control': ('for statements', 'for-statements/'),
'cpp-functions': ('Pass by lvalue reference', 'pass-by-lvalue-reference/'),
'cpp-sequences': ('std::vector and list constructors', 'introduction-to-stdvector-and-list-constructors/'),
}
for key, (title, path) in cpp.items():
    add(key, title, CPP+path, 'Step-by-step C++ instruction with small examples and common mistakes.', 'LearnCpp')
add('cpp-costs', 'Time complexity', USACO+'general/time-complexity', 'Translate input bounds into a feasible operation count.', 'USACO Guide')
add('cpp-costs', 'Fixed-width integers and size_t', CPP+'fixed-width-integers-and-size-t/', 'Check ranges and conversions before multiplication.', 'LearnCpp')
add('cpp-stl-fast-io', 'Fast input and output', USACO+'general/input-output', 'Contest input patterns, stream synchronization and flushing.', 'USACO Guide')
add('cpp-stl-fast-io', 'Introduction to standard library algorithms', CPP+'introduction-to-standard-library-algorithms/', 'Connect iterators to sort, find and standard containers.', 'LearnCpp')
add('cpp-stl-fast-io', 'Standard stream synchronization', 'https://eel.is/c++draft/ios.members.static', 'The precise standard contract behind sync_with_stdio.', 'C++ working draft')
native = json.loads((ROOT/'content/curriculum.json').read_text())
for module in native['modules']:
    for lesson in module['lessons']:
        if lesson['id'] not in refs:
            for url in lesson['source_urls']:
                add(lesson['id'], lesson['title']+' — reference', url, 'Study the derivation, invariant and complexity for this topic.', 'cp-algorithms')
for key, title, url in [
 ('tree-dp', 'DP on trees', USACO+'gold/dp-trees'),
 ('rerooting', 'DP on trees: all roots', USACO+'gold/all-roots'),
 ('trie', 'Constructing a trie', 'https://cp-algorithms.com/string/aho_corasick.html#construction-of-the-trie')]:
    refs[key] = []
    add(key, title, url, 'A focused chapter for this exact data structure or tree-DP technique.', 'USACO Guide' if 'usaco' in url else 'cp-algorithms')
python = json.loads(re.search(r'<script id="curriculum-data" type="application/json">(.*?)</script>', (ROOT/'frontend/base.html').read_text(), re.S)[1])
expected = {l['id'] for l in python['lessons']} | {l['id'] for m in native['modules'] for l in m['lessons']}
assert set(refs) == expected
(ROOT/'content/lesson-references.json').write_text(json.dumps({'version': 1, 'reviewedAt': '2026-09-15', 'selection': 'Topic match, beginner clarity, original authors and maintained documentation; these are curated recommendations rather than an objective universal ranking.', 'lessons': refs}, ensure_ascii=False, indent=2))
print('References:', len(refs), 'lessons')
