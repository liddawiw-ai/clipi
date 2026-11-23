import {diamondGifts} from './diamond-gifts.mjs';

const ownerNumber='9056366';
const trialPacks=new Map([[1,1000],[5,5000],[10,10000]]);
const validNonce=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export const trialSchema=[
  `CREATE TABLE IF NOT EXISTS clipi_trial_activity(
    uid TEXT NOT NULL,bucket TEXT NOT NULL,nonce TEXT NOT NULL,action TEXT NOT NULL,selection TEXT NOT NULL,
    delta INTEGER NOT NULL,result INTEGER,round INTEGER,pick INTEGER,PRIMARY KEY(uid,bucket,nonce))`,
  'CREATE INDEX IF NOT EXISTS trial_balance_by_uid ON clipi_trial_activity(uid,bucket)'
];
export async function trialAccount(q,uid,ownerUid,input,json,now=Date.now()){
  const owner=Boolean(ownerUid&&uid===ownerUid&&await q('SELECT 1 FROM public_numbers WHERE uid=? AND number=?',uid,ownerNumber).first());
  if(owner)await q("INSERT OR IGNORE INTO clipi_trial_activity VALUES(?,'owner','grant','grant','owner',1000000,NULL,NULL,NULL)",uid).run();
  const round=Math.floor(now/40000),elapsed=now%40000;
  const settledThrough=elapsed>=36000?round:round-1;
  await q(`INSERT OR IGNORE INTO clipi_trial_activity(uid,bucket,nonce,action,selection,delta)
      SELECT uid,bucket,'award/'||nonce,'award',selection,result FROM clipi_trial_activity
      WHERE uid=? AND action='trialPlay' AND result>0 AND round<=?`,uid,settledThrough).run();
  const balances=async()=>{
    const totals=await q("SELECT COALESCE(SUM(CASE WHEN bucket='owner' THEN delta ELSE 0 END),0) AS bonus,COALESCE(SUM(CASE WHEN bucket='sandbox' THEN delta ELSE 0 END),0) AS sandbox FROM clipi_trial_activity WHERE uid=?",uid).first();
    return {owner:owner?totals.bonus:null,sandbox:totals.sandbox};
  };
  if(input.op==='trialRead')return json(await balances());
  const bucket=input.op==='trialTopup'?'sandbox':input.bucket;
  if(!validNonce.test(input.nonce)||!['owner','sandbox'].includes(bucket))return json({error:'طلب تجريبي غير صالح'},400);
  if(bucket==='owner'&&!owner)return json({error:'الرصيد مخصّص للمالك'},403);
  let delta,cost=0,selection,result=null;
  if(input.op==='trialTopup'){
    delta=trialPacks.get(input.usd);
    if(!delta)return json({error:'باقة غير معروفة'},400);
    const method=input.method??'card';
    if(!['card','wallet'].includes(method))return json({error:'طريقة المحاكاة غير معروفة'},400);
    selection=input.usd+'/'+method;
  }else if(input.op==='trialGift'){
    const gift=diamondGifts.get(input.gift);
    if(!gift)return json({error:'هدية غير معروفة'},400);
    selection=input.gift;cost=gift.cost;delta=-cost;
  }else if(input.op==='trialPlay'){
    cost=input.amount;
    if(!Number.isInteger(input.pick)||input.pick<0||input.pick>7||![10,100,500,1000,10000].includes(cost)||!Number.isSafeInteger(input.round))return json({error:'اختيار غير صالح'},400);
    selection=[input.round,input.pick,cost].join('/');
    let seed=(Math.imul(input.round,1664525)+1013904223)>>>0;seed=(seed^(seed>>>16))>>>0;
    result=seed%8===input.pick?cost*[5,10,5,15,5,25,5,45][input.pick]:0;
    delta=-cost;
  }else return json({error:'طلب غير معروف'},400);
  await q(`INSERT INTO clipi_trial_activity(uid,bucket,nonce,action,selection,delta,result,round,pick)
     SELECT ?,?,?,?,?,?,?,?,? WHERE COALESCE((SELECT SUM(delta) FROM clipi_trial_activity WHERE uid=? AND bucket=?),0)>=?
     AND (?<>'trialPlay' OR (?=? AND ?<30000 AND
       (SELECT COUNT(DISTINCT pick) FROM clipi_trial_activity WHERE uid=? AND bucket=? AND round=? AND action='trialPlay' AND pick<>?)<6))
     ON CONFLICT(uid,bucket,nonce) DO NOTHING`,uid,bucket,input.nonce,input.op,selection,delta,result,input.round??null,input.pick??null,uid,bucket,cost,input.op,input.round??null,round,elapsed,uid,bucket,input.round??null,input.pick??null).run();
  const receipt=await q('SELECT action,selection,delta,result FROM clipi_trial_activity WHERE uid=? AND bucket=? AND nonce=?',uid,bucket,input.nonce).first();
  if(!receipt)return json({error:input.op==='trialPlay'?'تحقق من رصيد التجربة وتوقيت الجولة وعدد الخانات':'رصيد الماس التجريبي غير كافٍ'},409);
  if(receipt.action!==input.op||receipt.selection!==selection)return json({error:'مرجع العملية مستخدم'},409);
  return json({...await balances(),receipt});
}
