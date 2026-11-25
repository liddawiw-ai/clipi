import {bucketPlayback} from './bucket-playback.mjs';
import {getVideo,putVideo,removeVideo,readMp4,playback} from './video-storage.mjs';
import {authorState,profileSocial,saveShortProfile,socialComments,socialSchema} from './short-social.mjs';
import {paidBalance} from './diamond-wallet.mjs';
import {diamondGifts} from './diamond-gifts.mjs';

const publishedId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const shortSchema = [
  'CREATE TABLE IF NOT EXISTS short_clip(id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, object_key TEXT)',
  'CREATE INDEX IF NOT EXISTS published_shorts_by_owner ON short_clip(owner) WHERE object_key IS NOT NULL',
  'CREATE TABLE IF NOT EXISTS short_like(clip TEXT NOT NULL, uid TEXT NOT NULL, PRIMARY KEY(clip,uid))',
  'CREATE TABLE IF NOT EXISTS short_comment(clip TEXT NOT NULL, uid TEXT NOT NULL, nonce TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(uid,nonce))',
  'CREATE INDEX IF NOT EXISTS short_comment_by_clip ON short_comment(clip)',
  'CREATE TABLE IF NOT EXISTS short_captions(clip TEXT PRIMARY KEY,cues TEXT NOT NULL)',
  'CREATE TRIGGER IF NOT EXISTS remove_clip_captions AFTER DELETE ON short_clip BEGIN DELETE FROM short_captions WHERE clip=OLD.id; END',
  ...socialSchema,
  `CREATE TRIGGER IF NOT EXISTS short_clip_cleanup AFTER DELETE ON short_clip BEGIN
    DELETE FROM short_comment_heart WHERE comment_id IN (SELECT rowid FROM short_comment WHERE clip=OLD.id);
    DELETE FROM short_comment_meta WHERE clip=OLD.id;
    DELETE FROM short_comment WHERE clip=OLD.id;
    DELETE FROM short_like WHERE clip=OLD.id;
  END`
];
export async function shortAccount(q, uid, input, json, hasStorage) {
  const {op,clip} = input;
  if(op==='shortProfileSocial'||op==='shortProfileFollow')return profileSocial(q,uid,input,json);
  if (op === 'shortProfileList') {
    const owner = input.owner ?? uid;
    const before = input.before ?? Number.MAX_SAFE_INTEGER;
    if (typeof owner !== 'string' || !owner || owner.length > 128 ||
        !Number.isSafeInteger(before) || before < 1) return json({error:'طلب غير صالح'},400);
    const {results} = await q(
      'SELECT rowid AS cursor,id,title FROM short_clip WHERE owner=? AND object_key IS NOT NULL AND rowid<? ORDER BY rowid DESC LIMIT 31',
      owner,before
    ).all();
    const clips = results.slice(0,30);
    return json({clips,canDelete:uid === owner,nextCursor:results.length > 30 ? clips.at(-1).cursor : null});
  }
  if (op === 'shortList') {
    const before = Number(input.before) || Number.MAX_SAFE_INTEGER;
    const rows = await q('SELECT rowid AS cursor,id,title,owner FROM short_clip WHERE object_key IS NOT NULL AND rowid<? ORDER BY rowid DESC LIMIT 30', before).all();
    return json({clips: rows.results.map(row => ({...row,canDelete:row.owner === uid}))});
  }
  if (op === 'shortLookup') {
    const row = publishedId.test(clip) && await q('SELECT id,title,owner FROM short_clip WHERE id=? AND object_key IS NOT NULL',clip).first();
    return json({clip: row ? {...row,canDelete:row.owner === uid} : null});
  }
  if (op === 'shortPrepare') {
    if (!hasStorage) return json({error:'تخزين الفيديوهات غير مفعّل بعد'},503);
    const cues=input.cues??[];
    if(!Array.isArray(cues)||cues.length>80||cues.some((c,i)=>!c||!Number.isFinite(c.at)||c.at<0||c.at>3600||(i>0&&c.at<=cues[i-1].at)||typeof c.text!=='string'||!c.text.trim()||c.text.length>160))return json({error:'تحقّق من توقيت النص'},400);
    await saveShortProfile(q,uid,input.profile);
    const id = crypto.randomUUID();
    const title = String(input.title || '').trim().slice(0,100);
    await q('INSERT INTO short_clip(id,owner,title) VALUES(?,?,?)',id,uid,title).run();
    if(cues.length)await q('INSERT INTO short_captions VALUES(?,?)',id,JSON.stringify(cues.map(c=>({at:c.at,text:c.text.trim()})))).run();
    return json({id});
  }
  const owner=publishedId.test(clip)?(await q('SELECT owner FROM short_clip WHERE id=? AND object_key IS NOT NULL',clip).first())?.owner:null;
  if(!owner)return json({error:'الفيديو غير متاح'},404);
  if (op === 'shortLike' || op === 'shortState') {
    if (op === 'shortLike') {
      if (typeof input.liked !== 'boolean') return json({error:'اختيار غير صالح'},400);
      if (input.liked) await q('INSERT OR IGNORE INTO short_like(clip,uid) SELECT ?,? WHERE EXISTS(SELECT 1 FROM short_clip WHERE id=? AND object_key IS NOT NULL)',clip,uid,clip).run();
      else await q('DELETE FROM short_like WHERE clip=? AND uid=?',clip,uid).run();
    }
    const state = await q('SELECT COUNT(*) AS likes, COALESCE(MAX(uid=?),0) AS liked FROM short_like WHERE clip=?',uid,clip).first();
    if(op==='shortLike' && input.likeOnly===true)return json({likes:state.likes,liked:Boolean(state.liked)});
    const captions=op==='shortState'?await q('SELECT cues FROM short_captions WHERE clip=?',clip).first():null;
    return json({...state,...(captions?{cues:JSON.parse(captions.cues)}:{}),canDelete:owner===uid,liked:Boolean(state.liked),...await authorState(q,uid,clip,owner)});
  }
  if (['shortComment','shortComments','shortCommentLike','shortFollow'].includes(op))return socialComments(q,uid,input,json,owner);
  if (op === 'shortGift') {
    const gift=diamondGifts.get(input.gift);
    if (!gift || !publishedId.test(input.nonce)) return json({error:'هدية غير صالحة'},400);
    // Video support spends from the shared purchased ledger. The empty payee never earns rewards.
    const room='short/'+clip;
    await q(`INSERT INTO paid_room_gift(sender,nonce,room,host,gift,cost,hostUnits) SELECT ?,?,?,'',?,?,0 WHERE (${paidBalance})>=? AND EXISTS(SELECT 1 FROM short_clip WHERE id=? AND object_key IS NOT NULL) ON CONFLICT(sender,nonce) DO NOTHING`,
      uid,input.nonce,room,input.gift,gift.cost,uid,uid,gift.cost,clip).run();
    const receipt=await q('SELECT room,gift FROM paid_room_gift WHERE sender=? AND nonce=?',uid,input.nonce).first();
    if (receipt?.room!==room || receipt?.gift!==input.gift) return json({error:'تعذّر إرسال الهدية. تحقّق من رصيد الماس المشترى'},409);
    return json({sent:true});
  }
  return json({error:'طلب غير صالح'},400);
}

