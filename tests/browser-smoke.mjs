// Real Chromium checks using its DevTools protocol; no test-framework dependencies.
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),profile=await mkdtemp(resolve(tmpdir(),'forge-browser-'));
const mime={'.html':'text/html','.json':'application/json','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\/forge\//,'/');const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+sep))throw Error('Invalid path');const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const chrome=spawn(process.env.CHROME_BIN||'google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
let launchError='',ws;chrome.on('error',e=>{launchError=e.message;});chrome.stderr.on('data',b=>{launchError=(launchError+b).slice(-5000);});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let sequence=0;const pending=new Map(),runtimeErrors=[];
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('DevTools timeout: '+method));},70000);pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
async function until(expression,ms=20000){const deadline=Date.now()+ms;while(Date.now()<deadline){try{if(await evaluate(expression))return;}catch{}await sleep(150);}throw Error('Browser condition failed: '+expression);}
async function route(hash,selector){await evaluate(`location.hash=${JSON.stringify(hash)}; render()`);await until(`!!document.querySelector(${JSON.stringify(selector)})`);}
async function screenshot(name){const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await mkdir(resolve(root,'test-results'),{recursive:true});await writeFile(resolve(root,'test-results',name+'.png'),Buffer.from(data,'base64'));}
try{
  let target;
  // Chrome can take longer to start on shared runners; use its assigned port.
  for(let i=0;i<200;i++){try{const debugPort=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];target=await (await fetch('http://127.0.0.1:'+debugPort+'/json/new?about:blank',{method:'PUT',signal:AbortSignal.timeout(2000)})).json();if(target.webSocketDebuggerUrl)break;}catch{}await sleep(150);}
  assert(target,'Chrome did not start: '+launchError);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',e=>{const message=JSON.parse(e.data);if(message.id){const item=pending.get(message.id);pending.delete(message.id);if(item)message.error?item.reject(Error(JSON.stringify(message.error))):item.resolve(message.result);}else if(message.method==='Runtime.exceptionThrown')runtimeErrors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/forge/#practice`});
  await until('typeof ForgeStudy!=="undefined" && ForgeStudy.allProblems().length>20000');
  await evaluate('ForgeWorkspaceStorage.ready');
  const manifest=JSON.parse(await readFile(resolve(root,'content/catalog/manifest.json'),'utf8'));
  const counts=await evaluate('Object.fromEntries(ForgeCatalogCore.platforms.map(p=>[p,ForgeStudy.allProblems().filter(t=>t.platform===p).length]))');
  for(const [platform,key] of [['LeetCode','leetcode'],['Codeforces','codeforces'],['AtCoder','atcoder']])assert.equal(counts[platform],manifest.catalogs[key].count);
  assert.equal(await evaluate('document.querySelectorAll(".problem-row").length'),30,'catalog must be paginated');
  await evaluate('document.querySelector("#catalog-search").value="Two Sum";document.querySelector("#catalog-search").dispatchEvent(new Event("input",{bubbles:true}))');
  await until('document.querySelectorAll(".problem-row").length>0 && [...document.querySelectorAll(".problem-row-main strong")].every(e=>e.textContent.toLowerCase().includes("two sum"))');
  await screenshot('library-desktop');
  await route('#problem/lc-1','#problem-code');
  assert(await evaluate('document.querySelector(".study-brief").textContent.includes("[1, 2]")'));
  assert.equal(await evaluate('document.querySelectorAll("iframe.solution-video").length'),0,'do not embed videos before user action');
  await evaluate('ForgeStudy.showVideo("lc-1")');
  assert((await evaluate('document.querySelector("iframe.solution-video").src')).startsWith('https://www.youtube-nocookie.com/embed/'));
  await evaluate('ForgeStudy.reveal("lc-1")');
  assert(await evaluate('document.querySelector("#editorial-content").textContent.includes("Doocs")'));
  assert(await evaluate('document.querySelectorAll("#editorial-content .template-details").length>=2'));
  await evaluate('ForgeStudy.update("lc-1","code","print(19)\\n"); ForgeStudy.update("lc-1","notes","Use a map of earlier values."); ForgeStudy.update("lc-1","expected","19");state.quiz.hello={passed:[0,1],wrong:0};completeLesson("hello")');
  // Completing a lesson intentionally navigates to Review. Return before the reload check.
  await route('#problem/lc-1','#problem-code');
  await until(`new Promise(resolve=>{const request=indexedDB.open('forge-code-workspaces',1);request.onsuccess=()=>{const db=request.result;const read=db.transaction('workspaces').objectStore('workspaces').get(state.study.workspaceEpoch+':lc-1');read.onsuccess=()=>{resolve(read.result?.value.drafts.python==='print(19)\\n');db.close();};};})`);
  assert.equal(await evaluate('Object.keys(JSON.parse(localStorage.getItem(KEY)).study.workspaces).length'),0,'larger drafts must stay out of small localStorage');
  await send('Page.reload',{ignoreCache:true});
  await until('typeof ForgeStudy!=="undefined" && ForgeStudy.allProblems().length>20000 && state.study.workspaces["lc-1"]?.drafts.python==="print(19)\\n"');
  assert(await evaluate('learned("hello") && state.cards.length>0'),'legacy lesson and recall progress survives');
  assert.equal(await evaluate('document.querySelector("#problem-code").value'),'print(19)\n');
  await evaluate('document.querySelector("#attempt-outcome").value="independent";document.querySelector("#attempt-minutes").value="20";document.querySelector("#attempt-lesson").value="Check complements before insertion.";document.querySelector("#attempt-outcome").closest("form").requestSubmit()');
  assert.equal(await evaluate('state.study.attempts.at(-1).outcome'),'hinted','revealing help must survive reload and create a guided attempt');
  assert(await evaluate('state.cards.some(c=>c.id==="study-repair-lc-1")'));
  await screenshot('workspace-desktop');
  // Actual browser Python worker, including stdout and a deliberate runtime failure.
  await evaluate('ForgeStudy.run("lc-1")');
  assert(await evaluate('document.querySelector("#problem-output").textContent.includes("Your chosen test output matches.")'),'Python execution must produce expected output');
  await evaluate('ForgeStudy.update("lc-1","code","raise ValueError(\"expected test failure\")");ForgeStudy.run("lc-1")');
  await until('document.querySelector("#problem-output").textContent.includes("runtime_error")',60000);
  const references=JSON.parse(await readFile(resolve(root,'content/lesson-references.json'),'utf8')).lessons;
  assert.equal(Object.keys(references).length,115);
  await route('#learn/hello','.lesson-sources');assert(await evaluate('document.querySelector(".lesson-sources a").href.startsWith("https://docs.python.org/")'));
  await route('#native/c-start','.lesson-sources');assert(await evaluate('document.querySelector(".lesson-sources a").href.includes("beej.us")'));
  await route('#native/cpp-start','.lesson-sources');assert(await evaluate('document.querySelector(".lesson-sources a").href.includes("learncpp.com")'));
  await route('#roadmap','.plan-metrics');
  assert(await evaluate('state.study.end===ForgeCatalogCore.addMonths(state.study.start,4)'));
  await screenshot('plan-desktop');
  await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
  for(const [hash,selector] of [['#practice','.problem-row'],['#problem/lc-1','#problem-code'],['#roadmap','.plan-metrics']]){await route(hash,selector);const widths=await evaluate('({content:document.documentElement.scrollWidth,viewport:innerWidth})');assert(widths.content<=376,hash+' overflows the 375px mobile viewport: '+JSON.stringify(widths));}
  await screenshot('plan-mobile');
  // Portable backup includes IndexedDB drafts; importing and resetting use fresh generations.
  await evaluate('window.savedBackup=null;download=(name,text)=>{window.savedBackup=JSON.parse(text)};exportData()');
  assert(await evaluate('savedBackup.study.workspaces["lc-1"].notes.includes("earlier values")'));
  await evaluate('pendingImport=validate(JSON.parse(JSON.stringify(savedBackup)));confirmImport()');
  const importedEpoch=await evaluate('state.study.workspaceEpoch');
  await until(`new Promise(resolve=>{const q=indexedDB.open('forge-code-workspaces',1);q.onsuccess=()=>{const d=q.result;const r=d.transaction('workspaces').objectStore('workspaces').get(state.study.workspaceEpoch+':lc-1');r.onsuccess=()=>{resolve(!!r.result);d.close();};};})`);
  await evaluate('resetProgress()');
  assert.notEqual(await evaluate('state.study.workspaceEpoch'),importedEpoch);
  await send('Page.reload',{ignoreCache:true});
  await until('typeof ForgeStudy!=="undefined" && ForgeStudy.allProblems().length>20000');await evaluate('ForgeWorkspaceStorage.ready');
  assert.equal(await evaluate('Object.keys(state.study.workspaces).length'),0,'old drafts must not reappear after reset');
  assert.equal(await evaluate('state.cards.length'),0);
  // Third-party frames can have their own errors. Record any exceptions for diagnosis.
  const report={result:'PASS',counts,references:115,checks:['catalog search/pagination','embedded editorial/video','IndexedDB reload','legacy progress','guided attempts and recall','Python execution/error','four-month dates','mobile layout','backup/import/reset'],runtimeErrors};
  await writeFile(resolve(root,'test-results/browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){let page='';try{await screenshot('failure');page=await evaluate('document.querySelector("#app")?.innerText.slice(0,6000)');console.error('PAGE:',page);}catch{}await mkdir(resolve(root,'test-results'),{recursive:true});await writeFile(resolve(root,'test-results/browser-report.json'),JSON.stringify({result:'FAIL',error:error.message,stack:error.stack,page,runtimeErrors},null,2));throw error;}
finally{ws?.close();chrome.kill('SIGTERM');server.closeAllConnections();server.close();await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
