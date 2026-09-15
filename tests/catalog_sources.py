import importlib.util
import json
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sync', ROOT / 'scripts/sync_catalogs.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

class SourcesTest(unittest.TestCase):
    def test_statement_is_excluded_and_math_is_preserved(self):
        text = '''# [1. Example](https://leetcode.com/problems/two-sum)
<!-- description:start -->DO NOT COPY THIS STATEMENT<!-- description:end -->
<!-- solution:start -->
### A method
Keep x < n while y > 0.
<!-- tabs:start -->
#### Python3
```python
print(1)
```
#### Java
```java
class Example {}
```
<!-- tabs:end -->
<!-- solution:end -->'''
        result = sync.extract_editorial(text, 'lc-1')
        encoded = json.dumps(result)
        self.assertNotIn('DO NOT COPY', encoded)
        self.assertIn('x < n while y > 0', encoded)
        self.assertEqual(result['solutions'][0]['codes'], [{'language': 'Python3', 'code': 'print(1)'}, {'language':'Java','code':'class Example {}'}])
        self.assertEqual(result['officialUrl'], 'https://leetcode.com/problems/two-sum')
        self.assertIsNone(sync.extract_editorial('## Description\nprivate content', 'lc-2'))
        self.assertIsNone(sync.extract_editorial('<!-- solution:start -->### Solution 1\n<!-- tabs:start -->\n#### Python3\n```python\n\n```\n<!-- solution:end -->', 'lc-3'))

    def test_catalog_distinguishes_premium_sql_and_verified_videos(self):
        text = '\n'.join(f'| {i} | [Example {i}](/solution/0000-0099/{i}.Example/README_EN.md) | `Array` | Easy | 🔒 |' for i in range(1, 1002))
        video = json.dumps([{'code': '0001-test', 'link': 'example/', 'video': 'abcdefghijk', 'pattern': 'Arrays'}])
        result = sync.leetcode(text, video, database='| 2 | SQL |')
        self.assertTrue(result[0]['premium'])
        self.assertEqual(result[0]['video']['id'], 'abcdefghijk')
        self.assertEqual(result[1]['kind'], 'sql')
        self.assertFalse(result[1]['directUrlVerified'])
        self.assertNotIn('video', result[1])
        with self.assertRaises(ValueError): sync.leetcode('', '[]')

    def test_rating_does_not_use_contest_points(self):
        problems = [{'contestId': i, 'index': 'A', 'name': 'Example', 'points': 500, 'tags': []} for i in range(1001)]
        result = sync.codeforces(json.dumps({'status': 'OK', 'result': {'problems': problems}}))
        self.assertIsNone(result[0]['rating'])
        self.assertEqual(result[0]['difficulty'], 'Unrated')
        with self.assertRaises(ValueError): sync.codeforces('{"status":"FAILED"}')

    def test_atcoder_ids_and_estimated_rating(self):
        rows = [{'id': f'abc{i}_a', 'contest_id': f'abc{i}', 'name': 'Example'} for i in range(1001)]
        result = sync.atcoder(json.dumps(rows), json.dumps({'abc0_a': {'difficulty': 0}}))
        self.assertEqual(result[0]['rating'], 147)
        self.assertIsNone(result[1]['rating'])
        self.assertEqual(result[0]['url'], 'https://atcoder.jp/contests/abc0/tasks/abc0_a')

if __name__ == '__main__': unittest.main()
