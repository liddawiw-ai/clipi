import {removeVideo} from './video-storage.mjs';
import {deleteShort} from './short-videos.mjs';
import {linkStore} from './pi-account-link.mjs';
import {isAppOwner} from './app-owners.mjs';

export const erasureSchema = [
  "CREATE TABLE IF NOT EXISTS account_erasure(ticket TEXT PRIMARY KEY, uid TEXT UNIQUE NOT NULL, cleaned INTEGER NOT NULL DEFAULT 0)",
  "CREATE TABLE IF NOT EXISTS pi_account_generation(subject_hash TEXT PRIMARY KEY, current_uid TEXT NOT NULL UNIQUE)",
];
const ticketPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
async function subjectHash(subject) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subject));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2,'0')).join('');
}
export async function piAccountUid(db, original) {
  if (!db) return original;
  await db.prepare(erasureSchema[1]).bind().run();
  const row = await db.prepare('SELECT current_uid FROM pi_account_generation WHERE subject_hash=?').bind(await subjectHash(original)).first();
  return row?.current_uid || original;
}

export function isErasing(q, uid) {
  return q('SELECT 1 FROM account_erasure WHERE uid=?', uid).first();
}

function operatorAuthorized(request, secret) {
  if (typeof secret !== 'string' || secret.length < 32) return false;
  const actual = request.headers.get('Authorization') || '';
  const expected = 'Bearer ' + secret;
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i=0;i<expected.length;i++) diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return diff === 0;
}

const ownedRooms = '(SELECT room FROM room_host WHERE uid=?1 UNION SELECT previous FROM room_continuation WHERE owner=?1 UNION SELECT session FROM room_continuation WHERE owner=?1 UNION SELECT root FROM room_continuation WHERE owner=?1)';
async function clearContent(env, q, uid, ticket) {
  const {results:clips} = await q('SELECT id,object_key FROM short_clip WHERE owner=? LIMIT 6',uid).all();
  for (const clip of clips) {
    if(!clip.object_key){
      if(env.CLIP_MEDIA){
        const resp=await removeVideo(env.CLIP_MEDIA,'cloud/'+clip.id);
        if(!resp.ok)throw Error('Video storage unavailable');
      }
      await q('DELETE FROM short_clip WHERE owner=? AND id=? AND object_key IS NULL',uid,clip.id).run();
      continue;
    }
    const r = await deleteShort(q,uid,clip.id,(body,status=200)=>Response.json(body,{status}),env.SHORT_VIDEOS,env.CLIP_MEDIA);
    if (!r.ok || !(await r.json()).deleted) throw Error('Video storage unavailable');
  }
  if (clips.length === 6) return false;
  const queries = [
    'DELETE FROM short_comment_heart WHERE uid=?1 OR comment_id IN (SELECT rowid FROM short_comment WHERE uid=?1)',
    'UPDATE short_comment_meta SET parent=NULL WHERE parent IN (SELECT rowid FROM short_comment WHERE uid=?1)',
    'DELETE FROM short_comment_meta WHERE uid=?1', 'DELETE FROM short_comment WHERE uid=?1',
    'DELETE FROM short_like WHERE uid=?1','DELETE FROM short_follow WHERE viewer=?1 OR owner=?1',
    'DELETE FROM short_profile WHERE uid=?1','DELETE FROM live_event WHERE owner=?1','DELETE FROM live_reminder WHERE uid=?1',
    'DELETE FROM audio_host_theme WHERE uid=?1','DELETE FROM room_cover WHERE root IN '+ownedRooms,
    ...['room_theme','room_listing','room_chat_filter','room_chat_config','room_policy','room_shield','room_lock','room_mic_mode','room_chat_activity'].map(table=>'DELETE FROM '+table+' WHERE room IN '+ownedRooms),
    ...['room_member','room_admin','room_chat_clock','room_attempt','room_chat','room_donor_name','room_entrance_id'].map(table=>'DELETE FROM '+table+' WHERE uid=?1 OR room IN '+ownedRooms),
    'DELETE FROM broadcast_invite WHERE sender=?1 OR recipient=?1 OR room IN '+ownedRooms,
    'DELETE FROM broadcast_invite_start WHERE sender=?1 OR room IN '+ownedRooms,
    'DELETE FROM room_continuation WHERE owner=?1','DELETE FROM room_host WHERE uid=?1',
    'DELETE FROM game_tables WHERE code IN (SELECT code FROM game_members WHERE uid=?1)',
    'DELETE FROM gift_avatar WHERE uid=?1','DELETE FROM room_gift_target WHERE uid=?1',
    'DELETE FROM selected_number WHERE uid=?1','DELETE FROM public_numbers WHERE uid=?1',
    'DELETE FROM clipi_app_admin WHERE uid=?1','DELETE FROM clipi_agency_member WHERE uid=?1',
    'DELETE FROM clipi_trial_activity WHERE uid=?1',
    "DELETE FROM support_case WHERE uid=?1 AND kind NOT IN ('deletion','purchase')",
    // A retained report can refer to someone else's deleted comment. Remove the snapshot and its author.
    "UPDATE support_case SET subject='' WHERE kind='comment' AND json_valid(subject) AND CASE WHEN json_valid(subject) THEN json_extract(subject,'$.uid') END=?1",
  ];
  const db=env.PI_GIFTS_DB;
  if(await linkStore(env)) queries.push('DELETE FROM clipi_pi_login_link WHERE pi_uid=?1 OR email_uid=?1');
  const statements=queries.map(sql=>db.prepare(sql.replaceAll('?1','?')).bind(...Array(sql.split('?1').length-1).fill(uid)));
  statements.push(db.prepare('UPDATE account_erasure SET cleaned=1 WHERE ticket=? AND uid=?').bind(ticket,uid));
  await db.batch(statements);
  return true;
}

