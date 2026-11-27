import {Account,Asset,Keypair,Memo,Operation,TransactionBuilder} from '@stellar/stellar-sdk';
const horizon='https://api.testnet.minepi.com', network='Pi Testnet';
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
export async function payoutTestReward(env,uid){
 if(env.PI_GIFTS_TESTNET!=='1'||env.PI_GIFTS_NETWORK==='mainnet')throw Error('network');
 const db=env.PI_GIFTS_DB, q=(sql,...a)=>db.prepare(sql).bind(...a);
 const wallet=Keypair.fromSecret(env.PI_WALLET_PRIVATE_SEED.trim()), source=wallet.publicKey();
 if(source!==env.PI_TEST_WALLET_ADDRESS.trim())throw Error('wallet');
 async function api(path,body){
  const r=await fetch('https://api.minepi.com/v2'+path,{method:body?'POST':'GET',headers:{Authorization:'Key '+env.PI_NETWORK_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
  if(!r.ok){const stage=path==='/payments/incomplete_server_payments'?'recover':path==='/payments'?'create':path.endsWith('/complete')?'complete':'lookup';throw Error('PI_'+stage+'_'+r.status);}
  return r.json();
 }
 async function chain(path,body){
  return fetch(horizon+path,{method:body?'POST':'GET',body,signal:AbortSignal.timeout(15000)});
 }
 await q("CREATE TABLE IF NOT EXISTS test_reward_payout(uid TEXT PRIMARY KEY,payment TEXT UNIQUE,destination TEXT UNIQUE,txid TEXT UNIQUE,envelope TEXT,state TEXT NOT NULL)").run();
 await q("CREATE TABLE IF NOT EXISTS test_reward_lock(id INTEGER PRIMARY KEY CHECK(id=1),holder TEXT NOT NULL)").run();
 const holder=crypto.randomUUID();
 const lock=await q("INSERT OR IGNORE INTO test_reward_lock VALUES(1,?)",holder).run();
 if(lock.meta.changes!==1)return {state:'busy',message:'عملية اختبار أخرى قيد التنفيذ. حاول مجددًا.'};
 try{
  let row=await q('SELECT * FROM test_reward_payout WHERE uid=?',uid).first();
  if(row?.state==='complete')return {state:'complete',txid:row.txid,message:'تم تحويل المكافأة التجريبية سابقًا.'};
  if(!row){
   if((await q('SELECT COUNT(*) AS n FROM test_reward_payout').first()).n>=5)return {state:'limit',message:'اكتملت قائمة الاختبار.'};
   await q("INSERT INTO test_reward_payout(uid,state) VALUES(?,'creating')",uid).run();
   const p=await api('/payments',{payment:{uid,amount:1,memo:'Clipi Testnet reward',metadata:{kind:'clipi_test_reward_v1'}}});
   if(!valid(p,uid,source)||p.transaction||!p.identifier||! /^[A-Za-z0-9_-]{1,28}$/.test(p.identifier))throw Error('PI_PAYMENT_MISMATCH');
   await q("UPDATE test_reward_payout SET payment=?,destination=?,state='created' WHERE uid=?",p.identifier,p.to_address,uid).run();
   row=await q('SELECT * FROM test_reward_payout WHERE uid=?',uid).first();
  }
  if(!row.payment){
   const pending=await api('/payments/incomplete_server_payments');
   if(!Array.isArray(pending.incomplete_server_payments))throw Error('PI_RECOVERY_FORMAT');
   const candidates=pending.incomplete_server_payments.filter(p=>valid(p,uid,source)&&!p.status?.cancelled&&!p.status?.user_cancelled&&typeof p.identifier==='string'&&/^[A-Za-z0-9_-]{1,28}$/.test(p.identifier));
   if(candidates.length!==1)return {state:'review',message:candidates.length?'توجد عدة معاملات معلقة؛ يلزم فحصها.':'لم نجد معاملة مطابقة لدى Pi. يلزم مراجعة إعدادات API وصلاحية المحفظة قبل إنشاء طلب بديل.'};
   const p=await api('/payments/'+candidates[0].identifier);
   if(!valid(p,uid,source)||p.identifier!==candidates[0].identifier||p.status?.cancelled||p.status?.user_cancelled)throw Error('PI_RECOVERY_MISMATCH');
   if(p.transaction)return {state:'review',message:'وجدنا معاملة سابقة على الشبكة تحتاج مراجعة؛ لن نرسل مبلغًا آخر.'};
   await q("UPDATE test_reward_payout SET payment=?,destination=?,state='created' WHERE uid=? AND payment IS NULL AND txid IS NULL",p.identifier,p.to_address,uid).run();
   row=await q('SELECT * FROM test_reward_payout WHERE uid=?',uid).first();
  }
  const p=await api('/payments/'+row.payment);
  if(!valid(p,uid,source)||p.to_address!==row.destination||p.identifier!==row.payment)throw Error('PI_PAYMENT_MISMATCH');
  if(p.status?.cancelled||p.status?.user_cancelled)throw Error('cancelled');
  if(!row.txid){
   if(p.transaction)throw Error('unexpected transaction');
   const dest=await chain('/accounts/'+row.destination);
   if(!dest.ok)throw Error('recipient unavailable');
   const account=await chain('/accounts/'+source);
   if(!account.ok)throw Error('source unavailable');
   const a=await account.json();
   const fees=await chain('/fee_stats');if(!fees.ok)throw Error('fee unavailable');
   const fee=String((await fees.json()).last_ledger_base_fee);
   if(!/^\d{1,7}$/.test(fee)||Number(fee)<1)throw Error('fee');
   const tx=new TransactionBuilder(new Account(source,String(a.sequence)),{fee,networkPassphrase:network})
    .addOperation(Operation.payment({destination:row.destination,asset:Asset.native(),amount:'1'}))
    .addMemo(Memo.text(row.payment)).setTimeout(180).build();
   tx.sign(wallet);
   const txid=hex(tx.hash()),envelope=tx.toXDR();
   await q("UPDATE test_reward_payout SET txid=?,envelope=?,state='signed' WHERE uid=? AND txid IS NULL",txid,envelope,uid).run();
   row=await q('SELECT * FROM test_reward_payout WHERE uid=?',uid).first();
  }
  let lookup=await chain('/transactions/'+row.txid);
  if(lookup.status===404){
   const submitted=await chain('/transactions',new URLSearchParams({tx:row.envelope}));
   if(!submitted.ok)return {state:'review',message:'المعاملة الموقعة تحتاج تحققًا. لن ننشئ معاملة بديلة تلقائيًا.'};
   lookup=await chain('/transactions/'+row.txid);
  }
  if(!lookup.ok)throw Error('chain unavailable');
  const tx=await lookup.json();
  if(tx.hash!==row.txid||tx.successful!==true)throw Error('chain mismatch');
  const done=p.status?.developer_completed?p:await api('/payments/'+row.payment+'/complete',{txid:row.txid});
  if(!valid(done,uid,source)||done.identifier!==row.payment||done.to_address!==row.destination||done.transaction?.txid!==row.txid||done.status?.developer_completed!==true||done.status?.transaction_verified!==true)throw Error('PI_COMPLETION_PENDING');
  await q("UPDATE test_reward_payout SET state='complete',envelope=NULL WHERE uid=?",uid).run();
  await q("UPDATE test_reward_requests SET state='complete' WHERE uid=?",uid).run();
  return {state:'complete',txid:row.txid,message:'تم تحويل 1 Test-Pi وتأكيده لدى Pi.'};
 }catch(error){const code=String(error?.message||'');const safe=/^PI_[A-Za-z0-9_]{1,60}$/.test(code)?code:'TEST_PAYOUT_INTERNAL';console.warn('Clipi Testnet payout stage',safe);return {state:'review',code:safe,message:'توقف التحقق عند المرحلة: '+safe+' . لم نؤكد الصرف.'};}finally{await q('DELETE FROM test_reward_lock WHERE id=1 AND holder=?',holder).run()}
}
function valid(p,uid,source){return p?.network==='Pi Testnet'&&p.direction==='app_to_user'&&p.user_uid===uid&&p.amount===1&&p.from_address===source&&typeof p.to_address==='string'&&/^G[A-Z2-7]{55}$/.test(p.to_address)&&p.to_address!==source&&p.metadata?.kind==='clipi_test_reward_v1'}
