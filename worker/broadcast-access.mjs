const friends='FROM short_follow a JOIN short_follow b ON b.viewer=a.owner AND b.owner=a.viewer';
export const broadcastAccessSchema=[
  'CREATE TABLE IF NOT EXISTS clipi_app_admin(uid TEXT PRIMARY KEY)',
  'CREATE TABLE IF NOT EXISTS room_admin(room TEXT,uid TEXT,PRIMARY KEY(room,uid))',
  'CREATE TABLE IF NOT EXISTS room_mic_mode(room TEXT PRIMARY KEY,free INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS broadcast_invite(room TEXT,recipient TEXT,sender TEXT NOT NULL,title TEXT NOT NULL,created INTEGER NOT NULL,dismissed INTEGER DEFAULT 0,PRIMARY KEY(room,recipient))',
  'CREATE INDEX IF NOT EXISTS broadcast_invite_inbox ON broadcast_invite(recipient,dismissed,created DESC)',
  'CREATE TABLE IF NOT EXISTS broadcast_invite_start(room TEXT PRIMARY KEY,sender TEXT,title TEXT,created INTEGER)',
  `CREATE TRIGGER IF NOT EXISTS invite_at_broadcast_start AFTER INSERT ON broadcast_invite_start BEGIN
    INSERT OR IGNORE INTO broadcast_invite(room,recipient,sender,title,created)
    SELECT NEW.room,a.owner,NEW.sender,NEW.title,NEW.created ${friends} WHERE a.viewer=NEW.sender AND a.owner<>a.viewer; END`,
  `CREATE TRIGGER IF NOT EXISTS copy_mic_mode AFTER INSERT ON room_continuation BEGIN
    INSERT OR IGNORE INTO room_mic_mode SELECT NEW.session,free FROM room_mic_mode WHERE room=NEW.previous; END`
];

export async function inviteFriendsAtStart(q,room,uid,title){
  await q('INSERT OR IGNORE INTO broadcast_invite_start(room,sender,title,created) VALUES(?,?,?,?)',
    room,uid,title,Math.floor(Date.now()/1000)).run();
}
export async function roomInvites(q,room,uid,title,input,json) {
  if(input.op==='inviteChoices'){
    const after=input.after??'';
    if(typeof after!=='string'||after.length>128)return json({error:'طلب غير صالح'},400);
    const {results}=await q(`SELECT a.owner AS uid,COALESCE(NULLIF(p.name,''),n.number,a.owner) AS name,
      EXISTS(SELECT 1 FROM broadcast_invite i WHERE i.room=? AND i.recipient=a.owner) AS invited
      ${friends} LEFT JOIN short_profile p ON p.uid=a.owner LEFT JOIN public_numbers n ON n.uid=a.owner AND n.cost=0
      WHERE a.viewer=? AND a.owner<>a.viewer AND a.owner>? ORDER BY a.owner LIMIT 61`,room,uid,after).all();
    const people=results.slice(0,60);
    return json({friends:people,next:results.length>60?people.at(-1).uid:null});
  }
  if(!Array.isArray(input.uids)||!input.uids.length||input.uids.some(id=>typeof id!=='string'||!id||id.length>128))
    return json({error:'اختر الأصدقاء'},400);
  const args=[room,uid,title,Math.floor(Date.now()/1000),uid];
  args.push(JSON.stringify([...new Set(input.uids)]));
  const result=await q(`INSERT OR IGNORE INTO broadcast_invite(room,recipient,sender,title,created)
    SELECT ?,a.owner,?,?,? ${friends} WHERE a.viewer=? AND a.owner<>a.viewer
    AND a.owner IN (SELECT value FROM json_each(?))`,...args).run();
  const saved=await q('SELECT recipient FROM broadcast_invite WHERE room=? AND recipient IN (SELECT value FROM json_each(?))',room,args.at(-1)).all();
  return json({sent:result.meta.changes,invited:saved.results.map(row=>row.recipient)});
}

export async function invitationInbox(q,uid,input,json){
  if(input.op==='dismissRoomInvite'){
    if(typeof input.room!=='string'||input.room.length>128)return json({error:'طلب غير صالح'},400);
    await q('UPDATE broadcast_invite SET dismissed=1 WHERE recipient=? AND room=?',uid,input.room).run();
    return json({ok:true});
  }
  const rows=await q(`SELECT i.room,i.sender,i.title,m.name FROM broadcast_invite i
    JOIN room_member m ON m.room=i.room AND m.uid=i.sender
    WHERE i.recipient=? AND i.dismissed=0 AND m.banned=0 AND m.seen>=? AND NOT EXISTS
    (SELECT 1 FROM room_member me WHERE me.room=i.room AND me.uid=? AND me.banned=1)
    ORDER BY i.created DESC,i.room LIMIT 30`,uid,Math.floor(Date.now()/1000)-90,uid).all();
  return json({invitations:rows.results});
}
