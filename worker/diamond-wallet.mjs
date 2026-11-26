import {isAppOwner} from './app-owners.mjs';
export const diamondsPerPi=1000;
export const packs=[1000,2000,4000,8000,16000,32000,64000,100000];
export const packPrice=n=>n/diamondsPerPi;
export const rewardDiamonds=n=>n;
export function validPack(metadata,amount,allowLegacy){
  if(metadata.rate===diamondsPerPi)return packs.includes(metadata.diamonds)&&amount===packPrice(metadata.diamonds);
  return allowLegacy&&metadata.rate===undefined&&[10,100,500,1000].includes(metadata.diamonds)&&amount===metadata.diamonds/10;
}
// Direct Pi receipts are unprefixed. Native Pi checkout namespaces its receipts;
// store receipts have a different namespace. Both Pi writers verify the on-chain txid.
function piReceipt(row){
  return `((length(${row}.payment) BETWEEN 1 AND 128 AND ${row}.payment NOT GLOB '*[^a-zA-Z0-9_-]*') OR ${row}.payment GLOB 'native:pi:?*')
    AND length(${row}.txid)=64 AND ${row}.txid NOT GLOB '*[^a-fA-F0-9]*'`;
}
export const walletSchema=[
  'CREATE TABLE IF NOT EXISTS host_pi_wallet(uid TEXT PRIMARY KEY NOT NULL, address TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS diamond_checkout(payment TEXT PRIMARY KEY,uid TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS diamond_checkout_user ON diamond_checkout(uid)',
  'CREATE TABLE IF NOT EXISTS diamond_purchase(payment TEXT PRIMARY KEY,uid TEXT NOT NULL,diamonds INTEGER NOT NULL,txid TEXT UNIQUE NOT NULL)',
  'CREATE TABLE IF NOT EXISTS paid_room_gift(sender TEXT,nonce TEXT,room TEXT NOT NULL,host TEXT NOT NULL,gift TEXT NOT NULL,cost INTEGER NOT NULL,hostUnits INTEGER NOT NULL,PRIMARY KEY(sender,nonce))',
  'CREATE TABLE IF NOT EXISTS native_purchase_reversal(payment TEXT PRIMARY KEY,diamonds INTEGER NOT NULL CHECK(diamonds>=0))',
  'CREATE INDEX IF NOT EXISTS diamond_purchase_user ON diamond_purchase(uid)',
  'CREATE INDEX IF NOT EXISTS paid_room_gift_host ON paid_room_gift(host)',
  'CREATE TABLE IF NOT EXISTS pi_gift_funds(uid TEXT PRIMARY KEY, remaining INTEGER NOT NULL CHECK(remaining>=0))',
  'CREATE TABLE IF NOT EXISTS pi_funds_migration(version INTEGER PRIMARY KEY)',
  // Old gifts did not record the funding source. Carry forward the provably unspent Pi credit.
  `CREATE TRIGGER IF NOT EXISTS seed_pi_funds AFTER INSERT ON pi_funds_migration WHEN NEW.version=1 BEGIN
    INSERT INTO pi_gift_funds(uid,remaining) SELECT p.uid,
      MAX(0,SUM(p.diamonds)-COALESCE((SELECT SUM(g.cost) FROM paid_room_gift g WHERE g.sender=p.uid),0))
      FROM diamond_purchase p WHERE ${piReceipt('p')} GROUP BY p.uid; END`,
  'INSERT OR IGNORE INTO pi_funds_migration(version) VALUES(1)',
  `CREATE TRIGGER IF NOT EXISTS credit_pi_funds AFTER INSERT ON diamond_purchase WHEN ${piReceipt('NEW')} BEGIN
    INSERT INTO pi_gift_funds(uid,remaining) VALUES(NEW.uid,NEW.diamonds)
      ON CONFLICT(uid) DO UPDATE SET remaining=remaining+excluded.remaining; END`,
  `CREATE TRIGGER IF NOT EXISTS spend_pi_funds AFTER INSERT ON paid_room_gift BEGIN
    UPDATE pi_gift_funds SET remaining=MAX(0,remaining-NEW.cost) WHERE uid=NEW.sender; END`,
  `CREATE TRIGGER IF NOT EXISTS announce_paid_gift AFTER INSERT ON paid_room_gift BEGIN INSERT INTO room_chat(room,uid,name,text) VALUES(NEW.room,NEW.sender,(SELECT name FROM room_member WHERE room=NEW.room AND uid=NEW.sender),'🎁 '||NEW.gift||' · '||NEW.cost||' 💎 → '||(SELECT name FROM room_member WHERE room=NEW.room AND uid=NEW.host)); END`
];
export async function linkHostWallet(q, accountUid, piUid, accessToken, json) {
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
  const address = identity.wallet_address;
  if (typeof address !== 'string' || !/^G[A-Z2-7]{55}$/.test(address))
    return json({error:'لم يشارك Pi عنوان محفظتك. افتح محفظتك ثم أعد المحاولة.'}, 422);
  await q('INSERT INTO host_pi_wallet(uid,address) VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET address=excluded.address', accountUid, address).run();
  return json({walletAddress:address});
}
// Pi amounts in the ledger use twentieths of Pi (one half of a diamond).
function allFunds(buyer,giver){
  return `(SELECT COALESCE(SUM(p.diamonds-COALESCE(r.diamonds,0)),0) FROM diamond_purchase p
    LEFT JOIN native_purchase_reversal r ON r.payment=p.payment WHERE p.uid=${buyer}) -
    (SELECT COALESCE(SUM(cost),0) FROM paid_room_gift WHERE sender=${giver})`;
}
export const paidBalance=allFunds('?','?');
// Keep each channel's spend guard and displayed balance identical. A store refund can
// reduce the common balance, even when there are still Pi receipts on the account.
export function giftBalance(piOnly){
  if(!piOnly)return paidBalance;
  return `(SELECT MAX(0,MIN(COALESCE((SELECT remaining FROM pi_gift_funds WHERE uid=ids.buyer),0),
    ${allFunds('ids.buyer','ids.giver')}))
    FROM (SELECT ? AS buyer,? AS giver) ids)`;
}
export async function readWallet(q,uid,ownerUid,piOnly=false){
  const totals=await q(`SELECT ${giftBalance(piOnly)} AS diamonds,(SELECT COALESCE(SUM(CAST(ROUND(hostUnits*100) AS INTEGER)),0)/100.0 FROM paid_room_gift WHERE host=?) AS earningsUnits,(SELECT COALESCE(SUM(cost),0) FROM paid_room_gift WHERE host=? AND hostUnits=0) AS collected,(SELECT COALESCE(SUM(cost),0) FROM paid_room_gift WHERE host=?) AS receivedDiamonds`,uid,uid,uid,uid,uid).first();
  const history=await q(`SELECT nonce AS receipt,gift,cost,hostUnits AS units,host,sender,room FROM paid_room_gift WHERE sender=? OR host=? ORDER BY rowid DESC LIMIT 25`,uid,uid).all();
  const purchases=await q(`SELECT p.payment,p.diamonds,COALESCE(r.diamonds,0) AS reversed FROM diamond_purchase p LEFT JOIN native_purchase_reversal r ON r.payment=p.payment WHERE p.uid=? ${piOnly?'AND '+piReceipt('p'):''} ORDER BY p.rowid DESC LIMIT 30`,uid).all();
  const pending=await q('SELECT c.payment FROM diamond_checkout c LEFT JOIN diamond_purchase p ON p.payment=c.payment WHERE c.uid=? AND p.payment IS NULL ORDER BY c.rowid DESC LIMIT 30',uid).all();
  const owner=await isAppOwner(q,uid,ownerUid);
  const ownerBox=owner?await q(`SELECT
    (SELECT COALESCE(SUM(diamonds),0) FROM diamond_purchase) AS sold,
    (SELECT COALESCE(SUM(cost),0) FROM paid_room_gift) AS gifted`).first():null;
  const linkedWallet=await q('SELECT address FROM host_pi_wallet WHERE uid=?',uid).first();
  return {...totals,walletAddress:linkedWallet?.address??null,...(ownerBox?{ownerBox}:{}),rewardPi:5*Math.floor(totals.collected/10000),progress:totals.collected%10000,history:history.results,purchases:purchases.results,pending:pending.results};
}