export async function operatorErasure(request,env,store,json) {
  if (!operatorAuthorized(request,env.CLIPI_ERASURE_KEY)) return json({error:'Not found'},404);
  if(request.method!=='POST')return json({error:'POST required'},405);
  const body=await request.json().catch(()=>null);
  if(!ticketPattern.test(body?.ticket||'') || body.project!==env.FIREBASE_PROJECT_ID) return json({error:'Invalid ticket or project'},400);
  const q=await store(env.PI_GIFTS_DB);
  const row=await q("SELECT uid,state FROM support_case WHERE id=? AND kind='deletion'",body.ticket).first();
  if(!row) return json({error:'No deletion request with that reference'},404);
  if(row.state==='completed') return json({state:'completed'});
  if(row.state!=='open') return json({error:'Request is not open'},409);
  const uid=row.uid;
  if(body.action==='inspect') return json({uid,project:env.FIREBASE_PROJECT_ID,state:row.state});
  if(!['start','room','content','finish'].includes(body.action))return json({error:'Unknown operation'},400);
  if(await isAppOwner(q,uid,env.CLIPI_OWNER_UID)||await q('SELECT 1 FROM clipi_agency WHERE agent=?',uid).first()) {
    return json({error:'Transfer this account’s active ownership before deletion'},409);
  }
  if(body.action==='start'){
    await q('INSERT OR IGNORE INTO account_erasure(ticket,uid) VALUES(?,?)',body.ticket,uid).run();
  }
  const active=await q('SELECT cleaned FROM account_erasure WHERE ticket=? AND uid=?',body.ticket,uid).first();
  if(!active)return json({error:'Start this request first'},409);
  if(body.action==='start')return json({state:'processing'});
  // The trusted Firestore sweep can also find rooms created before the host joined.
  if(body.action==='room'){
    if(typeof body.room!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(body.room))return json({error:'Invalid room'},400);
    const root=(await q('SELECT root FROM room_continuation WHERE session=?',body.room).first())?.root||body.room;
    await q('DELETE FROM room_cover WHERE root=?',root).run();
    await q('DELETE FROM room_theme WHERE room=?',body.room).run();
    return json({ok:true});
  }
  if(body.action==='content'){
    try{return json({cleaned:!!active.cleaned || await clearContent(env,q,uid,body.ticket)})}
    catch{return json({error:'Content cleanup incomplete; retry this ticket'},503)}
  }
  if(!active.cleaned)return json({error:'Content cleanup is incomplete'},409);
  const db=env.PI_GIFTS_DB, commands=[];
  if(uid.startsWith('pi:')){
    const current=await q('SELECT subject_hash FROM pi_account_generation WHERE current_uid=?',uid).first();
    const hash=current?.subject_hash||await subjectHash(uid);
    commands.push(db.prepare('INSERT INTO pi_account_generation(subject_hash,current_uid) VALUES(?,?) ON CONFLICT(subject_hash) DO UPDATE SET current_uid=excluded.current_uid WHERE current_uid=?').bind(hash,'pi:new-'+crypto.randomUUID(),uid));
  }
  commands.push(db.prepare("UPDATE support_case SET uid='',state='completed' WHERE id=? AND uid=? AND state='open'").bind(body.ticket,uid),
    db.prepare('DELETE FROM account_erasure WHERE ticket=? AND uid=?').bind(body.ticket,uid));
  await db.batch(commands);
  return json({state:'completed'});
}
