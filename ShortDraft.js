import * as FS from 'expo-file-system';
import {randomUUID} from 'expo-crypto';

const directory=uid=>FS.documentDirectory+'short-drafts/'+encodeURIComponent(uid)+'/';
async function records(dir){
  if(!(await FS.getInfoAsync(dir)).exists)return [];
  return (await FS.readDirectoryAsync(dir)).filter(n=>/^record-\d+-[a-f0-9-]+\.json$/.test(n)).sort().reverse();
}
export async function readShortDraft(uid){
  const dir=directory(uid);
  for(const record of await records(dir)){
    const data=JSON.parse(await FS.readAsStringAsync(dir+record));
    if(data.photos)return {...data,draft:{photos:data.photos}};
    if((await FS.getInfoAsync(dir+data.media)).exists)return {...data,draft:{uri:dir+data.media}};
  }
  return null;
}
export async function saveShortDraft(uid,draft,metadata){
  const dir=directory(uid);
  await FS.makeDirectoryAsync(dir,{intermediates:true});
  const old=await records(dir);
  let media=draft.uri?.startsWith(dir)?draft.uri.slice(dir.length):null;
  if(!draft.photos&&!media){
    media='video-'+randomUUID()+'.mp4';
    await FS.copyAsync({from:draft.uri,to:dir+media});
  }
  const stamp=Math.max(Date.now(),Number(old[0]?.split('-')[1]||0)+1);
  const name='record-'+stamp+'-'+randomUUID()+'.json';
  await FS.writeAsStringAsync(dir+name+'.tmp',JSON.stringify({...metadata,media,photos:draft.photos}));
  await FS.moveAsync({from:dir+name+'.tmp',to:dir+name});
  for(const file of await FS.readDirectoryAsync(dir)){
    if(file!==media&&file!==name)await FS.deleteAsync(dir+file,{idempotent:true}).catch(()=>{});
  }
  return draft.photos?draft:{uri:dir+media};
}
export const clearShortDraft=uid=>FS.deleteAsync(directory(uid),{idempotent:true});
