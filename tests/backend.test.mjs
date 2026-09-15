import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {configFromEnv,validateSubmission,providerPayload,normalizeResult,createJudge0,createApp,POLICY} from '../backend/server.mjs';
const TOKEN='a'.repeat(64),ORIGIN='https://axsimarosmelos.github.io';
const env={FORGE_API_TOKEN:TOKEN,FORGE_ALLOWED_ORIGINS:ORIGIN,JUDGE0_URL:'https://judge.example.com',JUDGE0_AUTH_TOKEN:'server-secret',JUDGE0_C_LANGUAGE_ID:'50',JUDGE0_CPP_LANGUAGE_ID:'54'};
const config=configFromEnv(env),source='#include <iostream>\nint main(){std::cout<<19;}';
const complete=()=>normalizeResult({status:{id:3},stdout:Buffer.from('19\n').toString('base64'),time:'0.01',memory:1000,exit_code:0});
const judge={check:async()=>[{id:50,name:'C (GCC test)'},{id:54,name:'C++ (GCC test)'}],submit:async()=> 'provider-token',poll:async()=>complete()};
async function fixture(t,options={}){const app=createApp(config,{judge,...options});await app.initialize();await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const url='http://127.0.0.1:'+app.server.address().port;return {app,async request(path,options={}){const res=await fetch(url+path,{...options,headers:{Authorization:'Bearer '+TOKEN,Origin:ORIGIN,...options.headers}});return {status:res.status,headers:res.headers,body:res.status===204?null:await res.json()};}};}
const post=(sourceText=source)=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:'cpp',source:sourceText,stdin:''})});
async function terminal(f,id){for(let i=0;i<80;i++){const r=await f.request('/v1/submissions/'+id);if(r.body.done)return r.body;await delay(2);}throw Error('Test job never finished');}
test('configuration rejects weak tokens, wildcards, embedded credentials and unencrypted remote providers',()=>{
  for(const patch of [{FORGE_API_TOKEN:'short'},{FORGE_ALLOWED_ORIGINS:'*'},{JUDGE0_URL:'http://remote.example.com'},{JUDGE0_URL:'https://secret:password@judge.example.com'},{JUDGE0_C_LANGUAGE_ID:'54'}])assert.throws(()=>configFromEnv({...env,...patch}));
  assert.equal(config.origins[0],ORIGIN);
});
test('submission schema refuses runner controls and uses UTF-8 byte bounds',()=>{
  for(const data of [{language:'python',source},{language:'cpp',source,enable_network:true},{language:'cpp',source,compiler_options:'evil'},{language:'cpp',source,callback_url:'https://example.com'},{language:'cpp',source:'\0'},{language:'cpp',source:'é'.repeat(16385)},{language:'cpp',source,stdin:'é'.repeat(8193)}])assert.throws(()=>validateSubmission(data));
  assert.deepEqual(validateSubmission({language:'c',source:'int main(void){return 0;}'}),{language:'c',source:'int main(void){return 0;}',stdin:''});
});
test('provider receives server-selected languages, compiler flags and aggregate limits',()=>{
  const p=providerPayload(validateSubmission({language:'cpp',source,stdin:'<x>\n'}),config.languageIds);
  assert.equal(p.language_id,54);assert.equal(p.compiler_options,'-std=c++17 -O2 -Wall -Wextra');assert.equal(p.enable_network,false);assert.equal(p.cpu_time_limit,2);assert.equal(p.wall_time_limit,5);assert.equal(p.memory_limit,262144);assert.equal(p.max_processes_and_or_threads,4);
  assert.equal(p.enable_per_process_and_thread_memory_limit,false);assert.equal(p.enable_per_process_and_thread_time_limit,false);assert.equal(Buffer.from(p.source_code,'base64').toString(),source);assert(!('additional_files' in p));assert(!('callback_url' in p));
});
test('verdicts distinguish compile failure, time limit, runtime failure and service failure',()=>{
  for(const [id,status] of [[3,'completed'],[5,'time_limit'],[6,'compile_error'],[7,'runtime_error'],[12,'sandbox_error']])assert.equal(normalizeResult({status:{id}}).status,status);
  const long=normalizeResult({status:{id:3},stdout:Buffer.from('x'.repeat(POLICY.outputBytes+1)).toString('base64')});assert.equal(long.stdout.length,POLICY.outputBytes);assert.equal(long.outputTruncated,true);
  assert.throws(()=>normalizeResult({status:{id:42}}));assert.throws(()=>normalizeResult({status:{id:3},stdout:'<script>'}));
});
const limits={enable_network:false,enable_compiler_options:true,max_cpu_time_limit:15,max_cpu_extra_time:2,max_wall_time_limit:20,max_memory_limit:524288,max_stack_limit:131072,max_max_file_size:4096,max_max_processes_and_or_threads:64};
test('Judge0 readiness rejects network defaults, wrong compilers, missing limits and excessive compile budgets',async()=>{
  function provider(patch={},names){return createJudge0(config,async url=>Response.json(url.endsWith('/languages')?(names||[{id:50,name:'C (GCC 12)'},{id:54,name:'C++ (GCC 12)'}]):{...limits,...patch}));}
  assert.equal((await provider().check()).length,2);
  for(const patch of [{enable_network:true},{enable_network:undefined},{max_cpu_time_limit:999},{max_memory_limit:undefined},{max_max_processes_and_or_threads:1000}])await assert.rejects(()=>provider(patch).check());
  await assert.rejects(()=>provider({},[{id:50,name:'Python'},{id:54,name:'C++ (GCC 12)'}]).check());
});
test('upstream adapter uses asynchronous base64 submission, authentication, no redirects and bounded responses',async()=>{
  const calls=[];const j=createJudge0(config,async(url,opts)=>{calls.push({url,opts});return Response.json({token:'opaque-provider-token'});});
  assert.equal(await j.submit({language:'cpp',source,stdin:''}),'opaque-provider-token');assert(calls[0].url.endsWith('base64_encoded=true&wait=false'));assert.equal(calls[0].opts.redirect,'error');assert.equal(calls[0].opts.headers['X-Auth-Token'],'server-secret');
  const huge=createJudge0(config,async()=>new Response('x'.repeat(POLICY.upstreamBytes+1)));await assert.rejects(()=>huge.submit({language:'cpp',source,stdin:''}),/exceeds/);
});
test('HTTP authenticates API routes, enforces exact CORS, handles preflight and does not leak provider secrets',async t=>{
  const f=await fixture(t);assert.equal((await f.request('/v1/languages',{headers:{Authorization:''}})).status,401);assert.equal((await f.request('/v1/languages',{headers:{Origin:'https://evil.example.com'}})).status,403);
  assert.equal((await f.request('/v1/languages',{headers:{Origin:'null'}})).status,403);assert.equal((await f.request('/v1/submissions',{method:'OPTIONS',headers:{Authorization:''}})).status,204);
  const langs=await f.request('/v1/languages');assert.equal(langs.status,200);assert.equal(langs.headers.get('access-control-allow-origin'),ORIGIN);assert(!JSON.stringify(langs.body).includes('server-secret'));
  assert.equal((await f.request('/v1/submissions',{method:'POST',headers:{'Content-Type':'text/plain'},body:source})).status,415);
  assert.equal((await f.request('/v1/submissions',{...post(),body:'{broken'})).status,400);
  assert.equal((await f.request('/v1/submissions',{...post(),body:JSON.stringify({language:'cpp',source,stdin:'x'.repeat(70000)})})).status,413);
});
test('HTTP submission runs asynchronously, returns safe output and expires retained results',async t=>{
  let now=100000;const f=await fixture(t,{clock:()=>now});const r=await f.request('/v1/submissions',post());assert.equal(r.status,202);assert.match(r.body.id,/^[0-9a-f-]{36}$/);assert(!JSON.stringify(r.body).includes('provider-token'));
  const result=await terminal(f,r.body.id);assert.equal(result.stdout,'19\n');assert.equal(result.status,'completed');assert.equal(f.app.activeJobs,0);
  now+=POLICY.retentionMs+1;assert.equal((await f.request('/v1/submissions/'+r.body.id)).status,404);
});
test('simultaneous HTTP submissions reserve capacity before body processing',async t=>{
  let release;const gate=new Promise(r=>release=r);const f=await fixture(t,{judge:{...judge,poll:async()=>{await gate;return complete();}}});
  const result=await Promise.all(Array.from({length:8},()=>f.request('/v1/submissions',post())));assert.equal(result.filter(r=>r.status===202).length,2);assert.equal(result.filter(r=>r.status===429).length,6);assert.equal(f.app.activeJobs,2);release();
  await terminal(f,result.find(r=>r.status===202).body.id);
});
test('submission rate limits completed jobs too',async t=>{
  const f=await fixture(t);for(let i=0;i<POLICY.submissionsPerMinute;i++){const r=await f.request('/v1/submissions',post());assert.equal(r.status,202);await terminal(f,r.body.id);}
  const denied=await f.request('/v1/submissions',post());assert.equal(denied.status,429);assert.equal(denied.body.error,'rate_limit');
});
test('provider outages and queue deadlines are not mislabeled as algorithm time limits',async t=>{
  let now=100000;const f=await fixture(t,{clock:()=>now,pause:async()=>{now+=61000;},judge:{...judge,poll:async()=>({status:'queued',done:false})}});
  const r=await f.request('/v1/submissions',post());assert.equal((await terminal(f,r.body.id)).status,'service_timeout');
  const bad=await fixture(t,{judge:{...judge,submit:async()=>{throw Error('private token must not leak');}}});const b=await bad.request('/v1/submissions',post());const result=await terminal(bad,b.body.id);assert.equal(result.status,'service_error');assert(!JSON.stringify(result).includes('private token'));
});
test('installed language discovery excludes executable uploads and preserves the fixed sandbox policy',async()=>{
  const config=configFromEnv({...env,JUDGE0_EXTRA_LANGUAGE_IDS:'all'});
  const names=[{id:50,name:'C (GCC 12)'},{id:54,name:'C++ (GCC 12)'},{id:71,name:'Python (3.11)'},{id:62,name:'Java (OpenJDK 13)'},{id:44,name:'Executable'},{id:89,name:'Multi-file program'}];
  const provider=createJudge0(config,async url=>Response.json(url.endsWith('/languages')?names:limits));
  assert.equal((await provider.check()).length,4);
  assert.equal(config.languageIds['judge0-62'],62);assert(!Object.hasOwn(config.languageIds,'judge0-44'));
  const data=validateSubmission({language:'judge0-62',source:'class Main {}',stdin:''},config.languageIds);
  const payload=providerPayload(data,config.languageIds);assert.equal(payload.language_id,62);assert(!Object.hasOwn(payload,'compiler_options'));assert.equal(payload.enable_network,false);assert.equal(payload.memory_limit,POLICY.memoryKb);
  assert.throws(()=>validateSubmission({language:'judge0-99',source:'x'},config.languageIds));
  assert.throws(()=>configFromEnv({...env,JUDGE0_EXTRA_LANGUAGE_IDS:'62,0'}));
  const selected=configFromEnv({...env,JUDGE0_EXTRA_LANGUAGE_IDS:'62,71'});assert.equal(selected.languageIds['judge0-71'],71);
  await assert.rejects(()=>createJudge0(selected,async url=>Response.json(url.endsWith('/languages')?names.filter(l=>l.id!==71):limits)).check());
});
