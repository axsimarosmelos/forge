import json, subprocess, re, sys
from pathlib import Path
r=Path(__file__).resolve().parents[1]
book=json.loads((r/'content/four-month-curriculum.json').read_text())
assert len(book['weeks'])==16
catalog={p['id']:p for path in (r/'content/catalog').glob('*.json') if path.name!='manifest.json' for p in json.loads(path.read_text())['problems']}
native={l['id'] for m in json.loads((r/'content/curriculum.json').read_text())['modules'] for l in m['lessons']}
python={l['id'] for l in json.loads(re.search(r'<script id="curriculum-data" type="application/json">(.*?)</script>',(r/'frontend/base.html').read_text(),re.S)[1])['lessons']}
for week in book['weeks']:
 for pid in week['problems']: assert pid in catalog,pid
 for lang,lessons in week['lessons'].items():
  for lesson in lessons: assert lesson in (python if lang=='python' else native),lesson
for pid,demo in json.loads((r/'content/solution-demos.json').read_text()).items():
 assert pid in catalog
 for case in demo['tests']:
  result=subprocess.run([sys.executable,'-I','-c',demo['source']],input=case['stdin'],text=True,capture_output=True,timeout=3)
  assert result.returncode==0,(pid,result.stderr)
  assert result.stdout==case['expected'],(pid,result.stdout,case['expected'])
# Exercise the exact tracer code with genuine CPython frames, recursion and shared references.
worker=(r/'frontend/python-worker.js').read_text();tracer=worker.split('const tracer=String.raw`',1)[1].split('`;',1)[0]
scope={};exec(tracer,scope)
program='a = [1, 2]\nb = a\na.append(3)\ndef total(n):\n    if n == 0: return 0\n    return n + total(n-1)\nanswer = total(3)\n'
exec("_sys.settrace(_forge_trace)\ntry:\n    exec(compile("+repr(program)+", '<forge-user>', 'exec'), {})\nfinally:\n    _sys.settrace(None)",scope)
steps=scope['_forge_steps'];assert len(steps)>10
assert any(len(s['frames'])>=3 for s in steps)
frame=next(f for s in steps for f in s['frames'] if 'b' in f['values'] and isinstance(f['values']['a'],dict))
assert frame['values']['a']['ref']==frame['values']['b']['ref']
assert any(s['event']=='return' and s.get('returnValue')=='6' for s in steps)
# Trace cap must not terminate normal execution.
exec(tracer,scope)
exec("_sys.settrace(_forge_trace)\ntry:\n    exec(compile('for i in range(500):\\n    x = i', '<forge-user>', 'exec'), {})\nfinally:\n    _sys.settrace(None)",scope)
assert len(scope['_forge_steps'])==300 and scope['_forge_overflow']
print('PASS: all weekly lesson/problem links, 19 runnable solutions and boundary tests, recursive stack trace, shared object identity and trace limits.')
