const reactionIds = new Set(['heart','spark','clap']);
const isJpeg = (s,limit) => typeof s==='string' && s.length<=limit && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+=*$/.test(s);
export const socialSchema = [
  'CREATE TABLE IF NOT EXISTS short_profile(uid TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS short_follow(viewer TEXT, owner TEXT, PRIMARY KEY(viewer,owner))',
  'CREATE INDEX IF NOT EXISTS short_follow_by_owner ON short_follow(owner,viewer)',
  'CREATE TABLE IF NOT EXISTS short_friend_pair(lo TEXT NOT NULL,hi TEXT NOT NULL,sender TEXT NOT NULL,accepted INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(lo,hi),CHECK(lo<hi AND sender IN(lo,hi) AND accepted IN(0,1)))',
  'CREATE INDEX IF NOT EXISTS short_friend_by_hi ON short_friend_pair(hi,lo)',
  `CREATE VIEW IF NOT EXISTS short_friends AS
    SELECT a.viewer,a.owner FROM short_follow a JOIN short_follow b ON b.viewer=a.owner AND b.owner=a.viewer WHERE a.viewer<>a.owner
    UNION SELECT lo,hi FROM short_friend_pair WHERE accepted=1
    UNION SELECT hi,lo FROM short_friend_pair WHERE accepted=1`,
  `CREATE TRIGGER IF NOT EXISTS clear_mutual_friend_request AFTER INSERT ON short_follow
    WHEN EXISTS(SELECT 1 FROM short_follow WHERE viewer=NEW.owner AND owner=NEW.viewer) BEGIN
      DELETE FROM short_friend_pair WHERE lo=min(NEW.viewer,NEW.owner) AND hi=max(NEW.viewer,NEW.owner) AND accepted=0; END`,
  'CREATE TABLE IF NOT EXISTS short_comment_meta(uid TEXT,nonce TEXT,clip TEXT,parent INTEGER,created INTEGER,media TEXT,PRIMARY KEY(uid,nonce))',
  'CREATE INDEX IF NOT EXISTS short_comment_parent ON short_comment_meta(clip,parent)',
  'CREATE TABLE IF NOT EXISTS short_comment_heart(comment_id INTEGER,uid TEXT,PRIMARY KEY(comment_id,uid))'
];
export async function saveShortProfile(q,uid,profile) {
  if(!profile || typeof profile.name!=='string' || !profile.name.trim())return;
  const avatar=String(profile.avatar||'');
  const displayAvatar=isJpeg(avatar,36000) || (avatar.length<=16&&!avatar.startsWith('data:')) ? avatar : '';
  await q('INSERT INTO short_profile(uid,name,avatar) VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET name=excluded.name,avatar=excluded.avatar WHERE name<>excluded.name OR avatar<>excluded.avatar',uid,profile.name.trim().slice(0,35),displayAvatar).run();
}
const counts = (q,clip) => q('SELECT COUNT(*) AS count FROM short_comment WHERE clip=?',clip).first();
export async function authorState(q,uid,clip,owner) {
  const state=await q(`SELECT p.name,p.avatar,
    EXISTS(SELECT 1 FROM short_follow WHERE viewer=? AND owner=?) AS following,
    (SELECT COUNT(*) FROM short_comment WHERE clip=?) AS commentCount
    FROM (SELECT 1) LEFT JOIN short_profile p ON p.uid=?`,uid,owner,clip,owner).first();
  return {owner,authorName:state.name||(owner==='clipi:official'?'Clipi':'صاحب المقطع'),authorAvatar:state.avatar||'',following:!!state.following,commentCount:state.commentCount,social:true};
}
async function setFollowing(q,viewer,owner,following) {
  if(following)await q('INSERT OR IGNORE INTO short_follow(viewer,owner) VALUES(?,?)',viewer,owner).run();
  else await q('DELETE FROM short_follow WHERE viewer=? AND owner=?',viewer,owner).run();
}

const peopleSources={
  friends:'SELECT owner AS uid FROM short_friends WHERE viewer=?',
  followers:'SELECT viewer AS uid FROM short_follow WHERE owner=?',
  followingCount:'SELECT owner AS uid FROM short_follow WHERE viewer=?',
  requests:`SELECT CASE WHEN lo=?1 THEN hi ELSE lo END AS uid FROM short_friend_pair
    WHERE (lo=?1 OR hi=?1) AND sender<>?1 AND accepted=0`
};

