/* Pure practice rules. A local test is evidence, never an official judge verdict. */
(function(root){
  'use strict';
  const DAY=86400000, intervals=[1,3,7,14,30];
  const reasons={time:'Time limit reached',compile:'Compilation error',runtime:'Runtime error',wrong:'Test output mismatch',confidence:'Idea not fully understood',guided:'Solution or hint used',recall:'Delayed independent re-solve'};
  const language=s=>typeof s==='string'&&(['python','javascript','c','cpp'].includes(s)||/^judge0-[1-9]\d{0,5}$/.test(s));
  function repair(review,reason,at){
    if(!Object.hasOwn(reasons,reason))throw Error('Unknown revision reason.');
    return {due:Math.min(review?.due??Infinity,at+DAY),successes:0,reasons:[...new Set([...(review?.reasons||[]),reason])],last:at};
  }
  function afterAttempt(review,{outcome,minutes,confidence,timebox},at){
    const failed=outcome!=='independent'||confidence!=='clear'||minutes>timebox;
    if(failed)return repair(review,confidence!=='clear'?'confidence':minutes>timebox?'time':outcome==='hinted'?'guided':'recall',at);
    // Early repetitions do not advance spacing. Only an independent re-solve after due earns a step.
    if(review&&review.successes>0&&at<review.due)return {...review};
    const successes=Math.min(5,(review?.successes||0)+1);
    return {due:at+intervals[successes-1]*DAY,successes,reasons:['recall'],last:at};
  }
  function compare(result,expected,enabled=true){
    if(result.status!=='completed')return {pass:false,reason:result.status==='compile_error'?'compile':result.status==='time_limit'?'time':['runtime_error','wrong_answer'].includes(result.status)?'runtime':null};
    if(!enabled)return {pass:null,reason:null};
    const normalize=s=>String(s).replace(/\r\n/g,'\n').replace(/\n$/,'');
    const pass=!result.outputTruncated&&normalize(result.stdout||'')===normalize(expected);
    return {pass,reason:pass?null:'wrong'};
  }
  function validateWorkspace(w){
    const finite=(x,a,b)=>Number.isFinite(x)&&x>=a&&x<=b;
    if(w.review!==undefined){const r=w.review;if(!r||!finite(r.due,0,1e15)||!Number.isInteger(r.successes)||r.successes<0||r.successes>5||!finite(r.last,0,1e15)||!Array.isArray(r.reasons)||r.reasons.length>7||r.reasons.some(s=>!Object.hasOwn(reasons,s)))throw Error('Invalid revision schedule.');}
    if(w.timebox!==undefined&&!finite(w.timebox,5,180))throw Error('Invalid attempt time limit.');
    if(w.timer!==undefined&&w.timer!==null&&(!finite(w.timer.deadline,0,1e15)||typeof w.timer.fired!=='boolean'))throw Error('Invalid attempt timer.');
    if(w.tests!==undefined&&(!Array.isArray(w.tests)||w.tests.length>10||w.tests.some(t=>!t||typeof t.stdin!=='string'||t.stdin.length>16000||typeof t.expected!=='string'||t.expected.length>50000)))throw Error('Invalid saved test suite.');
    if(w.bookConfidence!==undefined&&!['clear','partial','lost'].includes(w.bookConfidence))throw Error('Invalid confidence.');
    for(const [key,value] of Object.entries(w.drafts))if(!language(key)||typeof value!=='string'||value.length>100000)throw Error('Invalid language draft.');
  }
  function block(start,date,C){
    let month=0;while(month<3&&date>=C.addMonths(start,month+1))month++;
    return month*4+Math.min(3,Math.max(0,Math.floor(C.days(C.addMonths(start,month),date)/7)));
  }
  root.ForgeLearningCore={DAY,intervals,reasons,language,repair,afterAttempt,compare,validateWorkspace,block};
})(globalThis);
