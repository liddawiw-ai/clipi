import {coverSchema} from './room-cover.mjs';
import {programSchema} from './live-program.mjs';
import {roomHistorySchema,rootFor,roomDiamonds,roomSupporters} from './room-history.mjs';
import {broadcastAccessSchema,inviteFriendsAtStart,roomInvites,manageRoomAdmins} from './broadcast-access.mjs';
import {appOwnerSchema,isAppOwner} from './app-owners.mjs';
import {tableSchema} from './profile-tables.mjs';
import {trialSchema} from './trial-diamonds.mjs';
import {agencySchema} from './agencies.mjs';
import {shortSchema} from './short-videos.mjs';
import {walletSchema,paidBalance} from './diamond-wallet.mjs';
import {diamondGifts} from './diamond-gifts.mjs';
// Room membership is scoped to a browser visit. Seat allocation is one atomic D1 statement.
const tables = [
  coverSchema,
  ...programSchema,
  appOwnerSchema,
  'CREATE TABLE IF NOT EXISTS public_numbers(number TEXT PRIMARY KEY,uid TEXT NOT NULL,cost INTEGER NOT NULL)',
  'CREATE UNIQUE INDEX IF NOT EXISTS one_standard_number ON public_numbers(uid) WHERE cost=0',
  'CREATE TABLE IF NOT EXISTS selected_number(uid TEXT PRIMARY KEY,number TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS audio_host_theme(uid TEXT PRIMARY KEY,theme TEXT NOT NULL,image TEXT)',
  'CREATE TABLE IF NOT EXISTS room_theme(room TEXT PRIMARY KEY,theme TEXT NOT NULL,image TEXT)',
  'CREATE TABLE IF NOT EXISTS room_policy (room TEXT PRIMARY KEY,pin TEXT NOT NULL DEFAULT \'\',locked INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS room_member (room TEXT,uid TEXT,visit TEXT,name TEXT,frame INTEGER DEFAULT 1,ride INTEGER DEFAULT 1,seat INTEGER DEFAULT 0,waiting INTEGER DEFAULT 0,muted INTEGER DEFAULT 0,banned INTEGER DEFAULT 0,joined INTEGER,seen INTEGER,PRIMARY KEY(room,uid))',
  'CREATE TABLE IF NOT EXISTS room_entrance_id(room TEXT,uid TEXT,token TEXT NOT NULL,PRIMARY KEY(room,uid))',
  `CREATE TRIGGER IF NOT EXISTS room_entry_insert AFTER INSERT ON room_member
    BEGIN INSERT INTO room_entrance_id VALUES(NEW.room,NEW.uid,lower(hex(randomblob(12)))) ON CONFLICT(room,uid) DO UPDATE SET token=excluded.token; END`,
  `CREATE TRIGGER IF NOT EXISTS room_entry_visit AFTER UPDATE OF visit ON room_member WHEN OLD.visit<>NEW.visit
    BEGIN INSERT INTO room_entrance_id VALUES(NEW.room,NEW.uid,lower(hex(randomblob(12)))) ON CONFLICT(room,uid) DO UPDATE SET token=excluded.token; END`,
  `CREATE TRIGGER IF NOT EXISTS room_entry_leave AFTER DELETE ON room_member
    BEGIN DELETE FROM room_entrance_id WHERE room=OLD.room AND uid=OLD.uid; END`,
  'CREATE TABLE IF NOT EXISTS gift_avatar(uid TEXT PRIMARY KEY, avatar TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS room_attempt (room TEXT,uid TEXT,bucket INTEGER,hits INTEGER,PRIMARY KEY(room,uid))',
  'CREATE TABLE IF NOT EXISTS room_gift_target (payment TEXT PRIMARY KEY,uid TEXT,name TEXT)',
  'CREATE TABLE IF NOT EXISTS room_chat_config(room TEXT PRIMARY KEY,slow INTEGER NOT NULL DEFAULT 0,pin INTEGER)',
  'CREATE TABLE IF NOT EXISTS room_shield(room TEXT PRIMARY KEY)',
  'CREATE TABLE IF NOT EXISTS room_chat_filter(room TEXT PRIMARY KEY,words TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS room_chat_clock(room TEXT,uid TEXT,stamp INTEGER,token TEXT,PRIMARY KEY(room,uid))',
  "CREATE TABLE IF NOT EXISTS support_case(id TEXT PRIMARY KEY,uid TEXT NOT NULL,kind TEXT NOT NULL,subject TEXT NOT NULL,detail TEXT NOT NULL,created INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'open')",
  "CREATE UNIQUE INDEX IF NOT EXISTS pending_account_deletion ON support_case(uid) WHERE kind='deletion' AND state='open'",
  'CREATE INDEX IF NOT EXISTS case_by_user ON support_case(uid,created)',
  'CREATE TABLE IF NOT EXISTS room_chat_activity(room TEXT PRIMARY KEY,revision INTEGER NOT NULL)',
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
  ...roomHistorySchema,
  ...broadcastAccessSchema,
  ...agencySchema,
  ...trialSchema,
  ...shortSchema,
  ...tableSchema,
  'CREATE INDEX IF NOT EXISTS recent_paid_room_gifts ON paid_room_gift(room)',
  'CREATE INDEX IF NOT EXISTS diamond_gift_by_room ON diamond_gift(room)',
  'CREATE INDEX IF NOT EXISTS diamond_gift_by_recipient ON diamond_gift(recipient)',
  'CREATE INDEX IF NOT EXISTS support_gift_by_room ON support_gift(room)',
  'CREATE INDEX IF NOT EXISTS support_gift_by_recipient ON support_gift(recipient)',
  // Prefer the latest ledger if an imported historical receipt appears in two formats.
  `CREATE VIEW IF NOT EXISTS room_level_gifts AS
    SELECT sender,room,host AS recipient,cost FROM paid_room_gift WHERE host<>'' AND room NOT LIKE 'short/%'
    UNION ALL
    SELECT d.sender,d.room,d.recipient,d.cost FROM diamond_gift d
      WHERE NOT EXISTS (SELECT 1 FROM paid_room_gift p WHERE p.sender=d.sender AND p.nonce=d.nonce)
    UNION ALL
    SELECT s.sender,s.room,s.recipient,s.cost FROM support_gift s
      WHERE NOT EXISTS (SELECT 1 FROM paid_room_gift p WHERE p.sender=s.sender AND p.nonce=s.nonce)
        AND NOT EXISTS (SELECT 1 FROM diamond_gift d WHERE d.sender=s.sender AND d.nonce=s.nonce)`,
  'CREATE INDEX IF NOT EXISTS room_chat_recent ON room_chat(room,id)'
];
let initialized=false;
export async function roomStore(db) {
  if(!initialized){await db.batch(tables.map(sql=>db.prepare(sql)));initialized=true}
  return (sql,...args)=>db.prepare(sql).bind(...args);
}
// Existing audio rooms use seat 0 for the owner's main mic and for listeners.
// Number 9 represents a deliberate move to the main mic. An off-stage owner uses -1.
export const helpRoomId='clipi-admin-help';
export const helpRoomName='الإدارة';
const MAIN_MIC=9;
function mayPublish(member,host,type){
  if(type!=='audio')return (host&&member.seat>=0)||Boolean(member.seat>0&&!member.muted);
  return !member.muted&&(member.seat>0||(host&&member.seat===0));
}
async function pinHash(secret,room,pin){
  const bytes=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',bytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes.encode(JSON.stringify([room,pin])))),n=>n.toString(16).padStart(2,'0')).join('');
}
export async function roomControls({env,input,room,user,host,ownerUid,type,path,json,disconnect,mediaToken,roomTitle=''}){
  const q=await roomStore(env.PI_GIFTS_DB);
  const now=Math.floor(Date.now()/1000), cutoff=now-90;
  const policy=await q('SELECT * FROM room_policy WHERE room=?',room).first();
  const member=await q('SELECT * FROM room_member WHERE room=? AND uid=?',room,user).first();
  const visit=input.session;
  if(member?.banned)return json({error:'أخرجك المضيف من الغرفة'},403);
  if(path==='/token'){
    // Legacy admission is only available when a room has no managed microphone policy.
    if(room!==helpRoomId&&!visit&&!policy&&!member&&!await q('SELECT 1 FROM room_mic_mode WHERE room=?',room).first())return null;
    if(!member||member.visit!==visit||member.seen<cutoff)return json({error:'أعد الدخول إلى الغرفة'},403);
    return {publisher:mayPublish(member,host,type),name:member.name,...(member.muted?{micAllowed:false}:{})};
  }
  if(typeof visit!=='string'||!/^[a-f0-9-]{36}$/.test(visit))return json({error:'جلسة غير صالحة'},400);
  const op=input.op;
  if(!['join','poll','leave','move','stepDown','slot','settings','request','cancel','approve','reject','demote','ban','eject','kick','mute','unmute','message','pinMessage','deleteMessage','supportGift','catalogGift','paidGift','giftRecipient','hostCard','roomAdmins','setRoomAdmin','inviteChoices','inviteFriends','inviteAtStart'].includes(op))return json({error:'طلب غير صالح'},400);
  if(room!==helpRoomId&&!host&&['join','poll','hostCard','giftRecipient'].includes(op)&&!await q('SELECT 1 FROM room_member WHERE room=? AND uid=? AND seen>=?',room,ownerUid,cutoff).first())return json({error:'انتهى البث'},404);
  if(op==='join'){
    const name=String(input.name||'ضيف').trim().slice(0,35)||'ضيف';
    if(!host&&policy?.pin && !(member?.visit===visit && member.seen>=cutoff)){
      if(!/^\d{4}$/.test(input.pin||''))return json({error:'أدخل رمز الغرفة',pinRequired:true},403);
      const bucket=Math.floor(now/600);
      const attempt=await q('INSERT INTO room_attempt VALUES(?,?,?,1) ON CONFLICT(room,uid) DO UPDATE SET hits=CASE WHEN bucket=excluded.bucket THEN hits+1 ELSE 1 END,bucket=excluded.bucket RETURNING hits',room,user,bucket).first();
      if(attempt.hits>5)return json({error:'محاولات كثيرة. حاول بعد عشر دقائق',pinRequired:true},429);
      if(await pinHash(env.LIVEKIT_API_SECRET,await rootFor(q,room),input.pin)!==policy.pin)return json({error:'رمز الغرفة غير صحيح',pinRequired:true},403);
      await q('UPDATE room_attempt SET hits=hits-1 WHERE room=? AND uid=? AND bucket=? AND hits>0',room,user,bucket).run();
    }
    const ride=input.ride===true?1:Number.isInteger(input.ride)&&[0,1,2,3,4,6].includes(input.ride)?input.ride:0;
    const entered=await q(`INSERT INTO room_member(room,uid,visit,name,frame,ride,joined,seen,seat)
      SELECT ?,?,?,?,?,?,?,?,CASE WHEN ? AND (
        EXISTS(SELECT 1 FROM room_lock WHERE room=? AND slot=0) OR
        EXISTS(SELECT 1 FROM room_member WHERE room=? AND uid<>? AND seat=9 AND banned=0 AND seen>=?)
      ) THEN -1 ELSE 0 END WHERE COALESCE((SELECT pin FROM room_policy WHERE room=?),'')=?
      ON CONFLICT(room,uid) DO UPDATE SET visit=excluded.visit,name=excluded.name,frame=excluded.frame,ride=excluded.ride,
      seat=CASE WHEN visit=excluded.visit AND seen>=? THEN seat ELSE excluded.seat END,muted=CASE WHEN visit=excluded.visit THEN muted ELSE 0 END,waiting=CASE WHEN visit=excluded.visit THEN waiting ELSE 0 END,
      joined=CASE WHEN visit=excluded.visit THEN joined ELSE excluded.joined END,seen=excluded.seen WHERE banned=0`,
      room,user,visit,name,Number(Boolean(input.frame)),ride,now,now,Number(host&&type==='audio'),room,room,user,cutoff,room,policy?.pin||'',cutoff).run();
    if(!entered.meta.changes){
      const currentPolicy=await q('SELECT length(pin)>0 AS protected FROM room_policy WHERE room=?',room).first();
      return json({error:'تغيرت صلاحية الدخول، أعد المحاولة',pinRequired:!host&&Boolean(currentPolicy?.protected)},403);
    }
  } else if(!member||member.visit!==visit||member.seen<cutoff)return json({error:'انتهت جلسة الغرفة'},403);
  const roles=await q(`SELECT EXISTS(SELECT 1 FROM clipi_app_admin WHERE uid=?) AS admin,
    EXISTS(SELECT 1 FROM room_admin WHERE uid=? AND room=COALESCE((SELECT root FROM room_continuation WHERE session=?),?)) AS roomAdmin`,
    user,user,room,room).first();
  const appStaff=!!roles.admin||await isAppOwner(q,user,env.CLIPI_OWNER_UID);
  const official=room===helpRoomId;
  const moderator=official?appStaff:host||appStaff||!!roles.roomAdmin;
  if(official && (op==='setRoomAdmin'||(op==='settings'&&input.pin!==undefined))){
    return json({error:'غرفة المساعدة مفتوحة ويديرها فريق كليبي'},403);
  }
  if(op==='roomAdmins'||op==='setRoomAdmin'){
    if(!moderator)return json({error:'للمضيف فقط'},403);
    return manageRoomAdmins(q,await rootFor(q,room),ownerUid,user,input,json);
  }
  if(op==='inviteChoices'||op==='inviteFriends'||op==='inviteAtStart'){
    if(!moderator||(op==='inviteAtStart'&&!host))return json({error:'للمضيف فقط'},403);
    if(op==='inviteAtStart'){
      await inviteFriendsAtStart(q,room,user,roomTitle);
      return json({ok:true});
    }
    return roomInvites(q,room,user,roomTitle,input,json);
  }
  if(op==='join'&&typeof input.avatar==='string'&&input.avatar.length<=620000&&
      (/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+=*$/.test(input.avatar)||Array.from(input.avatar).length<=4)){
    await q('INSERT OR REPLACE INTO gift_avatar VALUES(?,?)',user,input.avatar).run();
  }
  if(op==='hostCard'){
    if(!ownerUid)return json({error:'بطاقة المضيف متاحة في الغرفة الصوتية'},400);
    const result={};
    if(input.includeAvatar===true){
      const photo=await q(`SELECT COALESCE(
        (SELECT NULLIF(avatar,'') FROM gift_avatar WHERE uid=?),
        (SELECT avatar FROM short_profile WHERE uid=?),'') AS avatar`,ownerUid,ownerUid).first();
      result.avatar=photo.avatar;
    }
    if(input.profileName===true)result.profileName=(await q('SELECT name FROM short_profile WHERE uid=?',ownerUid).first())?.name||null;
    if(input.roomTotal===true || input.details===true){
      const total=await roomDiamonds(q,await rootFor(q,room));
      if(input.roomTotal===true)result.roomTotal=total;
      if(input.details===true)result.totals={room:total,...await q(`SELECT
        (SELECT COALESCE(SUM(cost),0) FROM room_level_gifts WHERE recipient=?) AS received,
        (SELECT COALESCE(SUM(cost),0) FROM room_level_gifts WHERE sender=?) AS sent`,ownerUid,ownerUid).first()};
    }
    if(input.supporters===true){
      if(input.after!==undefined&&(typeof input.after!=='string'||input.after.length>128))return json({error:'طلب غير صالح'},400);
      result.supporters=await roomSupporters(q,await rootFor(q,room),input.after);
    }
    return json(result);
  }
  if(op==='giftRecipient'){
    if(typeof input.recipient!=='string')return json({error:'اختر مستلمًا للهدية'},400);
    const target=await q(`SELECT m.uid,m.name,COALESCE(NULLIF(a.avatar,''),p.avatar) AS avatar
      FROM room_member m LEFT JOIN gift_avatar a ON a.uid=m.uid LEFT JOIN short_profile p ON p.uid=m.uid
      WHERE m.room=? AND m.uid=? AND m.banned=0 AND m.seen>=?`,room,input.recipient,cutoff).first();
    if(!target||target.uid===user)return json({error:'المستلم غير متاح'},409);
    const balance=await q('SELECT '+paidBalance+' AS diamonds',user,user).first();
    return json({recipient:target,senderDiamonds:balance.diamonds});
  }
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
    if(!moderator||type!=='audio'||!Number.isInteger(slot)||slot<0||slot>8||typeof input.locked!=='boolean')return json({error:'طلب غير صالح'},403);
    if(input.locked){
      const stored=slot===0?MAIN_MIC:slot;
      const protectHost=!host&&!appStaff;
      const [locked,removed]=await env.PI_GIFTS_DB.batch([
        q(`INSERT INTO room_lock(room,slot) SELECT ?,? WHERE NOT EXISTS
          (SELECT 1 FROM room_member WHERE ? AND room=? AND uid=? AND banned=0 AND seen>=? AND (seat=? OR (?=0 AND seat=0)))
          ON CONFLICT(room,slot) DO UPDATE SET slot=excluded.slot RETURNING slot`,room,slot,Number(protectHost),room,ownerUid,cutoff,stored,slot),
        q(`UPDATE room_member SET seat=CASE WHEN uid=? THEN -1 ELSE 0 END,waiting=0
          WHERE room=? AND (seat=? OR (?=0 AND uid=? AND seat=0)) AND (uid<>? OR ?=0)
          AND EXISTS(SELECT 1 FROM room_lock WHERE room=? AND slot=?) RETURNING uid`,ownerUid,room,stored,slot,ownerUid,ownerUid,Number(protectHost),room,slot)
      ]);
      if(!locked.results.length)return json({error:'الميكروفون الخاص بالمضيف محمي'},403);
      for(const occupant of removed.results)await disconnect(occupant.uid);
    }else await q('DELETE FROM room_lock WHERE room=? AND slot=?',room,slot).run();
  }
  if(op==='move'){
    const slot=input.slot;
    if(type!=='audio'||!Number.isInteger(slot)||slot<0||slot>8)return json({error:'المقعد غير صالح'},400);
    const stored=slot===0?MAIN_MIC:slot;
    // Claim and release in one UPDATE, including lock and occupancy checks at write time.
    const moved=await q(`UPDATE room_member SET seat=?,waiting=0 WHERE room=? AND uid=? AND visit=? AND seen>=? AND banned=0
      AND NOT EXISTS(SELECT 1 FROM room_lock WHERE room=? AND slot=?)
      AND (? OR (NOT EXISTS(SELECT 1 FROM room_policy WHERE room=? AND locked=1) AND NOT EXISTS(SELECT 1 FROM room_mic_mode f WHERE f.room=room_member.room AND f.free=0)))
      AND NOT EXISTS(SELECT 1 FROM room_member WHERE room=? AND uid<>? AND banned=0 AND seen>=?
        AND (seat=? OR (?=0 AND uid=? AND seat=0)))`,
      stored,room,user,visit,cutoff,room,slot,Number(moderator),room,room,user,cutoff,stored,slot,ownerUid).run();
    if(!moved.meta.changes)return json({error:'المايك مشغول أو مقفل'},409);
  }
  if(op==='stepDown'){
    if(type!=='audio')return json({error:'المقعد غير صالح'},400);
    const released=await q(`UPDATE room_member SET seat=?,waiting=0 WHERE room=? AND uid=? AND visit=?
      AND (seat>0 OR (? AND seat=0))`,host?-1:0,room,user,visit,Number(host)).run();
    if(released.meta.changes)await disconnect(user);
  }
  if(op==='settings'){
    if(!moderator)return json({error:'للمضيف فقط'},403);
    if(input.shield!==undefined){
      if(typeof input.shield!=='boolean')return json({error:'طلب غير صالح'},400);
      if(input.shield)await q('INSERT OR IGNORE INTO room_shield(room) VALUES(?)',room).run();
      else await q('DELETE FROM room_shield WHERE room=?',room).run();
    }
    if(input.micFree!==undefined){
      if(type!=='audio'||typeof input.micFree!=='boolean')return json({error:'طلب غير صالح'},400);
      await q('INSERT INTO room_mic_mode VALUES(?,?) ON CONFLICT(room) DO UPDATE SET free=excluded.free',room,Number(input.micFree)).run();
    }
    if(input.words!==undefined){
      if(!Array.isArray(input.words)||input.words.length>20||input.words.some(w=>typeof w!=='string'||w.length>40))return json({error:'أدخل حتى ٢٠ كلمة، بحد ٤٠ حرفًا للكلمة'},400);
      const words=[...new Set(input.words.map(w=>w.normalize('NFKC').trim().toLowerCase()).filter(Boolean))];
      await q('INSERT INTO room_chat_filter VALUES(?,?) ON CONFLICT(room) DO UPDATE SET words=excluded.words',room,JSON.stringify(words)).run();
    }
    if(input.slow!==undefined){
      if(![0,5,15,30].includes(input.slow))return json({error:'مهلة غير صالحة'},400);
      await q('INSERT INTO room_chat_config(room,slow) VALUES(?,?) ON CONFLICT(room) DO UPDATE SET slow=excluded.slow',room,input.slow).run();
    }
    if(input.theme!==undefined){
      const builtins=['default','palace','aurora','dunes'];
      const photo=input.theme==='upload'&&typeof input.image==='string'&&input.image.length<=620000&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+=*$/.test(input.image);
      if(!builtins.includes(input.theme)&&!photo)return json({error:'صورة غير صالحة'},400);
      const theme=photo?crypto.randomUUID():input.theme;
      const image=photo?input.image:null;
      const writes=[q('INSERT OR REPLACE INTO room_theme(room,theme,image) VALUES(?,?,?)',room,theme,image)];
      if(host&&type==='audio')writes.push(q('INSERT OR REPLACE INTO audio_host_theme(uid,theme,image) VALUES(?,?,?)',user,theme,image));
      await env.PI_GIFTS_DB.batch(writes);
    }
    if(input.pin!==undefined){
      if(input.pin!==''&&!/^\d{4}$/.test(input.pin))return json({error:'أدخل أربعة أرقام'},400);
      await q('INSERT INTO room_policy(room,pin) VALUES(?,?) ON CONFLICT(room) DO UPDATE SET pin=excluded.pin',room,input.pin?await pinHash(env.LIVEKIT_API_SECRET,await rootFor(q,room),input.pin):'').run();
    }
    if(typeof input.locked==='boolean'){
      const save=q('INSERT INTO room_policy(room,locked) VALUES(?,?) ON CONFLICT(room) DO UPDATE SET locked=excluded.locked',room,Number(input.locked));
      if(type==='audio'&&input.locked){
        // Release occupied guest microphones only on the transition to locked.
        // Host-approved speakers may still join while the room is locked.
        const [removed]=await env.PI_GIFTS_DB.batch([
          q(`UPDATE room_member SET seat=0,waiting=0,muted=0 WHERE room=? AND uid<>? AND seat>0
            AND NOT EXISTS(SELECT 1 FROM room_policy WHERE room=? AND locked=1) RETURNING uid`,room,ownerUid,room),
          save
        ]);
        await Promise.all(removed.results.map(person=>disconnect(person.uid)));
      }else await save.run();
    }
  }
  const capacity=type==='audio'?8:1;
  const claim=(uid,condition,slot=null)=>q(`WITH RECURSIVE slots(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM slots WHERE n<?),
    available AS (SELECT MIN(n) AS n FROM slots WHERE (? IS NULL OR n=?) AND NOT EXISTS(SELECT 1 FROM room_lock WHERE room=? AND slot=n)
    AND NOT EXISTS(SELECT 1 FROM room_member WHERE room=? AND seat=n AND seen>=?))
    UPDATE room_member SET seat=(SELECT n FROM available),waiting=0 WHERE room=? AND uid=? AND banned=0 AND seen>=? AND seat=0 AND (SELECT n FROM available) IS NOT NULL AND `+condition,capacity,slot,slot,room,room,cutoff,room,uid,cutoff);
  if(op==='request'&&!host){
    const slot=input.slot;
    if(slot!==undefined&&(type!=='audio'||!Number.isInteger(slot)||slot<0||slot>capacity))return json({error:'المقعد غير صالح'},400);
    if(slot!==undefined&&slot>0&&!input.permissionOnly)await claim(user,'NOT EXISTS(SELECT 1 FROM room_policy p WHERE p.room=room_member.room AND locked=1) AND NOT EXISTS(SELECT 1 FROM room_mic_mode f WHERE f.room=room_member.room AND f.free=0)',slot).run();
    await q('UPDATE room_member SET waiting=? WHERE room=? AND uid=? AND seat=0',input.permissionOnly===true&&slot!==undefined?slot+2:1,room,user).run();
  }
  if(op==='cancel')await q('UPDATE room_member SET waiting=0 WHERE room=? AND uid=?',room,user).run();
  if(['approve','reject','demote','ban','eject','kick','mute','unmute'].includes(op)){
    if(!moderator||typeof input.uid!=='string'||input.uid===user||
      (input.uid===ownerUid&&(!appStaff||!['demote','mute','unmute','eject','kick'].includes(op))))return json({error:'للـمضيف فقط'},403);
    const uid=input.uid;
    if(op==='approve'){
      const pending=await q('SELECT waiting FROM room_member WHERE room=? AND uid=?',room,uid).first();
      const slot=input.slot??(pending?.waiting>=2?pending.waiting-2:undefined);
      if(slot!==undefined&&(type!=='audio'||!Number.isInteger(slot)||slot<0||slot>8))return json({error:'المقعد غير صالح'},400);
      const requested=slot===0
        ?q(`UPDATE room_member SET seat=9,waiting=0 WHERE room=? AND uid=? AND seat=0 AND banned=0 AND waiting>0 AND seen>=?
            AND NOT EXISTS(SELECT 1 FROM room_lock WHERE room=? AND slot=0)
            AND NOT EXISTS(SELECT 1 FROM room_member WHERE room=? AND banned=0 AND seen>=? AND (seat=9 OR (uid=? AND seat=0)))`,
            room,uid,cutoff,room,room,cutoff,ownerUid)
        :claim(uid,'waiting>0',slot);
      if(!(await requested.run()).meta.changes)return json({error:'المقعد ممتلئ أو انتهى الطلب'},409);
    }else{
      const update={reject:'waiting=0',demote:uid===ownerUid?'seat=-1,waiting=0,muted=0':'seat=0,waiting=0,muted=0',kick:uid===ownerUid?"seat=-1,waiting=0,seen=0,visit=''":'seat=0,waiting=0,banned=1',ban:'seat=0,waiting=0,banned=1',eject:"seat=0,waiting=0,seen=0,visit=''",mute:'muted=1',unmute:'muted=0'}[op];
      await q('UPDATE room_member SET '+update+' WHERE room=? AND uid=?',room,uid).run();
      if(['ban','eject','kick','mute','demote'].includes(op))await disconnect(uid);
    }
  }
  if(op==='leave'){
    await q('DELETE FROM room_member WHERE room=? AND uid=? AND visit=? AND banned=0',room,user,visit).run();
    return json({ok:true});
  }
  if(op==='paidGift'){
    const {gift,cost,nonce}=input;
    const recipient=input.recipient??ownerUid;
    if(typeof recipient!=='string'||!recipient||recipient===user||diamondGifts.get(gift)?.cost!==cost||!Number.isSafeInteger(cost)||typeof nonce!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(nonce))return json({error:'Invalid support gift'},400);
    // New gifts contribute to cumulative rewards. Existing per-gift credits stay in hostUnits.
    await q(`INSERT INTO paid_room_gift(sender,nonce,room,host,gift,cost,hostUnits) SELECT ?,?,?,?,?,?,?
      WHERE (${paidBalance})>=?
      AND EXISTS(SELECT 1 FROM room_member WHERE room=? AND uid=? AND banned=0 AND seen>=?)
      AND EXISTS(SELECT 1 FROM room_member WHERE room=? AND uid=? AND banned=0 AND seen>=?)
      ON CONFLICT(sender,nonce) DO NOTHING`,
      user,nonce,room,recipient,gift,cost,0,user,user,cost,room,recipient,cutoff,room,ownerUid,cutoff).run();
    const sent=await q(`SELECT room,host,gift,cost,nonce,${paidBalance} AS senderDiamonds FROM paid_room_gift WHERE sender=? AND nonce=?`,user,user,user,nonce).first();
    if(sent?.gift!==gift||sent.cost!==cost||sent.room!==room||sent.host!==recipient)return json({error:'Purchased diamonds insufficient or host offline'},409);
    return json({senderDiamonds:sent.senderDiamonds,receipt:{nonce:sent.nonce,recipient:sent.host,gift:sent.gift,diamonds:sent.cost}});
  }
  if(op==='supportGift'||op==='catalogGift')return json({error:'حدّث كليبي لإرسال الهدية من الماس المشترى'},409);
  if(op==='message'){
    const text=String(input.text||'').trim();
    if(!text||text.length>500)return json({error:'تعليق غير صالح'},400);
    const filter=await q('SELECT (SELECT words FROM room_chat_filter WHERE room=?) AS words, EXISTS(SELECT 1 FROM room_shield WHERE room=?) AS shield',room,room).first();
    const normalized=text.normalize('NFKC').toLowerCase();
    const words=JSON.parse(filter?.words||'[]');
    if(filter?.shield)words.push('كلمة السر الخاصة بك','send your password','أرسل رمز التحقق','send your verification code');
    if(!host&&words.some(word=>normalized.includes(word)))return json({error:'تتضمن الرسالة عبارة محظورة في هذه الغرفة'},422);
    const token=crypto.randomUUID();
    const accepted='EXISTS(SELECT 1 FROM room_chat_clock WHERE room=? AND uid=? AND token=?)';
    const results=await env.PI_GIFTS_DB.batch([
      q(`INSERT INTO room_chat_clock(room,uid,stamp,token) VALUES(?,?,?,?)
        ON CONFLICT(room,uid) DO UPDATE SET stamp=excluded.stamp,token=excluded.token
        WHERE ? OR excluded.stamp-room_chat_clock.stamp>=MAX(COALESCE((SELECT slow FROM room_chat_config WHERE room=?),0),10*EXISTS(SELECT 1 FROM room_shield WHERE room=?))
        RETURNING stamp`,room,user,now,token,Number(moderator),room,room),
      q('INSERT INTO room_chat(room,uid,name,text) SELECT ?,?,?,? WHERE '+accepted,room,user,member.name,text,room,user,token),
      q('INSERT INTO room_chat_activity(room,revision) SELECT ?,1 WHERE '+accepted+
        ' ON CONFLICT(room) DO UPDATE SET revision=revision+1',room,room,user,token)
    ]);
    if(!results[0].results.length)return json({error:'الوضع البطيء مفعّل. انتظر قبل إرسال رسالة أخرى.'},429);
  }
  if(op==='pinMessage'){
    if(!moderator)return json({error:'للمضيف فقط'},403);
    if(!host&&!appStaff){
      const message=await q('SELECT uid FROM room_chat WHERE room=? AND id=COALESCE(?,(SELECT pin FROM room_chat_config WHERE room=?))',room,input.id,room).first();
      if(message?.uid===ownerUid)return json({error:'غير مسموح'},403);
    }
    if(input.id===null)await q('UPDATE room_chat_config SET pin=NULL WHERE room=?',room).run();
    else{
      if(!Number.isSafeInteger(input.id))return json({error:'رسالة غير صالحة'},400);
      const result=await q(`INSERT INTO room_chat_config(room,pin) SELECT room,id FROM room_chat WHERE room=? AND id=?
        ON CONFLICT(room) DO UPDATE SET pin=excluded.pin`,room,input.id).run();
      if(!result.meta.changes)return json({error:'الرسالة غير متاحة'},404);
    }
  }
  if(op==='deleteMessage'&&!host&&!appStaff){
    const message=await q('SELECT uid FROM room_chat WHERE room=? AND id=?',room,input.id).first();
    if(message&&message.uid!==user&&(!moderator||message.uid===ownerUid))return json({error:'غير مسموح'},403);
  }
  if(op==='deleteMessage')await env.PI_GIFTS_DB.batch([
    q('UPDATE room_chat_config SET pin=NULL WHERE room=? AND pin=? AND EXISTS(SELECT 1 FROM room_chat WHERE room=? AND id=? AND (uid=? OR (?=1 AND (uid<>? OR ?=1))))',room,input.id,room,input.id,user,Number(moderator),ownerUid,Number(appStaff)),
    q('DELETE FROM room_chat WHERE room=? AND id=? AND (uid=? OR (?=1 AND (uid<>? OR ?=1)))',room,input.id,user,Number(moderator),ownerUid,Number(appStaff))
  ]);
  if(member&&now-member.seen>=20)await q('UPDATE room_member SET seen=? WHERE room=? AND uid=? AND visit=?',now,room,user,visit).run();
  const [people,settings,history,pinned]=await Promise.all([
    q('SELECT m.uid,m.name,m.frame,CASE WHEN m.ride IN (5,7) THEN 0 ELSE m.ride END AS ride,m.seat,m.waiting,m.muted,m.joined,e.token AS entranceId FROM room_member m LEFT JOIN room_entrance_id e ON e.room=m.room AND e.uid=m.uid WHERE m.room=? AND m.banned=0 AND m.seen>=? ORDER BY m.joined,m.uid',room,cutoff).all(),
    q(`SELECT COALESCE((SELECT free FROM room_mic_mode WHERE room=r.room),1) AS micFree,p.locked,length(p.pin)>0 AS protected,COALESCE(a.revision,0) AS chatRevision,MAX(COALESCE(c.slow,0),10*EXISTS(SELECT 1 FROM room_shield WHERE room=r.room)) AS slow,EXISTS(SELECT 1 FROM room_shield WHERE room=r.room) AS shield,f.words
      FROM (SELECT ? AS room) r LEFT JOIN room_policy p ON p.room=r.room
      LEFT JOIN room_chat_activity a ON a.room=r.room LEFT JOIN room_chat_config c ON c.room=r.room LEFT JOIN room_chat_filter f ON f.room=r.room`,room).first(),
    q('SELECT id,uid AS userUid,name AS userName,text FROM room_chat WHERE room=? ORDER BY id DESC LIMIT 100',room).all(),
    q('SELECT m.id,m.uid AS userUid,m.name AS userName,m.text FROM room_chat_config c JOIN room_chat m ON m.id=c.pin AND m.room=c.room WHERE c.room=?',room).first()
  ]);
  // Only settled ledger entries can trigger an effect in an authenticated room.
  const events=await q('SELECT rowid AS id,sender,nonce,gift FROM paid_room_gift WHERE room=? ORDER BY rowid DESC LIMIT 80',room).all();
  const me=people.results.find(person=>person.uid===user);
  if(!me)return json({error:'انتهت جلسة الغرفة'},403);
  const media=op==='join'&&mediaToken?await mediaToken(mayPublish(me,host,type),!me.muted):undefined;
  const wallet=await q('SELECT '+paidBalance+' AS diamonds',user,user).first();
  const theme=await q('SELECT theme FROM room_theme WHERE room=?',room).first();
  const locks=await q('SELECT slot FROM room_lock WHERE room=?',room).all();
  return json({shield:!!settings.shield,micFree:!!settings.micFree,roomAdmin:!!roles.roomAdmin,appStaff,...(moderator?{words:JSON.parse(settings.words||'[]')} :{}),pinned:pinned||null,slow:settings.slow,chatRevision:settings.chatRevision,lockedSlots:locks.results.map(row=>row.slot),theme:theme?.theme||'default',supportBalance:wallet.diamonds,media,people:people.results,locked:Boolean(settings?.locked),protected:Boolean(settings?.protected),giftEvents:events.results.reverse(),chat:history.results.reverse()});
}