export async function deleteShort(q, uid, id, json, bucket, videos) {
  if (typeof id !== 'string' || !publishedId.test(id)) return json({error:'لا يمكن حذف هذا الفيديو'},403);
  const row = await q('SELECT owner,object_key FROM short_clip WHERE id=?',id).first();
  if (!row) return json({deleted:true});
  if (row.owner !== uid) return json({error:'يمكن لصاحب الفيديو فقط حذفه'},403);
  if (!row.object_key) return json({error:'الفيديو غير منشور'},409);
  try {
    if (row.object_key.startsWith('cloud/')) {
      if (!videos) return json({error:'التخزين غير متاح'},503);
      const result = await removeVideo(videos, row.object_key);
      if (!result.ok) return json({error:'تعذّر حذف الفيديو. حاول مجددًا'},503);
    } else {
      if (!bucket) return json({error:'التخزين غير متاح'},503);
      await bucket.delete(row.object_key);
    }
    await q('DELETE FROM short_clip WHERE id=? AND owner=? AND object_key=?',id,uid,row.object_key).run();
    return json({deleted:true});
  } catch {
    return json({error:'تعذّر حذف الفيديو. حاول مجددًا'},503);
  }
}

export async function receiveShort(request, bucket, q, uid, id, json, videos) {
  if (!bucket && !videos) return json({error:'تخزين الفيديوهات غير مفعّل بعد'},503);
  const row=await q('SELECT object_key FROM short_clip WHERE owner=? AND id=?',uid,id).first();
  if (!row) return json({error:'الفيديو غير موجود'},404);
  if (row.object_key) return json({id});
  let key;
  if (videos) {
    key = 'cloud/' + id;
    const stored = await putVideo(videos, key, request);
    if (!stored.ok) return stored;
  } else {
    const bytes = await readMp4(request);
    if (bytes instanceof Response) return bytes;
    key = 'shorts/' + crypto.randomUUID() + '.mp4';
    await bucket.put(key, bytes, {httpMetadata: {contentType: 'video/mp4'}});
  }
  const outcome=await q('UPDATE short_clip SET object_key=? WHERE id=? AND owner=? AND object_key IS NULL',key,id,uid).run();
  if (!videos && !outcome.meta.changes) await bucket.delete(key);
  return json({id});
}

export async function serveShort(request, bucket, q, id, json, videos) {
  if (!bucket && !videos) return json({error:'التخزين غير متاح'},503);
  const row=await q('SELECT object_key FROM short_clip WHERE id=? AND object_key IS NOT NULL',id).first();
  if (!row) return json({error:'الفيديو غير موجود'},404);
  if (row.object_key.startsWith('cloud/')) {
    if (!videos) return json({error:'التخزين غير متاح'},503);
    const stored = await getVideo(videos, row.object_key, request);
    const response = new Response(stored.body, stored);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  if (!bucket) return json({error:'التخزين غير متاح'},503);
  const head = await bucket.head(row.object_key);
  if (!head) return json({error:'الفيديو غير موجود'},404);
  const spec = playback(request, head.size);
  if (spec instanceof Response) return spec;
  spec.headers.set('Cache-Control', 'private, no-store');
  const response = await bucketPlayback(request,bucket,row.object_key,head,spec);
  return response || json({error:'الفيديو غير موجود'},404);
}
