// One logical room can host many broadcasts. Receipts keep their original broadcast ID.
export const roomHistorySchema=[
  'CREATE TABLE IF NOT EXISTS room_continuation(previous TEXT PRIMARY KEY,session TEXT NOT NULL UNIQUE,root TEXT NOT NULL,owner TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS room_sessions_by_root ON room_continuation(root,session)',
  'CREATE INDEX IF NOT EXISTS room_sessions_by_owner ON room_continuation(owner)',
  'CREATE TABLE IF NOT EXISTS room_donor_name(room TEXT NOT NULL,uid TEXT NOT NULL,name TEXT NOT NULL,PRIMARY KEY(room,uid))',
  `CREATE TRIGGER IF NOT EXISTS remember_room_donor AFTER INSERT ON paid_room_gift WHEN NEW.host<>'' BEGIN
    INSERT OR REPLACE INTO room_donor_name(room,uid,name)
      SELECT NEW.room,NEW.sender,name FROM room_member WHERE room=NEW.room AND uid=NEW.sender; END`,
  `CREATE TRIGGER IF NOT EXISTS copy_room_permissions AFTER INSERT ON room_continuation BEGIN
    INSERT INTO room_policy SELECT NEW.session,pin,locked FROM room_policy WHERE room=NEW.previous;
    INSERT INTO room_lock SELECT NEW.session,slot FROM room_lock WHERE room=NEW.previous;
    INSERT INTO room_theme SELECT NEW.session,theme,image FROM room_theme WHERE room=NEW.previous;
    INSERT INTO room_chat_config(room,slow) SELECT NEW.session,slow FROM room_chat_config WHERE room=NEW.previous;
    INSERT INTO room_chat_filter SELECT NEW.session,words FROM room_chat_filter WHERE room=NEW.previous;
    INSERT INTO room_member(room,uid,visit,name,banned,seen) SELECT NEW.session,uid,'',name,1,0 FROM room_member WHERE room=NEW.previous AND banned=1;
    END`
];

export async function rootFor(q,room){
  return (await q('SELECT root FROM room_continuation WHERE session=?',room).first())?.root||room;
}

export async function reserveBroadcast(q,room,owner){
  const root=await rootFor(q,room);
  await q('INSERT INTO room_continuation(previous,session,root,owner) VALUES(?,?,?,?) ON CONFLICT(previous) DO NOTHING',
    room,crypto.randomUUID(),root,owner).run();
  return (await q('SELECT session FROM room_continuation WHERE previous=? AND owner=?',room,owner).first()).session;
}

const sessions='SELECT ?1 UNION ALL SELECT session FROM room_continuation WHERE root=?1';

export async function roomDiamonds(q,root){
  return (await q('SELECT COALESCE(SUM(cost),0) AS total FROM room_level_gifts WHERE room IN ('+sessions+')',root).first()).total;
}

export async function roomSupporters(q,root,after=''){
  const {results}=await q(`WITH donors AS (
    SELECT sender,MAX(room) AS sample FROM room_level_gifts WHERE room IN (${sessions}) AND sender>?2
    GROUP BY sender ORDER BY sender LIMIT 41)
    SELECT d.sender AS uid,COALESCE(
      (SELECT name FROM room_donor_name WHERE uid=d.sender AND room IN (${sessions}) ORDER BY rowid DESC LIMIT 1),
      (SELECT NULLIF(name,'') FROM short_profile WHERE uid=d.sender),
      (SELECT name FROM room_chat WHERE uid=d.sender AND room=d.sample AND name<>'' ORDER BY id DESC LIMIT 1),
      (SELECT 'ID · '||number FROM public_numbers WHERE uid=d.sender AND cost=0)) AS name
    FROM donors d ORDER BY d.sender`,root,after).all();
  const people=results.slice(0,40);
  return {people,next:results.length>40?people[39].uid:null};
}
