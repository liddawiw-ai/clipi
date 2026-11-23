import {authorState,saveShortProfile,socialComments,socialSchema} from './short-social.mjs';
import {paidBalance} from './diamond-wallet.mjs';
import {diamondGifts} from './diamond-gifts.mjs';

const starterIds = ['palace','aurora','dunes'];
const publishedId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const maxBytes = 24 * 1024 * 1024;
export const shortSchema = [
  'CREATE TABLE IF NOT EXISTS short_clip(id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, object_key TEXT)',
  'CREATE TABLE IF NOT EXISTS short_like(clip TEXT NOT NULL, uid TEXT NOT NULL, PRIMARY KEY(clip,uid))',
  'CREATE TABLE IF NOT EXISTS short_comment(clip TEXT NOT NULL, uid TEXT NOT NULL, nonce TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(uid,nonce))',
  'CREATE INDEX IF NOT EXISTS short_comment_by_clip ON short_comment(clip)',
  ...socialSchema
];
export async function shortAccount(q, uid, input, json, hasStorage) {
  const {op,clip} = input;
  if (op === 'shortList') {
    const before = Number(input.before) || Number.MAX_SAFE_INTEGER;
    const rows = await q('SELECT rowid AS cursor,id,title,owner FROM short_clip WHERE object_key IS NOT NULL AND rowid<? ORDER BY rowid DESC LIMIT 30', before).all();
    return json({clips: rows.results});
  }
  if (op === 'shortPrepare') {
    if (!hasStorage) return json({error:'تخزين الفيديوهات غير مفعّل بعد'},503);
    await saveShortProfile(q,uid,input.profile);
    const id = crypto.randomUUID();
    const title = String(input.title || '').trim().slice(0,100);
    await q('INSERT INTO short_clip(id,owner,title) VALUES(?,?,?)',id,uid,title).run();
    return json({id});
  }
  const owner=starterIds.includes(clip)?'clipi:official':publishedId.test(clip)?(await q('SELECT owner FROM short_clip WHERE id=? AND object_key IS NOT NULL',clip).first())?.owner:null;
  if(!owner)return json({error:'الفيديو غير متاح'},404);
  if (op === 'shortLike' || op === 'shortState') {
    if (op === 'shortLike') {
      if (typeof input.liked !== 'boolean') return json({error:'اختيار غير صالح'},400);
      if (input.liked) await q('INSERT OR IGNORE INTO short_like(clip,uid) VALUES(?,?)',clip,uid).run();
      else await q('DELETE FROM short_like WHERE clip=? AND uid=?',clip,uid).run();
    }
    const state = await q('SELECT COUNT(*) AS likes, COALESCE(MAX(uid=?),0) AS liked FROM short_like WHERE clip=?',uid,clip).first();
    return json({...state,liked:Boolean(state.liked),...await authorState(q,uid,clip,owner)});
  }
  if (['shortComment','shortComments','shortCommentLike','shortFollow'].includes(op))return socialComments(q,uid,input,json,owner);
  if (op === 'shortGift') {
    const gift=diamondGifts.get(input.gift);
    if (!gift || !publishedId.test(input.nonce)) return json({error:'هدية غير صالحة'},400);
    // Video support spends from the shared purchased ledger. The empty payee never earns rewards.
    const room='short/'+clip;
    await q(`INSERT INTO paid_room_gift(sender,nonce,room,host,gift,cost,hostUnits) SELECT ?,?,?,'',?,?,0 WHERE (${paidBalance})>=? ON CONFLICT(sender,nonce) DO NOTHING`,
      uid,input.nonce,room,input.gift,gift.cost,uid,uid,gift.cost).run();
    const receipt=await q('SELECT room,gift FROM paid_room_gift WHERE sender=? AND nonce=?',uid,input.nonce).first();
    if (receipt?.room!==room || receipt?.gift!==input.gift) return json({error:'تعذّر إرسال الهدية. تحقّق من رصيد الماس المشترى'},409);
    return json({sent:true});
  }
  return json({error:'طلب غير صالح'},400);
}

export async function receiveShort(request, bucket, q, uid, id, json) {
  if (!bucket) return json({error:'تخزين الفيديوهات غير مفعّل بعد'},503);
  const row=await q('SELECT object_key FROM short_clip WHERE owner=? AND id=?',uid,id).first();
  if (!row) return json({error:'الفيديو غير موجود'},404);
  if (row.object_key) return json({id});
  const size=Number(request.headers.get('content-length'));
  if (!size || size > maxBytes || size < 12) return json({error:'اختر ملف MP4 حجمه حتى ٢٤ ميغابايت'},413);
  const bytes=new Uint8Array(await request.arrayBuffer());
  if (bytes.length!==size || String.fromCharCode(...bytes.slice(4,8))!=='ftyp') return json({error:'اختر فيديو بصيغة MP4'},415);
  const key='shorts/'+crypto.randomUUID()+'.mp4';
  await bucket.put(key,bytes,{httpMetadata:{contentType:'video/mp4'}});
  const outcome=await q('UPDATE short_clip SET object_key=? WHERE id=? AND owner=? AND object_key IS NULL',key,id,uid).run();
  if (!outcome.meta.changes) await bucket.delete(key);
  return json({id});
}

export async function serveShort(request, bucket, q, id, json) {
  if (!bucket) return json({error:'التخزين غير متاح'},503);
  const row=await q('SELECT object_key FROM short_clip WHERE id=? AND object_key IS NOT NULL',id).first();
  if (!row) return json({error:'الفيديو غير موجود'},404);
  const head=await bucket.head(row.object_key);
  if (!head) return json({error:'الفيديو غير موجود'},404);
  const headers=new Headers({'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'public, max-age=86400','Content-Length':String(head.size)});
  let range;
  const value=request.headers.get('Range');
  if (value) {
    const m=/^bytes=(\d*)-(\d*)$/.exec(value);
    const start=m?.[1] ? Number(m[1]) : Math.max(head.size-Number(m?.[2]),0);
    const end=m?.[1] && m?.[2] ? Math.min(Number(m[2]),head.size-1) : head.size-1;
    if (!m || (!m[1]&&!m[2]) || !(start>=0 && start<=end && start<head.size)) return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+head.size}});
    range={offset:start,length:end-start+1};
    headers.set('Content-Range',`bytes ${start}-${end}/${head.size}`);
    headers.set('Content-Length',String(range.length));
  }
  const data=request.method==='HEAD'?null:await bucket.get(row.object_key,range?{range}:{});
  if(request.method!=='HEAD'&&!data)return json({error:'الفيديو غير موجود'},404);
  return new Response(data?.body||null,{status:range?206:200,headers});
}
