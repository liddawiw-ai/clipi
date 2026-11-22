import React,{useState,useEffect,useRef} from 'react';
import {auth,piSdk} from './services';
import {rewardDiamonds,packs,packPrice,diamondsPerPi} from '../worker/diamond-wallet.mjs';
const label=(ar,en)=>document.documentElement.lang==='ar'?ar:en;
export async function walletRead(){
  const token=await auth().currentUser.getIdToken();
  const response=await fetch('/account-number',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({op:'wallet'})});
  if(!response.ok)throw Error(label('تعذر تحديث المحفظة','Wallet refresh failed'));
  return response.json();
}
async function payment(action,data){
  const response=await fetch('/pi-gifts/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(!response.ok)throw Error(label('تعذر تأكيد الدفعة. تحقق من المحفظة قبل إعادة المحاولة.','Payment confirmation failed. Check your wallet before retrying.'));
}
export function DiamondWallet({uid}){
  const [data,setData]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [receipt,setReceipt]=useState('');
  const lock=useRef(false);
  async function refresh(){const snapshot=await walletRead();if(auth().currentUser?.uid===uid)setData(snapshot)}
  useEffect(()=>{refresh().catch(e=>setMessage(e.message))},[uid]);
  async function restore(){
    if(lock.current)return;
    lock.current=true;setBusy(true);setMessage('');
    try{
      const ids=new Set((data?.pending||[]).map(p=>p.payment));
      if(receipt.trim())ids.add(receipt.trim());
      const session=await piSdk().authenticate(['username','payments'],p=>{if(p.metadata?.kind==='diamond_pack')ids.add(p.identifier)});
      if('pi:'+session.user.uid!==uid)throw Error(label('ادخل بحساب Pi نفسه','Sign in with the same Pi account'));
      let restored=0;
      for(const paymentId of ids){
        try{await payment('restore',{paymentId,kind:'diamond_pack',accessToken:session.accessToken});restored++}catch{}
      }
      await refresh();
      setMessage(restored?label('تم التحقق من الشراء وتحديث المحفظة','Purchase verified and wallet updated'):label('لم نجد دفعة باقة مؤكدة للاستعادة. راجع سجل الشحن أو أدخل معرّف دفعة Pi.','No confirmed pack found to restore. Check credit history or enter the Pi payment ID.'));
    }catch(e){setMessage(e.message)}finally{lock.current=false;setBusy(false)}
  }
  async function buy(diamonds){
    if(lock.current)return;
    lock.current=true;setBusy(true);setMessage('');
    const finish=text=>{lock.current=false;setBusy(false);setMessage(text)};
    try{
      const sdk=piSdk(),pending=[];
      const session=await sdk.authenticate(['username','payments'],p=>pending.push(p));
      if('pi:'+session.user.uid!==uid)throw Error(label('ادخل بحساب Pi نفسه','Sign in with the same Pi account'));
      const accessToken=session.accessToken;
      for(const old of pending)await payment('complete',{kind:old.metadata?.kind,roomId:old.metadata?.roomId,paymentId:old.identifier,txid:old.transaction?.txid,accessToken});
      if(pending.length){await refresh();finish(label('تمت مراجعة الدفعة السابقة','Previous payment reconciled'));return}
      await sdk.createPayment({amount:packPrice(diamonds),memo:'Clipi · '+diamonds+' diamonds',metadata:{kind:'diamond_pack',uid,diamonds,rate:diamondsPerPi}},{
        onReadyForServerApproval:id=>payment('approve',{paymentId:id,kind:'diamond_pack',accessToken}).catch(e=>setMessage(e.message)),
        onReadyForServerCompletion:async(id,txid)=>{try{await payment('complete',{paymentId:id,txid,kind:'diamond_pack',accessToken});await refresh();finish(label('تم شحن الماس','Diamonds credited'))}catch(e){finish(e.message)}},
        onCancel:()=>finish(label('أُلغي الدفع','Payment cancelled')),onError:()=>finish(label('تعذر إتمام الشراء','Purchase failed'))
      });
    }catch(e){finish(e.message)}
  }
  return <section style={{color:'white',padding:16}} dir="auto">
    <p>{label('الماس المشترى','Purchased diamonds')} · {data?.diamonds??'…'} 💎</p>
    <p>{label('مكافآت المضيف','Host rewards')} · {data?data.rewardPi:'…'} Pi</p>
    <p>{label('التقدم نحو المكافأة التالية','Progress toward the next reward')} · {data?.progress??'…'} / 10,000 💎</p>
    <p>{label('عندما يجمع المضيف 10,000 ماسة دعم، تُرسَل له 5 Pi كمكافأة في محفظته داخل Clipi.','For every 10,000 support diamonds a host collects, their Clipi wallet is credited with a 5 Pi reward.')}</p>
    {!!data?.earningsUnits&&<p>{label('رصيد سابق محفوظ','Previous recorded balance')} · {data.earningsUnits/20} Pi</p>}
    <button onClick={()=>refresh().catch(e=>setMessage(e.message))}>{label('تحديث الرصيد','Refresh balance')}</button>
    {uid.startsWith('pi:')&&<div><input aria-label={label('معرّف دفعة Pi','Pi payment ID')} placeholder={label('معرّف دفعة Pi (اختياري)','Pi payment ID (optional)')} value={receipt} onChange={e=>setReceipt(e.target.value)}/><button disabled={busy} onClick={restore}>{label('استعادة شراء سابق','Restore purchase')}</button></div>}
    <h3>{label('سجل شحن الماس','Diamond credit history')}</h3>
    {data?.purchases?.map(p=><p key={p.payment}>{p.diamonds} 💎 · {p.payment}</p>)}
    <h3>{label('شراء الماس','Buy diamonds')}</h3>
    {uid.startsWith('pi:')?packs.map(n=><button key={n} disabled={busy} style={{margin:4,padding:10}} onClick={()=>buy(n)}>{n.toLocaleString('en-US')} 💎 · {packPrice(n)} Pi</button>):<p>{label('ادخل بحساب Pi لشراء الماس','Sign in with Pi to buy diamonds')}</p>}
    <p role="status">{message}</p><h3>{label('آخر الهدايا المدفوعة','Recent purchased-diamond gifts')}</h3>
    {data?.history.map((g,i)=><p key={i}>{uid===g.host?label('واردة','Received'):label('مرسلة','Sent')} · {g.gift} · {g.cost} 💎 · {g.units?label('رصيد سابق','Previous credit')+' '+g.units/20+' Pi':label('ماسات للمكافأة','Reward diamonds')+' '+rewardDiamonds(g.cost)} · {label('غرفة','Room')} {g.room}</p>)}
  </section>
}
