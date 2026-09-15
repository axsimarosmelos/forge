// Pure catalog/planning functions, shared by the browser and regression tests.
(function(root){
  'use strict';
  const platforms=['LeetCode','Codeforces','AtCoder'];
  const iso=d=>d.toISOString().slice(0,10);
  const parse=s=>new Date(s+'T12:00:00Z');
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(+parse(s))&&iso(parse(s))===s;
  const days=(a,b)=>Math.round((parse(b)-parse(a))/86400000);
  function addMonths(s,n){const d=parse(s),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return iso(d);}
  const safeID=s=>typeof s==='string'&&/^(?:lc-\d+|cf-\d+-[A-Za-z0-9]+|at-[A-Za-z0-9_-]+)$/.test(s);
  const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const safeURL=(s,hosts)=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&hosts.includes(u.hostname);}catch{return false;}};
  const hosts=['leetcode.com','codeforces.com','atcoder.jp','github.com'];
  function catalog(raw){
    if(!plain(raw)||!Array.isArray(raw.problems)||raw.problems.length>50000||!platforms.includes(raw.platform)||typeof raw.fetchedAt!=='string')throw Error('Invalid catalog file.');
    const seen=new Set();
    const problems=raw.problems.map(p=>{
      if(!plain(p)||!safeID(p.id)||seen.has(p.id)||p.platform!==raw.platform||typeof p.title!=='string'||p.title.length>400||!safeURL(p.url,hosts)||!Array.isArray(p.tags)||p.tags.length>50||p.tags.some(t=>typeof t!=='string'||t.length>100))throw Error('Invalid problem metadata.');
      if(!['algorithm','sql','javascript','shell'].includes(p.kind)||typeof p.premium!=='boolean'||!['string','number'].includes(typeof p.number)||String(p.number).length>100)throw Error('Invalid task type or number.');
      if(p.rating!==null&&p.rating!==undefined&&(!Number.isFinite(p.rating)||p.rating<0||p.rating>10000))throw Error('Invalid problem difficulty.');
      if(p.reference&&!safeURL(p.reference,['github.com']))throw Error('Invalid explanation reference.');
      if(p.video&&(!plain(p.video)||!/^[A-Za-z0-9_-]{11}$/.test(p.video.id)))throw Error('Invalid video mapping.');
      if(p.editorialBatch&&!/^\d{2,3}$/.test(p.editorialBatch))throw Error('Invalid explanation batch.');
      seen.add(p.id);return p;
    });
    return {...raw,problems};
  }
  function defaults(start){return {version:1,start,end:addMonths(start,4),primaryLanguage:'python',scope:'all',premium:false,minutesPerProblem:25,attempts:[],workspaces:{}};}
  function validate(s){
    if(!plain(s)||s.version!==1||!validDate(s.start)||!validDate(s.end)||days(s.start,s.end)<1||days(s.start,s.end)>730||!['python','c','cpp'].includes(s.primaryLanguage)||!['all','algorithms'].includes(s.scope)||typeof s.premium!=='boolean'||!Number.isFinite(s.minutesPerProblem)||s.minutesPerProblem<5||s.minutesPerProblem>180||!Array.isArray(s.attempts)||s.attempts.length>30000||!plain(s.workspaces)||Object.keys(s.workspaces).length>10000)throw Error('Invalid four-month plan or practice backup.');
    if(s.workspaceEpoch!==undefined&&(typeof s.workspaceEpoch!=='string'||!/^[a-z0-9]{1,50}$/.test(s.workspaceEpoch)))throw Error('Invalid workspace storage identity.');
    for(const a of s.attempts){if(!plain(a)||!safeID(a.pid)||!platforms.includes(a.platform)||!['independent','hinted','stuck'].includes(a.outcome)||!Number.isFinite(a.at)||a.at<0||!Number.isFinite(a.minutes)||a.minutes<1||a.minutes>600||typeof a.note!=='string'||a.note.length>10000||typeof a.difficulty!=='string'||(a.rating!==null&&(!Number.isFinite(a.rating)||a.rating<0||a.rating>10000)))throw Error('Invalid practice attempt.');}
    for(const [id,w] of Object.entries(s.workspaces)){
      if(!safeID(id)||!plain(w)||!ForgeLearningCore.language(w.language)||!plain(w.drafts)||typeof w.statement!=='string'||w.statement.length>100000||typeof w.notes!=='string'||w.notes.length>50000||typeof w.stdin!=='string'||w.stdin.length>50000||typeof w.expected!=='string'||w.expected.length>50000||typeof w.video!=='string'||w.video&&!/^[A-Za-z0-9_-]{11}$/.test(w.video))throw Error('Invalid problem workspace.');
      if(w.helpAt!==undefined&&(!Number.isFinite(w.helpAt)||w.helpAt<0))throw Error('Invalid help history.');
      ForgeLearningCore.validateWorkspace(w);
      for(const lang of ['python','c','cpp'])if(typeof w.drafts[lang]!=='string'||w.drafts[lang].length>100000)throw Error('Invalid saved problem code.');
    }
    return s;
  }
  function latest(attempts){const result=new Map();for(const a of attempts){if(!result.has(a.pid)||a.at>=result.get(a.pid).at)result.set(a.pid,a);}return result;}
  function solved(attempts,platform){return new Set(attempts.filter(a=>(!platform||a.platform===platform)&&a.outcome==='independent').map(a=>a.pid));}
  function level(attempts,platform){
    const minimum=platform==='Codeforces'?800:0;let rating=minimum,window=[],seen=new Set(),changes=[];
    // First attempt on each distinct task provides evidence once. Repeating one easy task cannot inflate the band.
    for(const a of [...attempts].filter(a=>a.platform===platform).sort((a,b)=>a.at-b.at)){
      if(seen.has(a.pid))continue;seen.add(a.pid);
      if(!Number.isFinite(a.rating)||a.rating<rating-100||a.rating>rating+300)continue;
      window.push(a);if(window.length<5)continue;
      const wins=window.filter(a=>a.outcome==='independent'&&a.minutes<=45).length,stuck=window.filter(a=>a.outcome==='stuck').length;
      const before=rating;if(wins>=4)rating=Math.min(3500,rating+100);else if(stuck>=3)rating=Math.max(minimum,rating-100);
      if(before!==rating)changes.push({at:a.at,from:before,to:rating});window=[];
    }
    return {rating,evidence:window.length,changes};
  }
  function leetcodeLevel(attempts){const unique=[...latest(attempts.filter(a=>a.platform==='LeetCode')).values()];const easy=unique.filter(a=>a.difficulty==='Easy'&&a.outcome==='independent').length;const medium=unique.filter(a=>a.difficulty==='Medium'&&a.outcome==='independent').length;return medium>=30?3:easy>=10?2:1;}
  function pace(settings,problems,allAttempts,today,budget){
    const list=problems.filter(p=>p.platform==='LeetCode'&&(settings.scope==='all'||p.kind==='algorithm'));
    const ids=solved(allAttempts,'LeetCode'),done=list.filter(p=>ids.has(p.id)).length,total=list.length;
    const remaining=Math.max(0,total-done),left=Math.max(0,days(today,settings.end)),duration=days(settings.start,settings.end);
    const required=left?Math.ceil(remaining/left):remaining?null:0;
    const sample=allAttempts.filter(a=>a.outcome==='independent').slice(-20).map(a=>a.minutes).sort((a,b)=>a-b);
    const estimate=sample.length>=5?Math.max(5,sample[Math.floor(sample.length/2)]):settings.minutesPerProblem;
    return {total,done,remaining,left,duration,day:Math.max(1,Math.min(duration,days(settings.start,today)+1)),required,estimate,requiredMinutes:required===null?null:required*estimate,capacity:Math.max(0,Math.floor(Math.max(0,budget-45)/estimate)),otherLanguages:list.filter(p=>p.kind!=='algorithm').length,premium:list.filter(p=>p.premium).length};
  }
  function recommendations(problems,attempts,options){
    const prior=latest(attempts),done=solved(attempts),cf=level(attempts,'Codeforces').rating,at=level(attempts,'AtCoder').rating,lc=leetcodeLevel(attempts),stamp=options.now;
    const limits={Easy:1,Medium:2,Hard:3};
    return problems.filter(p=>p.kind==='algorithm'&&(options.premium||!p.premium)&&options.ready(p)).filter(p=>{
      const a=prior.get(p.id);if(done.has(p.id))return false;if(a&&stamp-a.at<86400000)return false;
      return p.platform==='LeetCode'?(limits[p.difficulty]||9)<=lc:Number.isFinite(p.rating)&&p.rating>=(p.platform==='Codeforces'?cf:at)-100&&p.rating<=(p.platform==='Codeforces'?cf:at)+200;
    }).map(p=>{
      const a=prior.get(p.id),band=p.platform==='Codeforces'?cf:at;
      return {problem:p,score:(a?200:0)+(p.neetcode150?50:0)+(p.video?10:0)+(p.editorialBatch?10:0)-(p.platform==='LeetCode'?(limits[p.difficulty]||3)*5:Math.abs(p.rating-band)/20),reason:a?'Revisit after a helped or stuck attempt.':p.platform==='LeetCode'?'Matches your demonstrated LeetCode level.':'Within your current practice difficulty band.'};
    }).sort((a,b)=>b.score-a.score||String(a.problem.number).localeCompare(String(b.problem.number),undefined,{numeric:true}));
  }
  function videoID(value){try{const u=new URL(value);if(u.protocol!=='https:')return '';let id='';if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)){id=u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1]||'';}return /^[A-Za-z0-9_-]{11}$/.test(id)?id:'';}catch{return '';}}
  function tutorURL(code,language,stdin='',embed=false){const q=new URLSearchParams({code,py:language==='python'?'3':language==='javascript'?'js':language,mode:'edit',cumulative:'false',heapPrimitives:'nevernest',textReferences:'false',rawInputLstJSON:JSON.stringify(stdin?stdin.replace(/\n$/,'').split('\n'):[])});return 'https://pythontutor.com/'+(embed?'iframe-embed.html':'visualize.html')+'#'+q.toString();}
  root.ForgeCatalogCore={platforms,validDate,addMonths,days,safeID,safeURL,catalog,defaults,validate,latest,solved,level,leetcodeLevel,pace,recommendations,videoID,tutorURL};
})(globalThis);
