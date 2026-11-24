// Both login methods keep their original provider identifiers. The link only changes the default Clipi sign-in destination.
const schema = 'CREATE TABLE IF NOT EXISTS clipi_pi_login_link(pi_uid TEXT PRIMARY KEY NOT NULL,email_uid TEXT UNIQUE NOT NULL)';
const ready = new WeakMap();
export async function linkStore(env) {
  if (env.PI_GIFTS_NETWORK !== 'mainnet') return null;
  const db = env.PI_GIFTS_DB;
  if (!db) throw Error('Missing login database');
  if (!ready.has(db)) ready.set(db,db.prepare(schema).run().catch(e=>{ready.delete(db);throw e;}));
  await ready.get(db);
  return db;
}
export async function linkedEmail(db,piUid) {
  if (!db) return null;
  const row=await db.prepare('SELECT email_uid FROM clipi_pi_login_link WHERE pi_uid=?').bind(piUid).first();
  return row?.email_uid ?? null;
}
export async function linkedPi(db,emailUid) {
  if (!db) return null;
  const row=await db.prepare('SELECT pi_uid FROM clipi_pi_login_link WHERE email_uid=?').bind(emailUid).first();
  return row?.pi_uid ?? null;
}
export async function registeredPair(db,piUid,emailUid) {
  const read=db.prepare('SELECT o.uid,COALESCE(s.number,p.number) AS number FROM clipi_app_owner o JOIN public_numbers p ON p.uid=o.uid AND p.cost=0 LEFT JOIN selected_number s ON s.uid=o.uid WHERE o.uid IN (?,?)');
  const {results}=await read.bind(piUid,emailUid).all();
  const number=uid=>results.find(r=>r.uid===uid)?.number;
  return number(piUid)&&number(emailUid) ? {piNumber:number(piUid),emailNumber:number(emailUid)}:null;
}
export async function recordLink(db,piUid,emailUid) {
  // Unique constraints reject a competing link. Duplicate confirmations of the same pair are harmless.
  await db.prepare(`INSERT INTO clipi_pi_login_link(pi_uid,email_uid)
    SELECT ?,? WHERE (SELECT COUNT(*) FROM clipi_app_owner WHERE uid IN (?,?))=2
    ON CONFLICT DO NOTHING`).bind(piUid,emailUid,piUid,emailUid).run();
  return await linkedEmail(db,piUid)===emailUid;
}

// Identity Toolkit verifies the entire ID token. Only use its claims after the lookup succeeds and the project and subject match.
export async function recentPasswordAccount(token,apiKey) {
  if (typeof token!=='string'||token.length>8192||token.split('.').length!==3) return null;
  const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(apiKey),{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    if(response.status===400||response.status===401||response.status===403)return null;
    throw Error('Identity service unavailable');
  }
  const user=(await response.json()).users?.[0];
  let claims;
  try { claims=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(token.split('.')[1].replaceAll('-','+').replaceAll('_','/')),ch=>ch.charCodeAt(0)))); }
  catch {return null;}
  const now=Math.floor(Date.now()/1000);
  if (!user?.localId||user.disabled||user.localId.startsWith('pi:')||!user.email||
      !user.providerUserInfo?.some(p=>p.providerId==='password')||
      claims.sub!==user.localId||claims.aud!=='clipi-f67c0'||claims.iss!=='https://securetoken.google.com/clipi-f67c0'||
      claims.firebase?.sign_in_provider!=='password'||!Number.isSafeInteger(claims.auth_time)||
      claims.auth_time>now+30||claims.auth_time<now-300||!Number.isFinite(claims.exp)||claims.exp<=now) return null;
  return user.localId;
}
