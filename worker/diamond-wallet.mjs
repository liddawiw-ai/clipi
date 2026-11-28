import {isAppOwner} from './app-owners.mjs';
export const diamondsPerPi=1000;
export const packs=[1000,2000,4000,8000,16000,32000,64000,100000];
export const packPrice=n=>n/diamondsPerPi;
export const rewardDiamonds=n=>n;
export function validPack(metadata,amount,allowLegacy){
  if(metadata.rate===diamondsPerPi)return packs.includes(metadata.diamonds)&&amount===packPrice(metadata.diamonds);
  return allowLegacy&&metadata.rate===undefined&&[10,100,500,1000].includes(metadata.diamonds)&&amount===metadata.diamonds/10;
}
export const walletSchema=[
  'CREATE TABLE IF NOT EXISTS game_cosmetic_purchase(uid TEXT NOT NULL,item TEXT NOT NULL,cost INTEGER NOT NULL CHECK(cost>0),PRIMARY KEY(uid,item))',
  'CREATE TABLE IF NOT EXISTS game_cosmetic_equipped(uid TEXT NOT NULL,kind TEXT NOT NULL,item TEXT NOT NULL,PRIMARY KEY(uid,kind))',
  'CREATE TABLE IF NOT EXISTS host_pi_wallet(uid TEXT PRIMARY KEY NOT NULL, address TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS diamond_checkout(payment TEXT PRIMARY KEY,uid TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS diamond_checkout_user ON diamond_checkout(uid)',
  'CREATE TABLE IF NOT EXISTS diamond_purchase(payment TEXT PRIMARY KEY,uid TEXT NOT NULL,diamonds INTEGER NOT NULL,txid TEXT UNIQUE NOT NULL)',
  'CREATE TABLE IF NOT EXISTS paid_room_gift(sender TEXT,nonce TEXT,room TEXT NOT NULL,host TEXT NOT NULL,gift TEXT NOT NULL,cost INTEGER NOT NULL,hostUnits INTEGER NOT NULL,PRIMARY KEY(sender,nonce))',
  'CREATE TABLE IF NOT EXISTS native_purchase_reversal(payment TEXT PRIMARY KEY,diamonds INTEGER NOT NULL CHECK(diamonds>=0))',
  'CREATE INDEX IF NOT EXISTS diamond_purchase_user ON diamond_purchase(uid)',
  'CREATE INDEX IF NOT EXISTS paid_room_gift_host ON paid_room_gift(host)',
  `CREATE TRIGGER IF NOT EXISTS announce_paid_gift AFTER INSERT ON paid_room_gift BEGIN INSERT INTO room_chat(room,uid,name,text) VALUES(NEW.room,NEW.sender,(SELECT name FROM room_member WHERE room=NEW.room AND uid=NEW.sender),'🎁 '||NEW.gift||' · '||NEW.cost||' 💎 → '||(SELECT name FROM room_member WHERE room=NEW.room AND uid=NEW.host)); END`
];
export async function linkHostWallet(q, accountUid, piUid, accessToken, json, env, requestedAddress, replaceWallet=false) {
  if (!piUid || typeof accessToken !== 'string' || !/^\S{1,4096}$/.test(accessToken))
    return json({error:'ادخل بحساب PI نفسه'}, 403);
  let identity;
  try {
    const response = await fetch('https://api.minepi.com/v2/me', {
      headers: {Authorization:'Bearer ' + accessToken}, signal:AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      const status = [401,403].includes(response.status) ? 401 : 502;
      return json({error:'تعذّر التحقق من حساب Pi'}, status);
    }
    identity = await response.json();
  } catch {
    return json({error:'تعذّر التحقق من حساب Pi'}, 502);
  }
  if (typeof identity?.uid !== 'string' || 'pi:' + identity.uid !== piUid)
    return json({error:'حساب Pi المفتوح مختلف عن حساب التطبيق.'}, 409);
  if (replaceWallet && (typeof requestedAddress !== 'string' || !/^G[A-Z2-7]{55}$/.test(requestedAddress))) return json({error:'Invalid wallet address'},400);
  let address = identity.wallet_address;
  if (replaceWallet && address !== requestedAddress) address = null;
  // When Pi does not expose the address in /me, verify an explicitly selected
  // address against an already settled, account-owned Mainnet purchase.
  if (!/^G[A-Z2-7]{55}$/.test(address || '') &&
      env?.PI_GIFTS_NETWORK === 'mainnet' && env.PI_NETWORK_API_KEY &&
      typeof requestedAddress === 'string' && /^G[A-Z2-7]{55}$/.test(requestedAddress)) {
    const receipts = await q('SELECT payment,txid FROM diamond_purchase WHERE uid=? ORDER BY rowid DESC LIMIT 5',accountUid).all();
    for (const receipt of receipts.results || []) {
      try {
        const response = await fetch('https://api.minepi.com/v2/payments/'+encodeURIComponent(receipt.payment),{
          headers:{Authorization:'Key '+env.PI_NETWORK_API_KEY},signal:AbortSignal.timeout(3000)
        });
        if (!response.ok) continue;
        const p=await response.json();
        if (p.identifier===receipt.payment && p.user_uid===identity.uid &&
            p.direction==='user_to_app' && p.network==='Pi Network' &&
            p.status?.developer_completed===true && p.status?.transaction_verified===true &&
            !p.status.cancelled && !p.status.user_cancelled &&
            p.transaction?.txid===receipt.txid && p.from_address===requestedAddress) {
          address=requestedAddress;break;
        }
      } catch {}
    }
  }
  if (typeof address !== 'string' || !/^G[A-Z2-7]{55}$/.test(address))
    return json({error:'لم يشارك Pi عنوان محفظتك. افتح محفظتك ثم أعد المحاولة.'}, 422);
  if (replaceWallet && address !== requestedAddress) return json({error:'تعذّر التحقق من العنوان الجديد'},422);
  await q('INSERT INTO host_pi_wallet(uid,address) VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET address=excluded.address', accountUid, address).run();
  return json({walletAddress:address});
}
// Pi amounts in the ledger use twentieths of Pi (one half of a diamond).
export const paidBalance='(SELECT COALESCE(SUM(p.diamonds-COALESCE(r.diamonds,0)),0) FROM diamond_purchase p LEFT JOIN native_purchase_reversal r ON r.payment=p.payment WHERE uid=?) - (SELECT COALESCE(SUM(cost),0) FROM (SELECT sender,cost FROM paid_room_gift UNION ALL SELECT uid AS sender,cost FROM game_cosmetic_purchase) WHERE sender=?)';
export async function readWallet(q,uid,ownerUid){
  const totals=await q(`SELECT ${paidBalance} AS diamonds,(SELECT COALESCE(SUM(CAST(ROUND(hostUnits*100) AS INTEGER)),0)/100.0 FROM paid_room_gift WHERE host=?) AS earningsUnits,(SELECT COALESCE(SUM(cost),0) FROM paid_room_gift WHERE host=? AND hostUnits=0) AS collected,(SELECT COALESCE(SUM(cost),0) FROM paid_room_gift WHERE host=?) AS receivedDiamonds`,uid,uid,uid,uid,uid).first();
  const history=await q(`SELECT nonce AS receipt,gift,cost,hostUnits AS units,host,sender,room FROM paid_room_gift WHERE sender=? OR host=? ORDER BY rowid DESC LIMIT 25`,uid,uid).all();
  const purchases=await q('SELECT p.payment,p.diamonds,COALESCE(r.diamonds,0) AS reversed FROM diamond_purchase p LEFT JOIN native_purchase_reversal r ON r.payment=p.payment WHERE p.uid=? ORDER BY p.rowid DESC LIMIT 30',uid).all();
  const pending=await q('SELECT c.payment FROM diamond_checkout c LEFT JOIN diamond_purchase p ON p.payment=c.payment WHERE c.uid=? AND p.payment IS NULL ORDER BY c.rowid DESC LIMIT 30',uid).all();
  const owner=await isAppOwner(q,uid,ownerUid);
  const ownerBox=owner?await q(`SELECT
    (SELECT COALESCE(SUM(diamonds),0) FROM diamond_purchase) AS sold,
    (SELECT COALESCE(SUM(cost),0) FROM paid_room_gift) AS gifted`).first():null;
  const linkedWallet=await q('SELECT address FROM host_pi_wallet WHERE uid=?',uid).first();
  return {...totals,walletAddress:linkedWallet?.address??null,...(ownerBox?{ownerBox}:{}),rewardPi:5*Math.floor(totals.collected/10000),progress:totals.collected%10000,history:history.results,purchases:purchases.results,pending:pending.results};
}