async function profilePeople(q,viewer,owner,input,json){
  const kind=input.kind,after=input.after??'';
  if(typeof kind!=='string'||!Object.hasOwn(peopleSources,kind)||typeof after!=='string'||after.length>128)return json({error:'طلب غير صالح'},400);
  if(kind==='requests'&&owner!==viewer)return json({error:'طلب غير صالح'},403);
  const rows=await q(`SELECT src.uid,p.name,p.avatar,COALESCE(n.number,base.number) AS number
    FROM (${peopleSources[kind]}) AS src LEFT JOIN short_profile p ON p.uid=src.uid
    LEFT JOIN selected_number n ON n.uid=src.uid LEFT JOIN public_numbers base ON base.uid=src.uid AND base.cost=0
    WHERE src.uid>?2 ORDER BY src.uid LIMIT 31`,owner,after).all();
  const people=rows.results.slice(0,30);
  return json({people,next:rows.results.length>30?people.at(-1).uid:null});
}
function knownAccount(q,owner){
  return q(`SELECT 1 WHERE EXISTS(SELECT 1 FROM public_numbers WHERE uid=?1 AND cost=0)
    OR EXISTS(SELECT 1 FROM short_profile WHERE uid=?1)
    OR EXISTS(SELECT 1 FROM short_clip WHERE owner=?1 AND object_key IS NOT NULL)
    OR EXISTS(SELECT 1 FROM short_follow WHERE viewer=?1)`,owner).first();
}
export async function profileSocial(q,viewer,input,json) {
  const owner=input.owner??viewer;
  if(typeof owner!=='string'||!owner||owner.length>128)return json({error:'طلب غير صالح'},400);
  if(input.op==='shortProfilePeople')return profilePeople(q,viewer,owner,input,json);
  if(input.op==='shortProfileFollow'){
    if(owner===viewer||typeof input.following!=='boolean')return json({error:'اختيار متابعة غير صالح'},400);
    if(input.following&&!await knownAccount(q,owner))return json({error:'الحساب غير موجود'},404);
    await saveShortProfile(q,viewer,input.profile);
    await setFollowing(q,viewer,owner,input.following);
  }
  if(input.op==='shortFriend'){
    if(owner===viewer||owner==='clipi:official')return json({error:'طلب غير صالح'},400);
    const {action}=input;
    if(action==='request'){
      if(!await knownAccount(q,owner))return json({error:'الحساب غير موجود'},404);
      await saveShortProfile(q,viewer,input.profile);
      await q(`INSERT OR IGNORE INTO short_friend_pair(lo,hi,sender) SELECT min(?1,?2),max(?1,?2),?1
        WHERE NOT EXISTS(SELECT 1 FROM short_friends WHERE viewer=?1 AND owner=?2)`,viewer,owner).run();
    }else if(action==='accept'){
      await q('UPDATE short_friend_pair SET accepted=1 WHERE lo=min(?1,?2) AND hi=max(?1,?2) AND sender=?2 AND accepted=0',viewer,owner).run();
    }else if(action==='cancel'||action==='decline'){
      await q('DELETE FROM short_friend_pair WHERE lo=min(?1,?2) AND hi=max(?1,?2) AND sender=?3 AND accepted=0',viewer,owner,action==='cancel'?viewer:owner).run();
    }else return json({error:'طلب غير صالح'},400);
  }
  if(input.op==='shortProfileSocial'&&owner===viewer)await saveShortProfile(q,viewer,input.profile);
  const state=await q(`SELECT
    (SELECT COUNT(*) FROM short_follow WHERE owner=?1) AS followers,
    (SELECT COUNT(*) FROM short_follow WHERE viewer=?1) AS followingCount,
    (SELECT COUNT(*) FROM short_friends WHERE viewer=?1) AS friends,
    EXISTS(SELECT 1 FROM short_follow WHERE viewer=?2 AND owner=?1) AS following,
    CASE WHEN EXISTS(SELECT 1 FROM short_friends WHERE viewer=?2 AND owner=?1) THEN 'friends'
      ELSE COALESCE((SELECT CASE WHEN sender=?2 THEN 'outgoing' ELSE 'incoming' END FROM short_friend_pair
        WHERE lo=min(?1,?2) AND hi=max(?1,?2) AND accepted=0),'none') END AS friendship,
    CASE WHEN ?1=?2 THEN (SELECT COUNT(*) FROM short_friend_pair WHERE (lo=?1 OR hi=?1) AND accepted=0 AND sender<>?1) END AS pendingCount,
    COALESCE((SELECT number FROM selected_number WHERE uid=?1),
      (SELECT number FROM public_numbers WHERE uid=?1 AND cost=0)) AS number`,owner,viewer).first();
  return json({...state,following:!!state.following});
}
export async function socialComments(q,uid,input,json,owner) {
  const {op,clip}=input;
  if(op==='shortFollow'){
    if(uid===owner || typeof input.following!=='boolean')return json({error:'اختيار متابعة غير صالح'},400);
    await saveShortProfile(q,uid,input.profile);
    await setFollowing(q,uid,owner,input.following);
    return json({following:input.following});
  }
  if(op==='shortCommentLike'){
    const id=Number(input.commentId);
    if(typeof input.liked!=='boolean'||!Number.isSafeInteger(id)||!await q('SELECT 1 FROM short_comment WHERE clip=? AND rowid=?',clip,id).first())return json({error:'التعليق غير متاح'},404);
    if(input.liked)await q('INSERT OR IGNORE INTO short_comment_heart(comment_id,uid) SELECT rowid,? FROM short_comment WHERE rowid=? AND clip=?',uid,id,clip).run();
    else await q('DELETE FROM short_comment_heart WHERE comment_id=? AND uid=? AND EXISTS(SELECT 1 FROM short_comment WHERE rowid=? AND clip=?)',id,uid,id,clip).run();
    const result=await q('SELECT COUNT(*) AS likes,COALESCE(MAX(uid=?),0) AS liked,COALESCE(MAX(uid=?),0) AS creatorLiked FROM short_comment_heart WHERE comment_id=?',uid,owner,id).first();
    return json({...result,id});
  }
  const parent=input.parent==null?null:Number(input.parent);
  if(parent!==null && (!Number.isSafeInteger(parent)||!await q('SELECT 1 FROM short_comment c LEFT JOIN short_comment_meta m USING(uid,nonce) WHERE c.clip=? AND c.rowid=? AND m.parent IS NULL',clip,parent).first()))return json({error:'التعليق الأصلي غير متاح'},404);
  if(op==='shortComment'){
    const body=typeof input.body==='string'?input.body.trim():'';
    const media=input.media||'';
    if((!body&&!media)||body.length>450||!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(String(input.nonce))||!(media===''||reactionIds.has(media)||isJpeg(media,85000)))return json({error:'تعذّر قبول التعليق أو المرفق'},400);
    await saveShortProfile(q,uid,input.profile);
    // Metadata is written first. A partial attempt is invisible to readers until the comment exists.
    await q('INSERT OR IGNORE INTO short_comment_meta(uid,nonce,clip,parent,created,media) SELECT ?,?,?,?,?,? WHERE ? OR EXISTS(SELECT 1 FROM short_clip WHERE id=? AND object_key IS NOT NULL)',uid,input.nonce,clip,parent,Date.now(),media,owner==='clipi:official'?1:0,clip).run();
    const stored=await q('SELECT clip,parent,media FROM short_comment_meta WHERE uid=? AND nonce=?',uid,input.nonce).first();
    if(!stored)return json({error:'الفيديو غير متاح'},404);
    if(stored.clip!==clip||stored.parent!==parent||stored.media!==media)return json({error:'طلب إرسال مختلف'},409);
    await q('INSERT OR IGNORE INTO short_comment(clip,uid,nonce,body) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM short_comment_meta WHERE uid=? AND nonce=? AND clip=?)',clip,uid,input.nonce,body,uid,input.nonce,clip).run();
    const existing=await q('SELECT clip,body FROM short_comment WHERE uid=? AND nonce=?',uid,input.nonce).first();
    if(!existing)return json({error:'الفيديو غير متاح'},404);
    if(existing.clip!==clip||existing.body!==body)return json({error:'طلب إرسال مختلف'},409);
  }
  const before=Number(input.before)||Number.MAX_SAFE_INTEGER;
  const rows=await q(`SELECT c.rowid AS id,c.body,c.uid,p.name,p.avatar,m.created,m.media,
    (SELECT COUNT(*) FROM short_comment_heart h WHERE h.comment_id=c.rowid) AS likes,
    EXISTS(SELECT 1 FROM short_comment_heart h WHERE h.comment_id=c.rowid AND h.uid=?) AS liked,
    EXISTS(SELECT 1 FROM short_comment_heart h WHERE h.comment_id=c.rowid AND h.uid=?) AS creatorLiked,
    (SELECT COUNT(*) FROM short_comment_meta r JOIN short_comment t ON t.uid=r.uid AND t.nonce=r.nonce WHERE r.clip=c.clip AND r.parent=c.rowid) AS replyCount
    FROM short_comment c LEFT JOIN short_comment_meta m ON m.uid=c.uid AND m.nonce=c.nonce LEFT JOIN short_profile p ON p.uid=c.uid
    WHERE c.clip=? AND m.parent IS ? AND c.rowid<? ORDER BY c.rowid DESC LIMIT 21`,uid,owner,clip,parent,before).all();
  const comments=rows.results.slice(0,20);
  return json({comments,count:(await counts(q,clip)).count,next:rows.results.length>20?comments.at(-1).id:null,social:true});
}
