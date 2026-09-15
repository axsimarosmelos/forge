// Keep larger code workspaces in IndexedDB while preserving Forge's portable JSON backup.
(() => {
  const oldSave=save,oldExport=exportData,initialState=state;
  let lastState=state,db=null,unavailable=false,hydrated=false;
  const dirty=new Set(Object.keys(state.study?.workspaces||{})),touched=new Set(dirty);
  const epoch=()=>{if(!state.study.workspaceEpoch)state.study.workspaceEpoch=Date.now().toString(36)+Math.random().toString(36).slice(2,10);return state.study.workspaceEpoch;};
  epoch();
  const warn=()=>{const el=document.querySelector('#storage-warning');if(el){el.textContent='Some code workspaces could not be saved in this browser. Export a progress backup before closing.';el.classList.remove('hide');}const label=document.querySelector('#save-label');if(label)label.textContent='Backup needed';};
  function putMany(rows,generation){return new Promise((resolve,reject)=>{const tx=db.transaction('workspaces','readwrite'),store=tx.objectStore('workspaces');for(const [id,value] of rows)store.put({key:generation+':'+id,generation,id,value});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Workspace save was aborted.'));});}
  const ready=typeof indexedDB==='undefined'?Promise.resolve(null):new Promise((resolve,reject)=>{
    const request=indexedDB.open('forge-code-workspaces',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('workspaces',{keyPath:'key'});
    request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Workspace database is blocked by another tab.'));
    request.onsuccess=()=>{db=request.result;const generation=epoch(),read=db.transaction('workspaces','readonly').objectStore('workspaces').getAll();read.onerror=()=>reject(read.error);read.onsuccess=()=>{
      if(state===initialState)for(const row of read.result)if(row.generation===generation&&!touched.has(row.id))state.study.workspaces[row.id]=row.value;
      hydrated=true;resolve(db);if(location.hash.startsWith('#problem/'))render();
    };};
  }).catch(()=>{unavailable=true;warn();return null;});
  window.ForgeWorkspaceStorage={touch:id=>{dirty.add(id);touched.add(id);},ready};
  save=function(){
    if(!state.study)return oldSave();
    const changedState=state!==lastState;
    if(changedState){lastState=state;state.study.workspaceEpoch=Date.now().toString(36)+Math.random().toString(36).slice(2,10);for(const id of Object.keys(state.study.workspaces))dirty.add(id);}
    const workspaces=state.study.workspaces,generation=epoch();
    if(typeof indexedDB==='undefined'||unavailable){oldSave();return;}
    // Persist metadata with the original save path. Drafts are committed separately below.
    state.study.workspaces={};try{oldSave();}finally{state.study.workspaces=workspaces;}
    const rows=[...dirty].filter(id=>workspaces[id]).map(id=>[id,structuredClone(workspaces[id])]);dirty.clear();
    if(rows.length)void ready.then(database=>{if(!database){oldSave();warn();return;}return putMany(rows,generation);}).catch(()=>{unavailable=true;warn();});
  };
  exportData=async function(){await ready;if(!hydrated&&typeof indexedDB!=='undefined'&&unavailable)warn();oldExport();};
  // Save the namespace immediately so the next visit can locate this browser's workspaces.
  save();
})();
