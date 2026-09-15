const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
const data=JSON.stringify(JSON.parse(html.match(/<script id="curriculum-data" type="application\/json">([\s\S]*?)<\/script>/)[1]));
const native=html.match(/<script id="native-curriculum" type="application\/json">([\s\S]*?)<\/script>/)[1];
const embedded=new Map([...html.matchAll(/<script id="([^"]+)" type="application\/json">([\s\S]*?)<\/script>/g)].map(m=>[m[1],m[2]]));
const article=html.match(/<template id="stl-article">([\s\S]*?)<\/template>/)[1];
const elements=new Map(),storage=new Map();
function el(id){if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',value:'',style:{},classList:{add(){},remove(){},toggle(){}},focus(){},disabled:false,prepend(node){this.innerHTML=node.innerHTML+this.innerHTML;},appendChild(node){this.innerHTML+=node.innerHTML;}});return elements.get(id);}
const sandbox={console,Date,Math,JSON,Set,Map,URL,Blob,Error,Number,String,Array,Object,RegExp,AbortController,DOMException,TextEncoder,location:{hash:''},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{getElementById:id=>embedded.has(id)?{textContent:embedded.get(id)}:id==='stl-article'?{innerHTML:article}:el('#'+id),querySelector:s=>el(s),querySelectorAll:()=>[],body:{style:{}},addEventListener(){},createElement:()=>({innerHTML:'',className:''})},scrollTo(){},addEventListener(){},setTimeout(){return 1},clearTimeout(){},setInterval(){return 1},FormData:class{constructor(x){this.x=x}get(k){return this.x[k]??null}}};
sandbox.window=sandbox;vm.createContext(sandbox);
for(const script of scripts){if(!script[0].includes('type="application/json"'))vm.runInContext(script[1],sandbox);}
function run(s){return vm.runInContext(s,sandbox)}
function equal(s,v){assert.deepStrictEqual(JSON.parse(JSON.stringify(run(s))),v,s)}
function action(s){run(s)}
equal('LESSONS.length',24);equal('PROBLEMS.length',104);equal('nextLesson().lesson.id','hello');equal('dueCards().length',0);equal('recommendations(8).length',0);
assert(run('todayView().includes("Every strong coder")'));
action(`checkAnswer({preventDefault(){},target:{answer:'99'}},'hello',0)`);
equal('state.quiz.hello.wrong',1);equal('dueCards().length',1);equal('state.quiz.hello.passed.length',0);
action(`checkAnswer({preventDefault(){},target:{answer:'11'}},'hello',0);checkAnswer({preventDefault(){},target:{answer:'7'}},'hello',1);completeLesson('hello')`);
equal('learned("hello")',true);equal('state.cards.length',4);equal('nextLesson().lesson.id','input');equal('validate(JSON.parse(localStorage.getItem(KEY))).completed.hello>0',true);
// Wrong answers cannot be marked complete. Unmet prerequisites cannot be skipped.
action(`completeLesson('input');completeLesson('binary')`);equal('learned("input")',false);equal('learned("binary")',false);
// Spaced recall: exact delay, reset after failure, and cap.
equal(`(()=>{let c={interval:0,ease:2.5,reps:0,lapses:0};return schedule(c,'good',1000).due})()`,86401000);
equal(`(()=>{let c={interval:3,ease:2.5,reps:2,lapses:0};let n=schedule(c,'again',1000);return [n.due,n.reps,n.lapses]})()`,[601000,0,1]);
equal(`schedule({interval:59,ease:2.5,reps:9,lapses:0},'easy',1000).interval`,60);
// Complete prerequisite lessons and verify platform readiness.
action(`for(const id of ['input','if']){state.quiz[id]={passed:[0,1],wrong:0};completeLesson(id)}`);
equal('recommendations(8).map(p=>p.id)',['cf4A']);
action(`for(const id of ['loops','lists','strings']){state.quiz[id]={passed:[0,1],wrong:0};completeLesson(id)}`);
equal('recommendations(104).some(p=>p.platform==="LeetCode")',false);
action(`state.quiz.functions={passed:[0,1],wrong:0};completeLesson('functions')`);
equal('problemReady(P("lc-add-two-integers"))',true);
// Attempt -> mistake journal -> next-day card -> repair priority.
action(`logAttempt({preventDefault(){},target:{outcome:'hinted',minutes:'25',error:'Boundary case',note:'Test w = 2 as well as larger even weights.'}},'cf4A')`);
equal('state.journal.length',1);equal('weakTopic().id','if');equal('nextLesson().repair',true);assert(run('state.cards.find(c=>c.id==="problem-cf4A").due > Date.now()+86300000'));
action(`completeLesson('if')`);equal('weakTopic()===undefined',true);
// Repeated independent submissions count as one unique solve in scoring.
action(`logAttempt({preventDefault(){},target:{outcome:'independent',minutes:'10',error:'Idea not clear',note:'Check evenness and positive parts.'}},'cf4A');logAttempt({preventDefault(){},target:{outcome:'independent',minutes:'8',error:'Idea not clear',note:'Recreated the rule.'}},'cf4A')`);
equal('skillScore("if")',50);
// Low-energy checkin changes budget; total allocated time is bounded.
action(`state.checkins[today()]={minutes:60,energy:'low'}`);assert(run('budgets().count<=2'));assert(run('(()=>{let b=budgets();return b.review+b.learn+b.practice+b.reflect+b.breaks<=b.minutes})()'));
// All page renderers and lesson renderers produce content, no runtime errors.
action(`for(const [page] of navs){location.hash='#'+page;render();if(!document.querySelector('#app').innerHTML)throw Error('Empty '+page)};for(const l of LESSONS){if(!lessonView(l.id).includes('Close the notes'))throw Error(l.id)}`);
// Mock session survives serialization, scores only attempts inside the clock.
action(`startMock({preventDefault(){},target:{duration:'45'}})`);equal('state.activeMock.pids.length',3);assert(run('validate(JSON.parse(JSON.stringify(state))).activeMock.start>0'));
action(`finishMock()`);equal('state.mocks.length',1);equal('state.activeMock',null);
// Invalid backups rejected; escaped user content remains text.
assert.throws(()=>run(`validate({...state,profile:{...state.profile,eventUrl:'javascript:alert(1)'}})`));
assert.throws(()=>run(`validate({...state,journal:[{id:"bad'code",title:'x',note:'x',at:1}]})`));
assert.throws(()=>run(`validate({...state,profile:{...state.profile,stage1:state.profile.start}})`));
equal(`esc('<script>alert(1)</script>')`,'&lt;script&gt;alert(1)&lt;/script&gt;');
// Local persistence can reconstruct all state without dropping cards or attempts.
action('save()');equal('validate(JSON.parse(localStorage.getItem(KEY))).attempts.length',3);
console.log('PASS: initial state, lesson gates, quiz feedback, card creation, review scheduling, platform prerequisites, adaptive repair, unique scoring, time budgets, all page renderers, mock history, backup validation, and persistence.');

// Language drafts and legacy progress survive switching and backup roundtrips.
const oldCompleted=JSON.parse(JSON.stringify(run('state.completed')));
action(String.raw`ForgeNative.changeLanguage('cpp');ForgeNative.saveDraft('#include <iostream>\nint main(){}');ForgeNative.changeLanguage('c');ForgeNative.saveDraft('int main(void) {return 0;}');ForgeNative.changeLanguage('cpp')`);
equal('state.native.drafts.cpp.source','#include <iostream>\nint main(){}');
equal('state.native.drafts.c.source','int main(void) {return 0;}');equal('state.completed',oldCompleted);
action(`ForgeNative.complete('cpp-io')`);equal('!!state.native.progress["cpp-io"]?.completedAt',false);
action(`ForgeNative.check({preventDefault(){},target:{answer:'0'}},'cpp-start',0)`);assert(run('state.cards.some(c=>c.id==="native-check-cpp-start-0")'));
action(`ForgeNative.check({preventDefault(){},target:{answer:'17'}},'cpp-start',0);ForgeNative.check({preventDefault(){},target:{answer:'no'}},'cpp-start',1);ForgeNative.complete('cpp-start')`);
equal('state.native.progress["cpp-start"].completedAt>0',true);assert(run('dueCards().some(c=>c.id==="native-cpp-start-0")'));
equal('validate(JSON.parse(JSON.stringify(state))).native.progress["cpp-start"].completedAt>0',true);
action(`ForgeNative.complete('fenwick')`);equal('!!state.native.progress.fenwick?.completedAt',false);
assert.throws(()=>run(`validate({...state,native:{...state.native,apiUrl:'javascript:alert(1)'}})`));
equal(`(()=>{const s=JSON.parse(JSON.stringify(state));delete s.native;return validate(s).attempts.length;})()`,3);
const h=run(String.raw`ForgeNative.highlight('<script>alert("x")</script>\nint x=42; // comment')`);assert(!h.includes('<script>'));assert(h.includes('&lt;'));assert(h.includes('syntax-keyword'));assert(h.includes('syntax-number'));assert(h.includes('syntax-comment'));
for(const lesson of JSON.parse(native).modules.flatMap(m=>m.lessons)){action(`location.hash='#native/${lesson.id}';render()`);assert(el('#app').innerHTML.includes(lesson.title.replaceAll('&','&amp;')),lesson.id);}
for(const track of ['c','cpp','atlas'])action(`location.hash='#native/${track}';render()`);
action(`location.hash='#lab';ForgeNative.changeLanguage('cpp');render()`);assert(el('#app').innerHTML.includes('Connect compiler service'));assert(el('#app').innerHTML.includes('native-highlight'));
// Four-month integration: failures, timers, persisted queues and confidence affect recommendations.
action(`ForgeStudy.acceptCatalog(JSON.parse(${JSON.stringify(fs.readFileSync(root+'/content/catalog/leetcode.json','utf8'))}));location.hash='#problem/lc-1';render()`);
assert(el('#app').innerHTML.includes('Attempt, test, understand'));
action(`ForgeLearning.unclear('lc-1');state.study.workspaces['lc-1'].review.due=Date.now()-1;state.study.attempts.push({pid:'lc-1',platform:'LeetCode',outcome:'independent',minutes:15,note:'',at:1,difficulty:'Easy',rating:null});state.checkins[today()]={minutes:180,energy:'steady'};`);
assert(run(`ForgeStudy.dailyTasks().some(x=>x.problem.id==='lc-1'&&x.reason.includes('re-solve'))`),'previously solved problems must return for revision');
action(`state.study.workspaces['lc-1'].timer={deadline:Date.now()-1,fired:false};ForgeLearning.tick()`);
assert(run(`state.study.workspaces['lc-1'].timer.fired`));assert(run(`state.study.workspaces['lc-1'].review.reasons.includes('time')`));
action(`ForgeStudy.log({preventDefault(){},target:{outcome:'independent',minutes:'20',confidence:'partial',note:'Cannot explain the invariant'}},'lc-1')`);
equal(`state.study.attempts.at(-1).outcome`,'hinted');
action(`ForgeLearning.loadDemo('lc-1')`);equal(`state.study.workspaces['lc-1'].tests.length`,2);
equal(`validate(JSON.parse(JSON.stringify(state))).study.workspaces['lc-1'].tests.length`,2);
action(`location.hash='#curriculum';render()`);assert(el('#app').innerHTML.includes('Kernighan'));assert(el('#app').innerHTML.includes('BLOCK 16'));
action(`location.hash='#lab';ForgeNative.changeLanguage('cpp');render()`);
// Compiled lesson renders all Markdown sections, tables and code safely.
assert(article.includes('<table>'));assert(article.includes('Scoreboard Thresholds'));assert(article.includes('&lt;iostream&gt;'));
(async()=>{
  const requests=[];sandbox.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({languages:[{id:'c'},{id:'cpp'}]})};};
  const token='t'.repeat(64);sandbox.connectionForm={url:'https://first.example.com',token,querySelector:()=>({disabled:false})};
  await run(`ForgeNative.connect({preventDefault(){},target:connectionForm})`);
  assert.equal(requests[0].options.headers.Authorization,'Bearer '+token);assert(![...storage.values()].some(s=>s.includes(token)),'No token in stored progress');
  sandbox.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({id:'fake-id',done:true,status:'completed',stdout:'<script>hello</script>',timeSeconds:0.01,memoryKb:1000})};};
  await run('ForgeNative.run()');
  assert.equal(requests.length,2);assert.equal(JSON.parse(requests[1].options.body).language,'cpp');
  assert(el('#app').innerHTML.includes('&lt;script&gt;hello&lt;/script&gt;'),'Execution output must be displayed as text');
  action(`state.native.apiUrl='https://imported.example.com';render()`);
  await run('ForgeNative.run()');assert.equal(requests.length,2,'Changing backup URL must not send old credentials to a new host');
  assert(el('#app').innerHTML.includes('Connect compiler service'));
  console.log('PASS: C/C++ routes, lesson gates, native spaced cards, language drafts, legacy backups, highlighting, compiled Markdown, token isolation and URL-change credential protection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
