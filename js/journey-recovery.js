import{BREATHE_KEYS,parseBreatheRaw,validateBreathe,breatheRaw}from'./breathe-schema.js';
export function captureRaw(storage){return{format:'breathe-raw-v1',raw:Object.fromEntries(BREATHE_KEYS.map(k=>[k,storage.getItem(k)]))}};
export function prepareRestore(text,storage){
 const d=JSON.parse(text);if(!d||d.schema!==1||d.app!=='breathe'||d.kind!=='selected-version-restore'||Object.keys(d).some(k=>!['schema','app','kind','value'].includes(k)))throw Error('Choose a Breathe selected-version restore file');
 validateBreathe(d.value);const before=captureRaw(storage);const current=parseBreatheRaw(JSON.stringify(before));
 // Omitted preferences stay unchanged, but cannot leave a selected custom
 // profile dangling after this version deliberately removes that profile.
 try{validateBreathe({...d.value,settings:{...current.settings,...d.value.settings}})}catch{throw Error('This version would leave the selected rhythm without a profile. Choose a built-in rhythm in Preferences, then preview again.')}

 return{value:structuredClone(d.value),before,fingerprint:JSON.stringify(before)};
}
export function commitRestore(prepared,storage){
 // Revalidate both preview data and current original. A stale preview cannot
 // replace sessions created while the confirmation panel was open.
 validateBreathe(prepared.value);if(JSON.stringify(captureRaw(storage))!==prepared.fingerprint)throw Error('Original data changed after preview. Preview again before confirming.');
 const key='breathe-before-restore.v1:'+crypto.randomUUID();const backup=JSON.stringify(prepared.before);storage.setItem(key,backup);
 const replacement=breatheRaw(prepared.value).raw;
 try{for(const[k,v]of Object.entries(replacement))storage.setItem(k,v)}catch(error){
  let failed=false;for(const[k,v]of Object.entries(prepared.before.raw)){try{if(v===null)storage.removeItem(k);else storage.setItem(k,v)}catch{failed=true}}
  throw Error(failed?'Restore failed and rollback could not finish. Your original recovery backup is retained at '+key+'. Keep this browser open.':'Restore failed. Original values were restored; recovery backup retained.');
 }
 return{backupKey:key,backup};
}
