import {isAppOwner} from './app-owners.mjs';
import {rootFor} from './room-history.mjs';
export const coverSchema='CREATE TABLE IF NOT EXISTS room_cover(root TEXT PRIMARY KEY,revision TEXT NOT NULL,image TEXT NOT NULL)';

function validCover(value){
  if(typeof value!=='string'||value.length>620000||!value.startsWith('data:image/jpeg;base64,/9j/'))return false;
  const encoded=value.slice('data:image/jpeg;base64,'.length);
  if(encoded.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return false;
  try{const bytes=atob(encoded);return bytes.endsWith('\xff\xd9')}catch{return false}
}
export async function saveCover(q,room,owner,fields,image,json){
  if(!owner||fields?.ownerUid?.stringValue!==owner||fields?.status?.stringValue!=='open')return json({error:'غير مصرح'},403);
  return writeCover(q,await rootFor(q,room),image,json);
}

export async function saveHelpCover(q,room,uid,configuredOwner,image,json){
  const staff=await isAppOwner(q,uid,configuredOwner)||await q('SELECT 1 FROM clipi_app_admin WHERE uid=?',uid).first();
  if(!staff)return json({error:'غير مصرح'},403);
  return writeCover(q,room,image,json);
}

async function writeCover(q,root,image,json){
  if(image!==null&&!validCover(image))return json({error:'اختر صورة JPEG أصغر'},400);
  if(image===null){
    await q('DELETE FROM room_cover WHERE root=?',root).run();
    return json({cover:null});
  }
  const revision=crypto.randomUUID();
  await q('INSERT INTO room_cover(root,revision,image) VALUES(?,?,?) ON CONFLICT(root) DO UPDATE SET revision=excluded.revision,image=excluded.image',root,revision,image).run();
  return json({cover:revision});
}
export async function coverResponse(q,room,revision){
  const root=await rootFor(q,room);
  const row=await q('SELECT image FROM room_cover WHERE root=? AND revision=?',root,revision).first();
  if(!row)return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  const bytes=Uint8Array.from(atob(row.image.slice('data:image/jpeg;base64,'.length)),c=>c.charCodeAt(0));
  return new Response(bytes,{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
}
