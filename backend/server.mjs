import http from 'node:http';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// This process NEVER invokes a compiler, shell, Docker, or submitted binary.
// Judge0 must run on separate, maintained sandbox infrastructure.
export const POLICY = Object.freeze({
  sourceBytes: 32768, stdinBytes: 16384, requestBytes: 65536,
  outputBytes: 65536, upstreamBytes: 524288,
  cpuSeconds: 2, cpuExtraSeconds: 0.25, wallSeconds: 5,
  memoryKb: 262144, stackKb: 16384, fileKb: 64, processes: 4,
  requestsPerMinute: 180, submissionsPerMinute: 10,
  concurrentJobs: 2, retainedJobs: 64, retentionMs: 600000,
  providerDeadlineMs: 60000, upstreamTimeoutMs: 8000, pollMs: 700
});
const LANGS = { c: { label: 'C17', flags: '-std=c17 -O2 -Wall -Wextra' },
  cpp: { label: 'C++17', flags: '-std=c++17 -O2 -Wall -Wextra' } };
const hash = s => createHash('sha256').update(s).digest();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const statuses = { 1:'queued', 2:'running', 3:'completed', 4:'wrong_answer',
  5:'time_limit', 6:'compile_error', 7:'runtime_error', 8:'runtime_error',
  9:'runtime_error', 10:'runtime_error', 11:'runtime_error', 12:'sandbox_error', 13:'runtime_error' };
