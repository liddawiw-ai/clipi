import {googleAccess} from './pi-login.mjs';

// Receiving preferences contain a provider product identifier, never payout credentials.
export const earningsPreferences = 'CREATE TABLE IF NOT EXISTS host_receiving_method(uid TEXT PRIMARY KEY, country TEXT NOT NULL, product TEXT NOT NULL, label TEXT NOT NULL)';
// A review is a private question for the owner. Only the existing payout provider debits money.
export async function requestWithdrawalReview(q,uid,points,funded,destination,reward=false){
  if(!funded || !destination || funded.withdrawal?.state==='pending' || funded.nextEligibleAt>Date.now() ||
     !Number.isSafeInteger(points)||points<2000||points>funded.availablePoints)return false;
  const detail=(reward?points+' نقطة':(points/100).toFixed(2)+' USD')+' · '+destination;
  await q(`INSERT INTO support_case(id,uid,kind,subject,detail,created)
    SELECT ?,?,'withdrawal-review','',?,? WHERE NOT EXISTS(
      SELECT 1 FROM support_case c WHERE c.uid=? AND c.kind='withdrawal-review'
        AND (c.created>? OR NOT EXISTS(SELECT 1 FROM support_reply WHERE case_id=c.id)))`,
    crypto.randomUUID(),uid,detail,Math.floor(Date.now()/1000),uid,Math.floor(Date.now()/1000)-15*86400).run();
  const saved=await q("SELECT detail FROM support_case WHERE uid=? AND kind='withdrawal-review' ORDER BY rowid DESC LIMIT 1",uid).first();
  return saved?.detail===detail;
}
export async function hostEarnings(q, uid, input, json, env, identity) {
  if (input.op === 'linkReceivingContact') {
    const contact=identity.emailVerified && identity.email ? identity.email : identity.phoneNumber;
    if(!contact)return json({error:'يلزم بريد أو هاتف موثّق لربط وسيلة الاستلام'},409);
    const masked=contact.includes('@')?contact[0]+'•••@'+contact.split('@')[1]:'••••'+contact.slice(-4);
    await q('INSERT INTO host_receiving_contact(uid,contact) VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET contact=excluded.contact',uid,masked).run();
  }
  if (input.op === 'saveReceivingMethod') {
    const {country, product, label} = input;
    if (!/^[A-Z]{2}$/.test(country || '') || typeof product !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(product) || typeof label !== 'string' ||
        !label.trim() || label.length > 120) return json({error:'وسيلة استلام غير صالحة'}, 400);
    await q('INSERT INTO host_receiving_method VALUES(?,?,?,?) ON CONFLICT(uid) DO UPDATE SET country=excluded.country,product=excluded.product,label=excluded.label',
      uid, country, product, label.trim()).run();
  }
  const method = await q('SELECT country,product,label FROM host_receiving_method WHERE uid=?', uid).first();
  const statement = await q('SELECT COALESCE(SUM(host_points2),0) AS units FROM clipi_agency_statement WHERE host=?', uid).first();
  const contact=await q('SELECT contact FROM host_receiving_contact WHERE uid=?',uid).first();
  const pi=await q('SELECT address FROM host_pi_wallet WHERE uid=?',uid).first();
  let funded=null;
  if(env.PI_FIREBASE_SIGNER_EMAIL&&env.PI_FIREBASE_SIGNER_KEY){
    try{
      const token=await googleAccess(env,'https://www.googleapis.com/auth/datastore');
      if(token)funded=await fundedSnapshot(env,uid,token);
    }catch{ /* An unavailable ledger has no displayable balance. */ }
  }
  if(input.op==='requestWithdrawalReview'||input.op==='requestRewardReview'){
    const destination=pi?.address?'Pi · '+pi.address.slice(0,6)+'…'+pi.address.slice(-6):contact?.contact||method?.label;
    if(!await requestWithdrawalReview(q,uid,input.points,funded,destination,input.op==='requestRewardReview'))
      return json({error:'تحقّق من وسيلة الاستلام والنقاط المتاحة وموعد طلب المكافأة'},409);
  }
  const review=await q(`SELECT c.id,c.detail,c.created,r.body AS reply FROM support_case c
    LEFT JOIN support_reply r ON r.case_id=c.id WHERE c.kind='withdrawal-review' AND c.uid=?
    ORDER BY c.rowid DESC LIMIT 1`,uid).first();
  return json({review:review||null,method:method || null, statementPoints:statement.units / 2, funded:funded?{...funded,availableUsdMinor:funded.availablePoints}:null,
    canVerifyEmail:Boolean(identity.email&&!identity.emailVerified&&!identity.phoneNumber),
    canLinkContact:Boolean(identity.emailVerified && identity.email || identity.phoneNumber),contact:contact?.contact||null,
    walletAddress:pi?.address||null});
}

// Read the same settled balance used by the payout service. Request only fields displayed to this account.
export async function fundedSnapshot(env, uid, token) {
  const root='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID || 'clipi-f67c0')+'/databases/(default)/documents/earningsWallets/'+encodeURIComponent(uid);
  async function read(url, fields) {
    const query=new URL(url);
    fields.forEach(field=>query.searchParams.append('mask.fieldPaths',field));
    const response=await fetch(query,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(6000)});
    if(response.status===404)return {};
    if(!response.ok)throw Error('wallet read unavailable');
    return (await response.json()).fields || {};
  }
  const wallet=await read(root,['availablePoints','activeWithdrawal','lastWithdrawal','lastPayoutRequestAt']);
  const points=Number(wallet.availablePoints?.integerValue || 0);
  if(!Number.isSafeInteger(points)||points<0)throw Error('invalid wallet balance');
  const id=wallet.activeWithdrawal?.stringValue || wallet.lastWithdrawal?.stringValue;
  let withdrawal=null;
  if(id && /^[a-zA-Z0-9_-]{1,128}$/.test(id)){
    const order=await read(root+'/withdrawals/'+encodeURIComponent(id),['state','points']);
    if(order.state)withdrawal={id,state:order.state.stringValue,points:Number(order.points?.integerValue || 0)};
  }
  const last=Date.parse(wallet.lastPayoutRequestAt?.timestampValue||'');
  return {availablePoints:points,withdrawal,nextEligibleAt:Number.isFinite(last)?last+15*86400000:null};
}
