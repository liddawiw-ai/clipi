import {walletSchema,paidBalance} from './diamond-wallet.mjs';
import {diamondGifts} from './diamond-gifts.mjs';
// Room membership is scoped to a browser visit. Seat allocation is one atomic D1 statement.
const tables = [
  'CREATE TABLE IF NOT EXISTS public_numbers(number TEXT PRIMARY KEY,uid TEXT NOT NULL,cost INTEGER NOT NULL)',
  'CREATE UNIQUE INDEX IF NOT EXISTS one_standard_number ON public_numbers(uid) WHERE cost=0',
  'CREATE TABLE IF NOT EXISTS selected_number(uid TEXT PRIMARY KEY,number TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS audio_host_theme(uid TEXT PRIMARY KEY,theme TEXT NOT NULL,image TEXT)',
  'CREATE TABLE IF NOT EXISTS room_theme(room TEXT PRIMARY KEY,theme TEXT NOT NULL,image TEXT)',
  'CREATE TABLE IF NOT EXISTS room_policy (room TEXT PRIMARY KEY,pin TEXT NOT NULL DEFAULT \'\',locked INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS room_member (room TEXT,uid TEXT,visit TEXT,name TEXT,frame INTEGER DEFAULT 1,ride INTEGER DEFAULT 1,seat INTEGER DEFAULT 0,waiting INTEGER DEFAULT 0,muted INTEGER DEFAULT 0,banned INTEGER DEFAULT 0,joined INTEGER,seen INTEGER,PRIMARY KEY(room,uid))',
  'CREATE TABLE IF NOT EXISTS room_attempt (room TEXT,uid TEXT,bucket INTEGER,hits INTEGER,PRIMARY KEY(room,uid))',
  'CREATE TABLE IF NOT EXISTS room_gift_target (payment TEXT PRIMARY KEY,uid TEXT,name TEXT)',
  'CREATE TABLE IF NOT EXISTS room_chat (id INTEGER PRIMARY KEY,room TEXT,uid TEXT,name TEXT,text TEXT)',
  'CREATE TABLE IF NOT EXISTS support_gift (sender TEXT, nonce TEXT, room TEXT NOT NULL, recipient TEXT NOT NULL, cost INTEGER NOT NULL CHECK(cost IN (10,50,100)), PRIMARY KEY(sender,nonce))',
  `CREATE TRIGGER IF NOT EXISTS announce_support_gift AFTER INSERT ON support_gift BEGIN
    INSERT INTO room_chat(room,uid,name,text) VALUES(NEW.room,NEW.sender,
      (SELECT name FROM room_member WHERE room=NEW.room AND uid=NEW.sender),
      '🎁 دعم ' || NEW.cost || ' 💎 إلى ' || (SELECT name FROM room_member WHERE room=NEW.room AND uid=NEW.recipient) || ' · غير نقدي'); END`,
  'CREATE TABLE IF NOT EXISTS diamond_gift (sender TEXT, nonce TEXT, room TEXT NOT NULL, recipient TEXT NOT NULL, gift TEXT NOT NULL, cost INTEGER NOT NULL CHECK(cost>0), PRIMARY KEY(sender,nonce))',
  `CREATE TRIGGER IF NOT EXISTS announce_diamond_gift AFTER INSERT ON diamond_gift BEGIN
    INSERT INTO room_chat(room,uid,name,text) VALUES(NEW.room,NEW.sender,
      (SELECT name FROM room_member WHERE room=NEW.room AND uid=NEW.sender),
      '🎁 ' || NEW.gift || ' · ' || NEW.cost || ' 💎 إلى ' || (SELECT name FROM room_member WHERE room=NEW.room AND uid=NEW.recipient)); END`,
  'CREATE TABLE IF NOT EXISTS room_host(room TEXT PRIMARY KEY,uid TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS room_lock(room TEXT,slot INTEGER,PRIMARY KEY(room,slot))',
  ...walletSchema,
  'CREATE INDEX IF NOT EXISTS room_chat_recent ON room_chat(room,id)'
];
let initialized=false;
export async function roomStore(db) {
  if(!initialized){await db.batch(tables.map(sql=>db.prepare(sql)));initialized=true}
  return (sql,...args)=>db.prepare(sql).bind(...args);
}
async function pinHash(secret,room,pin){
  const bytes=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',bytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes.encode(JSON.stringify([room,pin])))),n=>n.toString(16).padStart(2,'0')).join('');
}
export async function roomControls({env,input,room,user,host,ownerUid,type,path,json,disconnect,mediaToken}){
  const q=await roomStore(env.PI_GIFTS_DB);
  const now=Math.floor(Date.now()/1000), cutoff=now-90;
  const policy=await q('SELECT * FROM room_policy WHERE room=?',room).first();
  const member=await q('SELECT * FROM room_member WHERE room=? AND uid=?',room,user).first();
  const visit=input.session;
  if(member?.banned)return json({error:'أخرجك المضيف من الغرفة'},403);
  if(path==='/token'){
    if(!visit && !policy && !member)return null; // Existing clients in an unmanaged room.
    if(!member||member.visit!==visit||member.seen<cutoff)return json({error:'أعد الدخول إلى الغرفة'},403);
    return {publisher:host||Boolean(member.seat&&!member.muted),name:member.name};
  }
  if(typeof visit!=='string'||!/^[a-f0-9-]{36}$/.test(visit))return json({error:'جلسة غير صالحة'},400);
  const op=input.op;
  if(!['join','poll','leave','slot','settings','request','cancel','approve','reject','demote','ban','eject','kick','mute','unmute','message','deleteMessage','supportGift','catalogGift','paidGift'].includes(op))return json({error:'طلب غير صالح'},400);
  if(!host&&['join','poll'].includes(op)&&!await q('SELECT 1 FROM room_member WHERE room=? AND uid=? AND seen>=?',room,ownerUid,cutoff).first())return json({error:'انتهى البث'},404);
  if(op==='join'){
    const name=String(input.name||'ضيف').trim().slice(0,35)||'ضيف';
    if(!host&&policy?.pin && !(member?.visit===visit && member.seen>=cutoff)){
      if(!/^\d{4}$/.test(input.pin||''))return json({error:'أدخل رمز الغرفة',pinRequired:true},403);
      const bucket=Math.floor(now/600);
      const attempt=await q('INSERT INTO room_attempt VALUES(?,?,?,1) ON CONFLICT(room,uid) DO UPDATE SET hits=CASE WHEN bucket=excluded.bucket THEN hits+1 ELSE 1 END,bucket=excluded.bucket RETURNING hits',room,user,bucket).first();
      if(attempt.hits>5)return json({error:'محاولات كثيرة. حاول بعد عشر دقائق'},429);
      if(await pinHash(env.LIVEKIT_API_SECRET,room,input.pin)!==policy.pin)return json({error:'رمز الغرفة غير صحيح',pinRequired:true},403);
    }
    const entered=await q(`INSERT INTO room_member(room,uid,visit,name,frame,ride,joined,seen)
      SELECT ?,?,?,?,?,?,?,? WHERE COALESCE((SELECT pin FROM room_policy WHERE room=?),'')=?
      ON CONFLICT(room,uid) DO UPDATE SET visit=excluded.visit,name=excluded.name,frame=excluded.frame,ride=excluded.ride,
      seat=CASE WHEN visit=excluded.visit AND seen>=? THEN seat ELSE 0 END,muted=CASE WHEN visit=excluded.visit THEN muted ELSE 0 END,waiting=CASE WHEN visit=excluded.visit THEN waiting ELSE 0 END,
      joined=CASE WHEN visit=excluded.visit THEN joined ELSE excluded.joined END,seen=excluded.seen WHERE banned=0`,
      room,user,visit,name,Number(Boolean(input.frame)),Number(Boolean(input.ride)),now,now,room,policy?.pin||'',cutoff).run();
    if(!entered.meta.changes){
      const currentPolicy=await q('SELECT length(pin)>0 AS protected FROM room_policy WHERE room=?',room).first();
      return json({error:'تغيرت صلاحية الدخول، أعد المحاولة',pinRequired:!host&&Boolean(currentPolicy?.protected)},403);
    }
  } else if(!member||member.visit!==visit||member.seen<cutoff)return json({error:'انتهت جلسة الغرفة'},403);
  if(host&&(op==='join'||(op==='poll'&&now-member.seen>=20)))await q('INSERT OR REPLACE INTO room_host VALUES(?,?)',room,user).run();
  if(host&&type==='audio'&&op==='join'){
    await env.PI_GIFTS_DB.batch([
      q('INSERT OR IGNORE INTO audio_host_theme(uid,theme,image) SELECT ?,theme,image FROM room_theme WHERE room=?',user,room),
      q('INSERT OR IGNORE INTO audio_host_theme(uid,theme,image) SELECT ?,t.theme,t.image FROM room_theme t JOIN room_host h ON h.room=t.room WHERE h.uid=? ORDER BY t.rowid DESC LIMIT 1',user,user),
      q('INSERT OR REPLACE INTO room_theme(room,theme,image) SELECT ?,theme,image FROM audio_host_theme WHERE uid=?',room,user)
    ]);
  }
  if(op==='slot'){
    const slot=input.slot;
    if(!host||type!=='audio'||!Number.isInteger(slot)||slot<0||slot>8||typeof input.locked!=='boolean')return json({error:'طلب غير صالح'},403);
    if(slot===0){
      if(input.locked)await q('INSERT OR IGNORE INTO room_lock VALUES(?,0)',room).run();
      else await q('DELETE FROM room_lock WHERE room=? AND slot=0',room).run();
    }else if(input.locked){
      const [,removed]=await env.PI_GIFTS_DB.batch([q('INSERT OR IGNORE INTO room_lock VALUES(?,?)',room,slot),q('UPDATE room_member SET seat=0,waiting=0 WHERE room=? AND seat=? RETURNING uid',room,slot)]);
      for(const occupant of removed.results)await disconnect(occupant.uid);
    }else await q('DELETE FROM room_lock WHERE room=? AND slot=?',room,slot).run();
  }
  if(op==='settings'){
    if(!host)return json({error:'للمضيف فقط'},403);
    if(input.theme!==undefined){
      const builtins=['default','palace','aurora','dunes'];
      const photo=input.theme==='upload'&&typeof input.image==='string'&&input.image.length<=620000&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+=*$/.test(input.image);
      if(!builtins.includes(input.theme)&&!photo)return json({error:'صورة غير صالحة'},400);
      const theme=photo?crypto.randomUUID():input.theme;
      const image=photo?input.image:null;
      const writes=[q('INSERT OR REPLACE INTO room_theme(room,theme,image) VALUES(?,?,?)',room,theme,image)];
      if(type==='audio')writes.push(q('INSERT OR REPLACE INTO audio_host_theme(uid,theme,image) VALUES(?,?,?)',user,theme,image));
      await env.PI_GIFTS_DB.batch(writes);
    }
    if(input.pin!==undefined){
      if(input.pin!==''&&!/^\d{4}$/.test(input.pin))return json({error:'أدخل أربعة أرقام'},400);
      await q('INSERT INTO room_policy(room,pin) VALUES(?,?) ON CONFLICT(room) DO UPDATE SET pin=excluded.pin',room,input.pin?await pinHash(env.LIVEKIT_API_SECRET,room,input.pin):'').run();
    }
    if(typeof input.locked==='boolean')await q('INSERT INTO room_policy(room,locked) VALUES(?,?) ON CONFLICT(room) DO UPDATE SET locked=excluded.locked',room,Number(input.locked)).run();
  }
  const capacity=type==='audio'?8:1;
  const claim=(uid,condition,slot=null)=>q(`WITH RECURSIVE slots(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM slots WHERE n<?),
    available AS (SELECT MIN(n) AS n FROM slots WHERE (? IS NULL OR n=?) AND NOT EXISTS(SELECT 1 FROM room_lock WHERE room=? AND slot=n)
    AND NOT EXISTS(SELECT 1 FROM room_member WHERE room=? AND seat=n AND seen>=?))
    UPDATE room_member SET seat=(SELECT n FROM available),waiting=0 WHERE room=? AND uid=? AND banned=0 AND seen>=? AND seat=0 AND (SELECT n FROM available) IS NOT NULL AND `+condition,capacity,slot,slot,room,room,cutoff,room,uid,cutoff);
  if(op==='request'&&!host){
    const slot=input.slot;
    if(slot!==undefined&&(type!=='audio'||!Number.isInteger(slot)||slot<1||slot>capacity))return json({error:'المقعد غير صالح'},400);
    if(slot!==undefined)await claim(user,'NOT EXISTS(SELECT 1 FROM room_policy p WHERE p.room=room_member.room AND locked=1)',slot).run();
    await q('UPDATE room_member SET waiting=1 WHERE room=? AND uid=? AND seat=0',room,user).run();
  }
  if(op==='cancel')await q('UPDATE room_member SET waiting=0 WHERE room=? AND uid=?',room,user).run();
  if(['approve','reject','demote','ban','eject','kick','mute','unmute'].includes(op)){
    if(!host||typeof input.uid!=='string'||input.uid===user)return json({error:'للـمضيف فقط'},403);
    const uid=input.uid;
    if(op==='approve'){
      const r=await claim(uid,'waiting=1').run();
      if(!r.meta.changes)return json({error:'المقعد ممتلئ أو انتهى الطلب'},409);
    }else{
      const update={reject:'waiting=0',demote:'seat=0,waiting=0,muted=0',kick:'seat=0,waiting=0,banned=1',ban:'seat=0,waiting=0,banned=1',eject:"seat=0,waiting=0,seen=0,visit=''",mute:'muted=1',unmute:'muted=0'}[op];
      await q('UPDATE room_member SET '+update+' WHERE room=? AND uid=?',room,uid).run();
      if(['ban','eject','kick','mute','demote'].includes(op))await disconnect(uid);
    }
  }
  if(op==='leave'){
    await q('DELETE FROM room_member WHERE room=? AND uid=? AND visit=? AND banned=0',room,user,visit).run();
    return json({ok:true});
  }
  // Support gifts live only in this ledger. They never enter Pi payments or withdrawal balances.
  const allowance = 100 + (env.CLIPI_OWNER_UID === user ? 100000000 : 0);
  const spentSql='(SELECT COALESCE(SUM(cost),0) FROM support_gift WHERE sender=?) + (SELECT COALESCE(SUM(cost),0) FROM diamond_gift WHERE sender=?) + (SELECT COALESCE(SUM(cost),0) FROM public_numbers WHERE uid=?)';
  if(op==='paidGift'){
    const {gift,cost,nonce}=input;
    if(!ownerUid||ownerUid===user||diamondGifts.get(gift)?.cost!==cost||!Number.isSafeInteger(cost)||typeof nonce!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(nonce))return json({error:'Invalid support gift'},400);
    // New gifts contribute to cumulative rewards. Existing per-gift credits stay in hostUnits.
    await q(`INSERT INTO paid_room_gift(sender,nonce,room,host,gift,cost,hostUnits) SELECT ?,?,?,?,?,?,? WHERE (${paidBalance})>=? AND EXISTS(SELECT 1 FROM room_member WHERE room=? AND uid=? AND banned=0 AND seen>=?) ON CONFLICT(sender,nonce) DO NOTHING`,user,nonce,room,ownerUid,gift,cost,0,user,user,cost,room,ownerUid,cutoff).run();
    const sent=await q('SELECT * FROM paid_room_gift WHERE sender=? AND nonce=?',user,nonce).first();
    if(sent?.gift!==gift||sent.cost!==cost||sent.room!==room||sent.host!==ownerUid)return json({error:'Purchased diamonds insufficient or host offline'},409);
  }
  if(op==='supportGift'||op==='catalogGift'){
    const {cost,recipient,nonce}=input;
    const named=op==='catalogGift';
    const entry=diamondGifts.get(input.gift);
    if((named ? !entry || entry.cost!==cost : ![10,50,100].includes(cost))||typeof recipient!=='string'||
       typeof nonce!=='string'||!/^[a-f0-9-]{36}$/.test(nonce))return json({error:'هدية غير صالحة'},400);
    if(recipient===user){
      // Both clients play the selected effect locally after a successful response.
      if(named&&host)return json({preview:true});
      return json({error:'اختر مستلمًا آخر للهدية'},400);
    }
    const table=named?'diamond_gift':'support_gift';
    const result=await q(`INSERT INTO ${table}(sender,nonce,room,recipient,cost${named?',gift':''})
      SELECT ?,?,?,?,?${named?',?':''} WHERE ? >= ? + ${spentSql}
      AND EXISTS(SELECT 1 FROM room_member WHERE room=? AND uid=? AND banned=0 AND seen>=?)
      ON CONFLICT(sender,nonce) DO NOTHING`,user,nonce,room,recipient,cost,...(named?[input.gift]:[]),allowance,cost,user,user,user,room,recipient,cutoff).run();
    if(!result.meta.changes){
      const prior=await q(`SELECT * FROM ${table} WHERE sender=? AND nonce=?`,user,nonce).first();
      if(prior?.room!==room||prior.recipient!==recipient||prior.cost!==cost||(named&&prior.gift!==input.gift))return json({error:'الرصيد غير كافٍ أو المستلم غادر الغرفة'},409);
    }
  }
  if(op==='message'){
    const text=String(input.text||'').trim();
    if(!text||text.length>500)return json({error:'تعليق غير صالح'},400);
    await q('INSERT INTO room_chat(room,uid,name,text) VALUES(?,?,?,?)',room,user,member.name,text).run();
  }
  if(op==='deleteMessage')await q('DELETE FROM room_chat WHERE room=? AND id=? AND (uid=? OR ?=1)',room,input.id,user,Number(host)).run();
  if(member&&now-member.seen>=20)await q('UPDATE room_member SET seen=? WHERE room=? AND uid=? AND visit=?',now,room,user,visit).run();
  const [people,settings,history]=await Promise.all([
    q('SELECT uid,name,frame,ride,seat,waiting,muted,joined FROM room_member WHERE room=? AND banned=0 AND seen>=? ORDER BY joined,uid',room,cutoff).all(),
    q('SELECT locked,length(pin)>0 AS protected FROM room_policy WHERE room=?',room).first(),
    q('SELECT id,uid AS userUid,name AS userName,text FROM room_chat WHERE room=? ORDER BY id DESC LIMIT 100',room).all()
  ]);
  const me=people.results.find(person=>person.uid===user);
  if(!me)return json({error:'انتهت جلسة الغرفة'},403);
  const media=op==='join'&&mediaToken?await mediaToken(host||Boolean(me.seat&&!me.muted)):undefined;
  const spent=await q(`SELECT ${spentSql} AS total`,user,user,user).first();
  const theme=await q('SELECT theme FROM room_theme WHERE room=?',room).first();
  const locks=await q('SELECT slot FROM room_lock WHERE room=?',room).all();
  return json({lockedSlots:locks.results.map(row=>row.slot),theme:theme?.theme||'default',supportBalance:Math.max(0,allowance-spent.total),media,people:people.results,locked:Boolean(settings?.locked),protected:Boolean(settings?.protected),chat:history.results.reverse()});
}