export class APIError extends Error { constructor(status, code, message) { super(message); this.status=status; this.code=code; } }
export function configFromEnv(env=process.env) {
  const token=env.FORGE_API_TOKEN||'';
  if(token.length<32 || token.length>256 || /replace|change-me|example/i.test(token)) throw Error('Set a random FORGE_API_TOKEN of 32–256 characters.');
  const base=new URL(env.JUDGE0_URL||'');
  if(base.username||base.password||base.search||base.hash) throw Error('JUDGE0_URL cannot include credentials, query, or fragment.');
  const dev=env.NODE_ENV==='development';
  if(base.protocol!=='https:' && !(dev && base.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(base.hostname))) throw Error('Judge0 requires HTTPS; HTTP loopback is allowed only in development.');
  const origins=(env.FORGE_ALLOWED_ORIGINS||'').split(',').filter(Boolean).map(s=>s.trim());
  if(!origins.length||origins.some(s=>{try{const u=new URL(s);return u.origin!==s||!(u.protocol==='https:'||(dev&&['localhost','127.0.0.1'].includes(u.hostname)&&u.protocol==='http:'));}catch{return true}})) throw Error('Set exact FORGE_ALLOWED_ORIGINS; wildcards, paths, and null are not allowed.');
  const ids={c:Number(env.JUDGE0_C_LANGUAGE_ID),cpp:Number(env.JUDGE0_CPP_LANGUAGE_ID)};
  if(Object.values(ids).some(n=>!Number.isSafeInteger(n)||n<=0)||ids.c===ids.cpp) throw Error('Set distinct language IDs from your provider’s /languages endpoint.');
  const authHeader=env.JUDGE0_AUTH_HEADER||'X-Auth-Token';
  if(!['X-Auth-Token','X-RapidAPI-Key'].includes(authHeader)) throw Error('Unsupported provider authentication header.');
  if(!env.JUDGE0_AUTH_TOKEN) throw Error('Set the server-only JUDGE0_AUTH_TOKEN.');
  return { token, baseURL:base.href.replace(/\/$/,''), origins, languageIds:ids,
    providerHeaders:{[authHeader]:env.JUDGE0_AUTH_TOKEN,...(env.JUDGE0_RAPIDAPI_HOST?{'X-RapidAPI-Host':env.JUDGE0_RAPIDAPI_HOST}:{})} };
}
export function validateSubmission(data) {
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!['language','source','stdin'].includes(k))) throw new APIError(400,'invalid_request','Only language, source, and stdin are accepted.');
  if(!Object.hasOwn(LANGS,data.language)) throw new APIError(400,'language','Use c or cpp.');
  if(typeof data.source!=='string'||!data.source.trim()||Buffer.byteLength(data.source)>POLICY.sourceBytes||data.source.includes('\0')) throw new APIError(400,'source','Source must be nonempty UTF-8 text, at most 32 KiB, without NUL bytes.');
  const stdin=data.stdin??'';
  if(typeof stdin!=='string'||Buffer.byteLength(stdin)>POLICY.stdinBytes||stdin.includes('\0')) throw new APIError(400,'stdin','Input must be UTF-8 text, at most 16 KiB, without NUL bytes.');
  return {language:data.language,source:data.source,stdin};
}
export function providerPayload(data,ids) {
  return {language_id:ids[data.language],source_code:Buffer.from(data.source).toString('base64'),stdin:Buffer.from(data.stdin).toString('base64'),
    compiler_options:LANGS[data.language].flags,cpu_time_limit:POLICY.cpuSeconds,cpu_extra_time:POLICY.cpuExtraSeconds,
    wall_time_limit:POLICY.wallSeconds,memory_limit:POLICY.memoryKb,stack_limit:POLICY.stackKb,
    max_file_size:POLICY.fileKb,max_processes_and_or_threads:POLICY.processes,
    enable_per_process_and_thread_time_limit:false,enable_per_process_and_thread_memory_limit:false,
    enable_network:false,number_of_runs:1,redirect_stderr_to_stdout:false};
}
async function boundedJSON(response,max=POLICY.upstreamBytes) {
  const reader=response.body?.getReader();if(!reader)throw Error('No provider response body.');
  let size=0;const chunks=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('Provider response exceeds configured limit.');}chunks.push(value);}}
  finally{reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function decoded(value) { if(value==null)return {text:'',truncated:false};if(typeof value!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('Malformed provider output encoding.');const b=Buffer.from(value,'base64');return {text:b.subarray(0,POLICY.outputBytes).toString('utf8'),truncated:b.length>POLICY.outputBytes}; }
export function normalizeResult(raw) {
  const id=raw?.status?.id;if(!Number.isInteger(id)||!Object.hasOwn(statuses,id))throw Error('Unknown provider status.');
  const stdout=decoded(raw.stdout),stderr=decoded(raw.stderr),compile=decoded(raw.compile_output);
  const number=n=>n!=null&&Number.isFinite(Number(n))?Number(n):null;
  return {status:statuses[id],statusId:id,done:id>2,
    stdout:stdout.text,stderr:stderr.text,compileOutput:compile.text,
    outputTruncated:stdout.truncated||stderr.truncated||compile.truncated,
    timeSeconds:number(raw.time),wallSeconds:number(raw.wall_time),memoryKb:number(raw.memory),
    exitCode:number(raw.exit_code),exitSignal:number(raw.exit_signal)};
}
export function createJudge0(config,fetchImpl=fetch) {
  async function request(path,body) {
    const response=await fetchImpl(config.baseURL+path,{method:body?'POST':'GET',redirect:'error',
      headers:{Accept:'application/json',...config.providerHeaders,...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(POLICY.upstreamTimeoutMs)});
    const data=await boundedJSON(response);
    if(!response.ok)throw Error(`Judge0 rejected request with HTTP ${response.status}.`);
    return data;
  }
  return {
    async check(){
      const langs=await request('/languages');
      if(!Array.isArray(langs))throw Error('Invalid provider languages.');
      for(const [key,id] of Object.entries(config.languageIds)){
        const name=langs.find(l=>l.id===id)?.name||'';
        if(!(key==='c'?/^C \(GCC /:/^C\+\+ \(GCC /).test(name))throw Error('Configured language IDs must map to GCC C and GCC C++.');
      }
      const policy=await request('/config_info');
      // Fail closed when the provider advertises a network-enabled default or
      // insufficient maxima. The actual isolate/host policy still needs operator verification.
      if(policy.enable_network!==false)throw Error('Provider network default is enabled.');
      const bounds={max_cpu_time_limit:[POLICY.cpuSeconds,15],max_cpu_extra_time:[POLICY.cpuExtraSeconds,2],
        max_wall_time_limit:[POLICY.wallSeconds,20],max_memory_limit:[POLICY.memoryKb,524288],
        max_stack_limit:[POLICY.stackKb,131072],max_max_file_size:[POLICY.fileKb,4096],
        max_max_processes_and_or_threads:[POLICY.processes,64]};
      for(const [field,[minimum,maximum]] of Object.entries(bounds)){
        const value=Number(policy[field]);
        if(!Number.isFinite(value)||value<minimum||value>maximum)throw Error('Provider resource maxima must match the bounded worker profile: '+field);
      }
      if(policy.enable_compiler_options!==true)throw Error('Provider must permit the fixed compiler flags.');
      return langs.filter(l=>Object.values(config.languageIds).includes(l.id)).map(l=>({id:l.id,name:l.name}));
    },
    async submit(data){const result=await request('/submissions?base64_encoded=true&wait=false',providerPayload(data,config.languageIds));if(typeof result.token!=='string'||!/^[-a-zA-Z0-9]{1,100}$/.test(result.token))throw Error('Invalid provider job token.');return result.token;},
    async poll(token){return normalizeResult(await request('/submissions/'+encodeURIComponent(token)+'?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,wall_time,memory,exit_code,exit_signal'));}
  };
}
async function bodyJSON(req) {
  if(!/^application\/json(?:\s*;.*)?$/i.test(req.headers['content-type']||''))throw new APIError(415,'content_type','Use application/json.');
  if(req.headers['content-encoding']&&req.headers['content-encoding']!=='identity')throw new APIError(415,'encoding','Compressed bodies are not accepted.');
  if(Number(req.headers['content-length']||0)>POLICY.requestBytes)throw new APIError(413,'too_large','Request exceeds 64 KiB.');
  let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>POLICY.requestBytes)throw new APIError(413,'too_large','Request exceeds 64 KiB.');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new APIError(400,'json','Malformed JSON.');}
}
export function createApp(config,{judge=createJudge0(config),clock=Date.now,pause=sleep}={}) {
  const jobs=new Map();let active=0,ready=false,languages=[];let minute=0,requests=0,submissions=0,closed=false;
  const expected=hash(config.token);
  const publicJob=j=>({id:j.id,language:j.language,createdAt:j.createdAt,...j.result});
  const refreshLimits=()=>{let bucket=Math.floor(clock()/60000);if(bucket!==minute){minute=bucket;requests=0;submissions=0;}};
  const clean=()=>{for(const [id,j] of jobs)if(j.result.done&&clock()-j.finishedAt>POLICY.retentionMs)jobs.delete(id);};
  async function run(j,data){
    try{
      const token=await judge.submit(data),started=clock();
      while(!closed){
        j.result=await judge.poll(token);if(j.result.done)break;
        if(clock()-started>=POLICY.providerDeadlineMs)throw new APIError(504,'provider_timeout','Execution service did not finish in time.');
        await pause(POLICY.pollMs);
      }
      if(closed&&!j.result.done)j.result={done:true,status:'service_error',error:'API service is shutting down.'};
    }catch(e){j.result={done:true,status:e.code==='provider_timeout'?'service_timeout':'service_error',error:e.code==='provider_timeout'?'Execution service did not respond in time. This is not a program time-limit verdict.':'Execution service unavailable. Try again later.'};}
    finally{j.finishedAt=clock();active--;}
  }
  function send(res,status,data,origin){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{} )});res.end(JSON.stringify(data));}
  const server=http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    try{
      if(origin&&!config.origins.includes(origin))throw new APIError(403,'origin','Origin is not allowed.');
      if(req.method==='OPTIONS'){
        if(!origin)throw new APIError(403,'origin','Preflight requires an allowed origin.');
        res.writeHead(204,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'});res.end();return;
      }
      if(req.url==='/healthz'&&req.method==='GET'){send(res,200,{ok:true,ready},origin);return;}
      const auth=req.headers.authorization||'';
      if(!auth.startsWith('Bearer ')||auth.length>300||!timingSafeEqual(hash(auth.slice(7)),expected))throw new APIError(401,'unauthorized','A valid Forge execution token is required.');
      refreshLimits();if(++requests>POLICY.requestsPerMinute)throw new APIError(429,'rate_limit','Request rate exceeded. Retry in a minute.');
      clean();
      if(!ready)throw new APIError(503,'not_ready','Execution service is not ready.');
      if(req.method==='GET'&&req.url==='/v1/languages'){send(res,200,{languages:Object.entries(LANGS).map(([id,x])=>({id,label:x.label})),compilerVersions:languages,limits:POLICY},origin);return;}
      if(req.method==='POST'&&req.url==='/v1/submissions'){
        if(submissions>=POLICY.submissionsPerMinute)throw new APIError(429,'rate_limit','At most 10 submissions per minute.');
        // Reserve admission before awaiting any request-body bytes.
        if(active>=POLICY.concurrentJobs||jobs.size+active>=POLICY.retainedJobs)throw new APIError(429,'busy','Execution slots are full. Try again shortly.');
        active++;submissions++;let data;try{data=validateSubmission(await bodyJSON(req));}catch(e){active--;throw e;}
        const j={id:randomUUID(),language:data.language,createdAt:new Date(clock()).toISOString(),result:{status:'queued',done:false}};jobs.set(j.id,j);
        void run(j,data);send(res,202,{...publicJob(j),pollAfterMs:POLICY.pollMs},origin);return;
      }
      const match=req.url?.match(/^\/v1\/submissions\/([0-9a-f-]{36})$/);
      if(req.method==='GET'&&match){const j=jobs.get(match[1]);if(!j)throw new APIError(404,'not_found','Submission is unknown or expired.');send(res,200,publicJob(j),origin);return;}
      throw new APIError(404,'not_found','Route not found.');
    }catch(e){if(!res.headersSent)send(res,e instanceof APIError?e.status:500,{error:e instanceof APIError?e.code:'internal_error',message:e instanceof APIError?e.message:'The service could not process this request.'},origin&&config.origins.includes(origin)?origin:null);}
  });
  server.requestTimeout=10000;server.headersTimeout=5000;server.keepAliveTimeout=3000;server.maxHeadersCount=30;server.maxConnections=64;
  server.on('clientError',(_err,socket)=>socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'));
  return {server,async initialize(){languages=await judge.check();ready=true;},async close(){closed=true;ready=false;await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});},get activeJobs(){return active;}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const config=configFromEnv(),app=createApp(config);await app.initialize();
    app.server.listen(Number(process.env.PORT||8787),process.env.HOST||'127.0.0.1',()=>console.log('Forge execution API ready.'));
    process.on('SIGTERM',()=>{void app.close().then(()=>process.exit(0));});
  }catch(e){console.error('Execution service startup failed:',e.message);process.exitCode=1;}
}
