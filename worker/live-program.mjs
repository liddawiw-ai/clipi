export const programSchema=[
  'CREATE TABLE IF NOT EXISTS room_listing(room TEXT PRIMARY KEY,language TEXT NOT NULL,topic TEXT NOT NULL)',
  "CREATE TABLE IF NOT EXISTS live_event(id TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,starts INTEGER NOT NULL,type TEXT NOT NULL,language TEXT NOT NULL,topic TEXT NOT NULL,room TEXT NOT NULL DEFAULT '')",
  "CREATE UNIQUE INDEX IF NOT EXISTS one_pending_event ON live_event(owner) WHERE room=''",
  'CREATE TABLE IF NOT EXISTS live_reminder(event TEXT,uid TEXT,seen INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(event,uid))',
  'CREATE TRIGGER IF NOT EXISTS clear_event_reminders AFTER DELETE ON live_event BEGIN DELETE FROM live_reminder WHERE event=OLD.id; END'
];
export const topics=['social','games','music','help','other'];
const validTags=(language,topic)=>typeof language==='string'&&/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(language)&&topics.includes(topic);
export async function liveProgram(q,uid,input,json,now=Date.now()){
  const {op,event:id}=input;
  if(op==='eventList'){
    const rows=await q(`SELECT e.id,e.owner,e.starts,e.name,e.type,e.language,e.topic,e.room,EXISTS(SELECT 1 FROM live_reminder r WHERE r.event=e.id AND r.uid=?) AS interested
      FROM live_event e WHERE e.starts>=? AND e.room='' ORDER BY e.starts LIMIT 100`,uid,now-86400000).all();
    const alerts=await q(`SELECT e.id,e.name,e.room,e.owner FROM live_event e JOIN live_reminder r ON r.event=e.id
      JOIN room_member m ON m.room=e.room AND m.uid=e.owner WHERE r.uid=? AND r.seen=0 AND m.seen>=? AND e.room<>'' LIMIT 3`,uid,Math.floor(now/1000)-90).all();
    return json({events:rows.results,alerts:alerts.results});
  }
  if(op==='eventCreate'){
    const {starts,type,topic,language}=input,name=String(input.name||'').trim();
    if(!name||name.length>55||!Number.isSafeInteger(starts)||starts<now+60000||starts>now+90*86400000||!validTags(language,topic)||!['audio','video'].includes(type))return json({error:'تحقّق من الموعد والعنوان'},400);
    await q("DELETE FROM live_event WHERE owner=? AND room='' AND starts<?",uid,now-86400000).run();
    const id=crypto.randomUUID();
    const res=await q("INSERT OR IGNORE INTO live_event(id,owner,name,starts,type,language,topic) VALUES(?,?,?,?,?,?,?)",id,uid,name,starts,type,language,topic).run();
    return res.meta.changes?json({id}):json({error:'عندك بث مجدول بالفعل'},409);
  }
  if(typeof id!=='string'||id.length>64)return json({error:'طلب غير صالح'},400);
  if(op==='eventCancel'){await q("DELETE FROM live_event WHERE id=? AND owner=? AND room=''",id,uid).run();return json({ok:true})}
  if(op==='eventSeen'){await q('UPDATE live_reminder SET seen=1 WHERE event=? AND uid=?',id,uid).run();return json({ok:true})}
  if(op==='eventRemind'&&typeof input.enabled==='boolean'){
    if(input.enabled)await q("INSERT OR IGNORE INTO live_reminder(event,uid) SELECT id,? FROM live_event WHERE id=? AND room=''",uid,id).run();
    else await q('DELETE FROM live_reminder WHERE event=? AND uid=?',id,uid).run();
    return json({ok:true});
  }
  return json({error:'طلب غير صالح'},400);
}
export async function tagRoom(q,uid,room,input,json){
  if(!validTags(input.language,input.topic))return json({error:'طلب غير صالح'},400);
  await q('INSERT INTO room_listing(room,language,topic) VALUES(?,?,?) ON CONFLICT(room) DO UPDATE SET language=excluded.language,topic=excluded.topic',room,input.language,input.topic).run();
  if(input.event)await q("UPDATE live_event SET room=? WHERE id=? AND owner=? AND room=''",room,input.event,uid).run();
  return json({ok:true});
}
