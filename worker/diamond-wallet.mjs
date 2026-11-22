export const packs=[10,100,500,1000];
export const walletSchema=[
  'CREATE TABLE IF NOT EXISTS diamond_checkout(payment TEXT PRIMARY KEY,uid TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS diamond_checkout_user ON diamond_checkout(uid)',
  'CREATE TABLE IF NOT EXISTS diamond_purchase(payment TEXT PRIMARY KEY,uid TEXT NOT NULL,diamonds INTEGER NOT NULL,txid TEXT UNIQUE NOT NULL)',
  'CREATE TABLE IF NOT EXISTS paid_room_gift(sender TEXT,nonce TEXT,room TEXT NOT NULL,host TEXT NOT NULL,gift TEXT NOT NULL,cost INTEGER NOT NULL,hostUnits INTEGER NOT NULL,PRIMARY KEY(sender,nonce))',
  'CREATE INDEX IF NOT EXISTS diamond_purchase_user ON diamond_purchase(uid)',
  'CREATE INDEX IF NOT EXISTS paid_room_gift_host ON paid_room_gift(host)',
  `CREATE TRIGGER IF NOT EXISTS announce_paid_gift AFTER INSERT ON paid_room_gift BEGIN INSERT INTO room_chat(room,uid,name,text) VALUES(NEW.room,NEW.sender,(SELECT name FROM room_member WHERE room=NEW.room AND uid=NEW.sender),'🎁 '||NEW.gift||' · '||NEW.cost||' 💎 → '||(SELECT name FROM room_member WHERE room=NEW.room AND uid=NEW.host)); END`
];
// Pi amounts in the ledger use twentieths of Pi (one half of a diamond).
export const paidBalance='(SELECT COALESCE(SUM(diamonds),0) FROM diamond_purchase WHERE uid=?) - (SELECT COALESCE(SUM(cost),0) FROM paid_room_gift WHERE sender=?)';
export async function readWallet(q,uid){
  const totals=await q(`SELECT ${paidBalance} AS diamonds,(SELECT COALESCE(SUM(hostUnits),0) FROM paid_room_gift WHERE host=?) AS earningsUnits`,uid,uid,uid).first();
  const history=await q(`SELECT gift,cost,hostUnits AS units,host,sender,room FROM paid_room_gift WHERE sender=? OR host=? ORDER BY rowid DESC LIMIT 25`,uid,uid).all();
  const purchases=await q('SELECT payment,diamonds FROM diamond_purchase WHERE uid=? ORDER BY rowid DESC LIMIT 30',uid).all();
  const pending=await q('SELECT c.payment FROM diamond_checkout c LEFT JOIN diamond_purchase p ON p.payment=c.payment WHERE c.uid=? AND p.payment IS NULL ORDER BY c.rowid DESC LIMIT 30',uid).all();
  return {...totals,history:history.results,purchases:purchases.results,pending:pending.results};
}
