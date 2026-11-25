async function transaction(uid,mode,operation){
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('clipi-short-drafts',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts',mode);
      const request=operation(tx.objectStore('drafts'),uid);
      tx.oncomplete=()=>resolve(request.result);
      tx.onabort=()=>reject(tx.error||new Error('تعذّر حفظ المسودة'));
      tx.onerror=()=>reject(tx.error||request.error);
    });
  }finally{db.close();}
}
export async function readShortDraft(uid){
  const saved=await transaction(uid,'readonly',(store,key)=>store.get(key));
  if(!saved)return null;
  const {file,...metadata}=saved;
  return {...metadata,draft:{file,uri:URL.createObjectURL(file)}};
}
export async function saveShortDraft(uid,draft,metadata){
  await transaction(uid,'readwrite',(store,key)=>store.put({...metadata,file:draft.file},key));
  return draft;
}
export const clearShortDraft=uid=>transaction(uid,'readwrite',(store,key)=>store.delete(key));
