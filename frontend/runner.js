(() => {
  'use strict';
  function local({language,source,stdin,trace=false},signal){return new Promise((resolve,reject)=>{
    let worker,url,timer,finished=false;
    const finish=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);worker?.terminate();if(url)URL.revokeObjectURL(url);signal?.removeEventListener('abort',abort);error?reject(error):resolve(result);};
    const abort=()=>finish(new DOMException('Execution stopped.','AbortError'));
    try{
      if(language==='python')worker=new Worker('frontend/python-worker.js',{type:'module'});
      else if(language==='javascript'){
        // Untrusted JavaScript runs in an opaque-origin sandbox iframe, below.
        return javascript({source,stdin},signal).then(resolve,reject);
      }else throw Error('This language needs the connected compiler service.');
      const timeout=()=>finish(null,{status:'time_limit',stdout:'',stderr:'',error:'Execution stopped after 10 seconds.',steps:[]});
      timer=setTimeout(()=>finish(Error('Python runtime download timed out. Check your connection.')),45000);
      worker.onmessage=({data})=>{if(data.kind==='ready'){clearTimeout(timer);timer=setTimeout(timeout,10000);}else if(data.kind==='error')finish(Error(data.error));else finish(null,data);};
      worker.onerror=()=>finish(Error('The browser runtime could not start.'));
      signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
      worker.postMessage({source,stdin,trace});
    }catch(e){finish(e);}
  });}
  function javascript({source,stdin},signal){return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe');frame.sandbox='allow-scripts';frame.hidden=true;
    const key=crypto.randomUUID();let timer,finished=false;
    const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',message);signal?.removeEventListener('abort',abort);frame.remove();};
    const done=(error,result)=>{if(finished)return;finished=true;cleanup();error?reject(error):resolve(result);};
    const abort=()=>done(new DOMException('Execution stopped.','AbortError'));
    const workerCode=`self.onmessage=({data})=>{let stdout='',truncated=false;const log=(...a)=>{let s=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\\n';if(stdout.length+s.length>65536)truncated=true;stdout=(stdout+s).slice(0,65536);};let lines=data.stdin.replace(/\\r\\n/g,'\\n').split('\\n'),i=0;try{new Function('console','print','readline','stdin',data.source)({log,warn:log,error:log},log,()=>lines[i++],data.stdin);postMessage({status:'completed',stdout,stderr:'',outputTruncated:truncated});}catch(e){postMessage({status:'runtime_error',stdout,stderr:'',error:String(e)});}};`;
    // No same-origin privilege, connections, imports, frames, forms or storage access.
    // The worker keeps infinite loops off the main thread; CSP is inherited by blob workers.
    frame.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'"><script>const key=${JSON.stringify(key)};const worker=new Worker(URL.createObjectURL(new Blob([${JSON.stringify(workerCode)}],{type:'text/javascript'})));onmessage=e=>{if(e.source===parent&&e.data.key===key)worker.postMessage(e.data);};worker.onmessage=e=>parent.postMessage({key,result:e.data},'*');worker.onerror=()=>parent.postMessage({key,result:{status:'runtime_error',error:'JavaScript worker failed.',stdout:''}},'*');parent.postMessage({key,ready:true},'*');<\/script>`;
    function message(e){if(e.source!==frame.contentWindow||e.data?.key!==key)return;if(e.data.ready){frame.contentWindow.postMessage({key,source,stdin},'*');}else if(e.data.result)done(null,e.data.result);}
    window.addEventListener('message',message);signal?.addEventListener('abort',abort,{once:true});
    if(signal?.aborted){abort();return;}document.body.appendChild(frame);
    timer=setTimeout(()=>done(null,{status:'time_limit',stdout:'',stderr:'',error:'JavaScript stopped after 10 seconds.'}),10000);
  });}
  async function execute(payload,signal){return ['python','javascript'].includes(payload.language)?local(payload,signal):ForgeNative.execute(payload,signal);}
  window.ForgeRunner={execute};
})();
