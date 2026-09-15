// Each run gets a fresh worker. Stop/deadline terminates the entire runtime.
import {loadPyodide} from 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs';
const runtime=loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});
const tracer=String.raw`
import sys as _sys, json as _json
_forge_steps = []
_forge_overflow = False
_forge_total = 0

def _forge_value(value, depth=0, seen=None):
    if seen is None: seen = set()
    t = type(value)
    if t in (type(None), bool, int, float, str):
        return repr(value)[:200]
    ident = id(value)
    if ident in seen: return '<reference @' + str(ident) + '>'
    if depth >= 2: return '<' + t.__name__ + ' @' + str(ident) + '>'
    seen = seen | {ident}
    if t in (list, tuple):
        return {'type': t.__name__, 'ref': str(ident), 'items': [_forge_value(x, depth+1, seen) for x in value[:16]], 'more': len(value)>16}
    if t is dict:
        return {'type': 'dict', 'ref': str(ident), 'items': [[_forge_value(k,depth+1,seen), _forge_value(v,depth+1,seen)] for k,v in list(value.items())[:16]], 'more':len(value)>16}
    if t in (set,frozenset):
        return {'type':t.__name__, 'ref':str(ident), 'items':[_forge_value(x,depth+1,seen) for x in list(value)[:16]], 'more':len(value)>16}
    # Do not call arbitrary __repr__ or property getters while observing an object.
    return '<' + t.__name__ + ' @' + str(ident) + '>'

def _forge_trace(frame, event, arg):
    global _forge_overflow, _forge_total
    if frame.f_code.co_filename != '<forge-user>': return None
    if event not in ('line','call','return','exception'): return _forge_trace
    if len(_forge_steps) >= 300: _forge_overflow=True; return None
    frames=[]; current=frame
    while current and len(frames)<8:
        if current.f_code.co_filename == '<forge-user>':
            values={k:_forge_value(v) for k,v in list(current.f_locals.items())[:40] if not k.startswith('__')}
            frames.append({'name':current.f_code.co_name,'line':current.f_lineno,'values':values})
        current=current.f_back
    item={'line':frame.f_lineno,'event':event,'frames':frames}
    if event=='return': item['returnValue']=_forge_value(arg)
    if event=='exception': item['error']=arg[0].__name__
    _forge_total += len(_json.dumps(item))
    if _forge_total > 1500000: _forge_overflow=True; return None
    _forge_steps.append(item)
    return _forge_trace
`;
self.onmessage=async ({data})=>{
  try{
    const py=await runtime;self.postMessage({kind:'ready'});
    let stdout='',stderr='',truncated=false;
    const lines=data.stdin.replace(/\r\n/g,'\n').replace(/\n$/,'').split('\n');let i=0;
    py.setStdin({stdin:()=>i<lines.length?lines[i++]:null});
    py.setStdout({batched:s=>{if(stdout.length+s.length>65536)truncated=true;stdout=(stdout+s+'\n').slice(0,65536);}});
    py.setStderr({batched:s=>{stderr=(stderr+s+'\n').slice(0,65536);}});
    const dict=py.globals.get('dict'),scope=dict();dict.destroy();scope.set('__name__','__main__');
    let status='completed',error='',steps=[],traceTruncated=false;
    try{
      py.globals.set('_forge_source',data.source);
      py.globals.set('_forge_scope',scope);
      if(data.trace)await py.runPythonAsync(tracer+'\n_sys.settrace(_forge_trace)');
      try{await py.runPythonAsync("exec(compile(_forge_source, '<forge-user>', 'exec'), _forge_scope)");}
      finally{if(data.trace){await py.runPythonAsync('_sys.settrace(None)');steps=JSON.parse(await py.runPythonAsync('_json.dumps(_forge_steps)'));traceTruncated=await py.runPythonAsync('_forge_overflow');}}
    }catch(e){status='runtime_error';error=e.message;}finally{scope.destroy();}
    self.postMessage({kind:'done',status,stdout,stderr,error,steps,traceTruncated,outputTruncated:truncated});
  }catch(e){self.postMessage({kind:'error',error:'Python runtime could not load: '+e.message});}
};
