import {googleAccess} from './pi-login.mjs';

// Receiving preferences contain a provider product identifier, never payout credentials.
export const earningsPreferences = 'CREATE TABLE IF NOT EXISTS host_receiving_method(uid TEXT PRIMARY KEY, country TEXT NOT NULL, product TEXT NOT NULL, label TEXT NOT NULL)';
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
  return json({method:method || null, statementPoints:statement.units / 2, funded,
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
  const wallet=await read(root,['availablePoints','activeWithdrawal','lastWithdrawal']);
  const points=Number(wallet.availablePoints?.integerValue || 0);
  if(!Number.isSafeInteger(points)||points<0)throw Error('invalid wallet balance');
  const id=wallet.activeWithdrawal?.stringValue || wallet.lastWithdrawal?.stringValue;
  let withdrawal=null;
  if(id && /^[a-zA-Z0-9_-]{1,128}$/.test(id)){
    const order=await read(root+'/withdrawals/'+encodeURIComponent(id),['state','points']);
    if(order.state)withdrawal={id,state:order.state.stringValue,points:Number(order.points?.integerValue || 0)};
  }
  return {availableUsdMinor:points,withdrawal};
}
