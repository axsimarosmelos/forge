/* Optional hosted editor. Explicit opening/population, exact postMessage origin. */
(() => {
  'use strict';
  const ORIGIN='https://onecompiler.com';
  let active=null;
  const oldRender=render;
  function open(id){
    const w=ForgeStudy.workspace(id),language={python:'python',javascript:'javascript',c:'c',cpp:'cpp'}[w.language]||w.compilerDraft?.language||'cpp';
    active={id,language,last:null};
    modal(modalHead('More languages, right here')+`<p class="small muted">This hosted OneCompiler editor can compile and run its supported languages without leaving Forge. Opening it connects to OneCompiler; use “Load saved code” to send your draft. Results stay in this panel and are not automatically judged by Forge.</p><div class="flex wrap"><button class="btn primary" onclick="ForgeCompiler.populate()">Load saved code</button><button class="btn" onclick="ForgeCompiler.save()">Save embedded draft</button><button class="btn small" onclick="ForgeLearning.unclear('${id}')">Need to revise this problem</button></div><p id="compiler-feedback" class="small muted" aria-live="polite">Use the editor’s language selector for additional languages. Input and results are inside the frame. Save your draft here before closing.</p><iframe id="compiler-embed" class="tutor-frame" title="OneCompiler multi-language editor" src="${ORIGIN}/embed/${language}?theme=dark&listenToEvents=true&codeChangeEvent=true" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" allow="clipboard-write"></iframe>`);
    document.querySelector('.modal')?.classList.add('wide-modal');
  }
  function feedback(text){const el=document.getElementById('compiler-feedback');if(el)el.textContent=text;}
  function payload(value){
    if(!value||typeof value.language!=='string'||!/^[-a-z0-9+#.]{1,50}$/i.test(value.language)||!Array.isArray(value.files)||!value.files.length||value.files.length>10)return null;
    let size=0;const files=[];
    for(const f of value.files){if(!f||typeof f.name!=='string'||f.name.length>120||typeof f.content!=='string'||f.content.length>100000)return null;size+=f.content.length;if(size>150000)return null;files.push({name:f.name,content:f.content});}
    return {language:value.language,files};
  }
  window.addEventListener('message',event=>{
    const frame=document.getElementById('compiler-embed');
    if(!active||!frame||event.origin!==ORIGIN||event.source!==frame.contentWindow)return;
    const draft=payload(event.data);if(draft){active.last=draft;feedback('Editor changes received. Use “Save embedded draft” before closing.');}
  });
  function populate(){
    const frame=document.getElementById('compiler-embed');if(!frame||!active)return;
    const w=ForgeStudy.workspace(active.id),extension={python:'py',javascript:'js',c:'c',cpp:'cpp'}[w.language]||'txt';
    const draft=w.compilerDraft||{language:active.language,files:[{name:'main.'+extension,content:w.drafts[w.language]}]};
    frame.contentWindow.postMessage({eventType:'populateCode',...draft},ORIGIN);
    feedback('Code sent. Check the language, paste any standard input in the frame, and use its Run button.');
  }
  function saveDraft(){
    if(!active?.last){feedback('No editor changes received yet. Edit the code in the frame, then save again; you can also download your files from its editor.');return;}
    const w=ForgeStudy.workspace(active.id);w.compilerDraft=structuredClone(active.last);ForgeWorkspaceStorage.touch(active.id);save();feedback('Embedded draft saved with this problem and included in progress backups.');
  }
  function panel(id){return `<section class="card pad" style="margin-top:18px"><h3>Run more languages here</h3><p class="small muted">Use the hosted editor for C, C++, Java, Rust, Go, SQL and other supported languages. No personal compiler service is needed for this option.</p><button class="btn" onclick="ForgeCompiler.open('${id}')">Open in-page compiler</button></section>`;}
  render=function(){oldRender();const route=location.hash.split('/');if(route[0]==='#problem'&&ForgeCatalogCore.safeID(route[1])){const target=document.querySelector('.editor-panel');if(target){const node=document.createElement('div');node.innerHTML=panel(route[1]);target.appendChild(node);}}};
  window.ForgeCompiler={open,populate,save:saveDraft,validateDraft:payload};
  render();
})();
