import {uiError,ui as appText,interfaceLocale} from './interface-language.mjs';
import {BalanceCard} from './ClipiSurfaces';
import React,{useState,useEffect,useRef} from 'react';
import {auth,piSdk} from './services';
import {rewardDiamonds,packs,packPrice,diamondsPerPi} from '../worker/diamond-wallet.mjs';
export async function walletRead(){
  const token=await auth().currentUser.getIdToken();
  const response=await fetch('/account-number',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({op:'wallet'})});
  if(!response.ok)throw Error(appText('تعذر تحديث المحفظة'));
  return response.json();
}
async function payment(action,data){
  const response=await fetch('/pi-gifts/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(!response.ok)throw Error(appText('تعذر تأكيد الدفعة. تحقق من المحفظة قبل إعادة المحاولة.'));
}
export function DiamondWallet({uid,onHelp,onEarnings}){
  const [data,setData]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [receipt,setReceipt]=useState('');
  const [linkMessage,setLinkMessage]=useState('');
  const [walletDraft,setWalletDraft]=useState(''),[walletChoices,setWalletChoices]=useState([]);
  const lock=useRef(false);
  const revision=useRef(0);
  useEffect(()=>{setWalletDraft('');setWalletChoices([]);setLinkMessage('');setData(null)},[uid]);
  useEffect(()=>{if(data?.walletDraftAddress)setWalletDraft(previous=>previous||data.walletDraftAddress)},[data?.walletDraftAddress]);
  const paymentPiUid=uid.startsWith('pi:')?uid:(window.Pi&&data?.linkedPiUid);
  async function refresh(){
    const ticket=++revision.current;
    const snapshot=await walletRead();
    if(ticket===revision.current&&auth().currentUser?.uid===uid)setData(snapshot);
  }
  useEffect(()=>{
    let active=true,timer;
    async function sync(){
      if(!active||document.hidden)return;
      try{await refresh()}catch(error){if(active)setMessage(uiError(error))}
    }
    void sync();
    timer=setInterval(sync,15000);
    document.addEventListener('visibilitychange',sync);
    return ()=>{active=false;revision.current++;clearInterval(timer);document.removeEventListener('visibilitychange',sync)};
  },[uid]);
  async function linkWallet(){
    if(lock.current)return;
    lock.current=true;setBusy(true);setLinkMessage('');
    try{
      const user=auth().currentUser;
      if(user?.uid!==uid)throw Error(appText('تغيّر الحساب المفتوح. أعد التحقق.'));
      const sdk=piSdk();
      const session=await sdk.authenticate(['username','wallet_address'],()=>{});
      if(auth().currentUser?.uid!==uid||'pi:'+session.user.uid!==paymentPiUid)
        throw Error(appText('حساب Pi المفتوح مختلف عن حساب التطبيق.'));
      const token=await user.getIdToken();
      const response=await fetch('/account-number',{method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({op:'linkHostWallet',accessToken:session.accessToken,walletAddress:walletDraft||data?.walletDraftAddress||undefined})});
      const result=await response.json();
      if(response.status===422&&typeof sdk.Wallet?.getUserMigratedWalletAddresses==='function'){
        try{
          const migrated=await sdk.Wallet.getUserMigratedWalletAddresses();
          if(auth().currentUser?.uid===uid){
            const choices=[...new Set((migrated?.wallets||[]).map(w=>w.publicKey).filter(a=>typeof a==='string'&&/^G[A-Z2-7]{55}$/.test(a)))];
            setWalletChoices(choices);
            if(choices.length===1)setWalletDraft(choices[0]);
          }
        }catch{}
      }
      if(!response.ok)throw Error(uiError(result.error,'تعذّر ربط المحفظة. حاول مجددًا.'));
      if(auth().currentUser?.uid===uid){
        revision.current++;
        setData(previous=>({...previous,walletAddress:result.walletAddress}));
        setLinkMessage(appText('تم ربط محفظتك.'));
      }
    }catch(error){setLinkMessage(uiError(error,'تعذّر ربط المحفظة. حاول مجددًا.'))}
    finally{lock.current=false;setBusy(false)}
  }
  async function restore(){
    if(lock.current)return;
    lock.current=true;setBusy(true);setMessage('');
    try{
      const ids=new Set((data?.pending||[]).map(p=>p.payment));
      if(receipt.trim())ids.add(receipt.trim());
      const session=await piSdk().authenticate(['username','payments'],p=>{if(p.metadata?.kind==='diamond_pack')ids.add(p.identifier)});
      if('pi:'+session.user.uid!==paymentPiUid)throw Error(appText('ادخل بحساب PI نفسه'));
      let restored=0;
      for(const paymentId of ids){
        try{await payment('restore',{paymentId,kind:'diamond_pack',accessToken:session.accessToken});restored++}catch{}
      }
      await refresh();
      setMessage(restored?appText('تم التحقق من الشراء وتحديث المحفظة'):appText('لم نجد دفعة باقة مؤكدة للاستعادة. راجع سجل الشحن أو أدخل معرّف دفعة PI.'));
    }catch(e){setMessage(uiError(e))}finally{lock.current=false;setBusy(false)}
  }
  async function buy(diamonds){
    if(lock.current)return;
    lock.current=true;setBusy(true);setMessage('');
    const finish=text=>{lock.current=false;setBusy(false);setMessage(text)};
    try{
      const sdk=piSdk(),pending=[];
      const session=await sdk.authenticate(['username','payments'],p=>{if(p.transaction?.txid)pending.push(p)});
      if('pi:'+session.user.uid!==paymentPiUid)throw Error(appText('ادخل بحساب PI نفسه'));
      const accessToken=session.accessToken;
      for(const old of pending){
        if(old.metadata?.kind==='native_diamonds'){
          const result=await fetch('/external-checkout/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:old.metadata.order,paymentId:old.identifier,txid:old.transaction.txid,token:accessToken})});
          if(!result.ok)throw Error(appText('راجع الدفعة السابقة في محفظة التطبيق الخارجي.'));
        }else await payment('complete',{kind:old.metadata?.kind,roomId:old.metadata?.roomId,paymentId:old.identifier,txid:old.transaction?.txid,accessToken});
      }
      if(pending.length){await refresh();finish(appText('تمت مراجعة الدفعة السابقة'));return}
      await sdk.createPayment({amount:packPrice(diamonds),memo:'Clipi · '+diamonds+' diamonds',metadata:{kind:'diamond_pack',uid,diamonds,rate:diamondsPerPi}},{
        onReadyForServerApproval:id=>payment('approve',{paymentId:id,kind:'diamond_pack',accessToken}).catch(e=>setMessage(uiError(e))),
        onReadyForServerCompletion:async(id,txid)=>{try{await payment('complete',{paymentId:id,txid,kind:'diamond_pack',accessToken});await refresh();finish(appText('تم شحن الماس'))}catch(e){finish(e.message)}},
        onCancel:()=>finish(appText('أُلغي الدفع')),onError:()=>finish(appText('تعذر إتمام الشراء'))
      });
    }catch(e){finish(e.message)}
  }
  return <section className="clipi-wallet-cards" dir="auto">
    <BalanceCard icon="💎" tone="sky" label={appText('الماس المشترى')} value={data?.diamonds??'…'} action={appText('شحن')} onPress={()=>document.getElementById('clipi-packs')?.scrollIntoView({block:'start'})}/>
    <BalanceCard icon="♡" tone="rose" label={appText('الماس المستهدف')} value={(data?.receivedDiamonds??'…')+' 💎'}/>
    <p>{appText('كل ماسة يرسلها لك مستخدم في هدية تُضاف إلى هذا الإجمالي.')}</p>
    <BalanceCard icon="✦" tone="sand" label={appText('مكافآت المضيف')} value={(data?data.rewardPi:'…')+' PI'}/>
    <button type="button" onClick={onEarnings}>{appText('محفظة المضيف')}</button>
    {paymentPiUid&&<>
      {data?.walletAddress&&<p>{appText('محفظة Pi المرتبطة')} · <bdi dir="ltr">{data.walletAddress.slice(0,6)}…{data.walletAddress.slice(-6)}</bdi></p>}
      <button type="button" disabled={busy||!data} onClick={linkWallet}>{appText(data?.walletAddress?'تحديث ربط المحفظة':'اربط محفظتي')}</button>
      <a href="pi://wallet.pinet.com" target="_top">{appText('فتح محفظة Pi')}</a>
      {!data?.walletAddress&&<div>
        {walletChoices.map(a=><button type="button" key={a} onClick={()=>setWalletDraft(a)}><bdi>{a.slice(0,8)}…{a.slice(-8)}</bdi></button>)}
        <input dir="ltr" autoComplete="off" spellCheck={false} maxLength={56} aria-label={appText('عنوان محفظة Pi')} placeholder="G…" value={walletDraft} onChange={e=>setWalletDraft(e.target.value.trim().toUpperCase())}/>
        <p>{appText('العنوان اليدوي غير موثق ولا يُستخدم للسحب حتى التحقق من Pi.')}</p>
        <button type="button" disabled={busy||!/^G[A-Z2-7]{55}$/.test(walletDraft)} onClick={async()=>{
          if(lock.current)return;
          lock.current=true;setBusy(true);
          try{
            const user=auth().currentUser;if(user?.uid!==uid)throw Error('Account changed');
            const token=await user.getIdToken();
            const response=await fetch('/account-number',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({op:'saveHostWalletDraft',walletAddress:walletDraft})});
            if(!response.ok)throw Error(appText('تعذر حفظ العنوان'));
            if(auth().currentUser?.uid===uid){setLinkMessage(appText('تم حفظ العنوان للمراجعة فقط'));await refresh()}
          }catch(e){setLinkMessage(uiError(e))}finally{lock.current=false;setBusy(false)}
        }}>{appText('حفظ العنوان للمراجعة')}</button>
      </div>}
      <p role="status">{data?.walletAddress?appText('تم ربط محفظتك.'):data?.walletDraftAddress?appText('تم حفظ العنوان للمراجعة فقط'):appText('المحفظة غير مرتبطة')}</p>
      {linkMessage&&<p role="status">{linkMessage}</p>}
    </>}
    <p>{appText('التقدّم نحو المكافأة التالية')} · <bdi>{data?.progress??'…'} / 10,000 💎</bdi></p>
    <p>{appText('كل 10,000 ماسة هدايا تُسجّل للمضيف مكافأة قدرها 5 PI داخل كليبي.')}</p>
    {data?.ownerBox&&<section aria-label={appText('صندوق ماس المالك')}>
      <h3>{appText('صندوق ماس المالك')}</h3>
      <BalanceCard icon="💎" tone="sky" label={appText('الماس المشحون للمستخدمين')} value={data.ownerBox.sold}/>
      <BalanceCard icon="◇" tone="sand" label={appText('الماس المستخدم في الهدايا')} value={data.ownerBox.gifted}/>
    </section>}
    {!!data?.earningsUnits&&<p>{appText('رصيد سابق محفوظ')} · {data.earningsUnits/20} PI</p>}
    <button onClick={()=>refresh().catch(e=>setMessage(uiError(e)))}>{appText('تحديث الرصيد')}</button>
    {paymentPiUid&&<div><input aria-label={appText('معرّف دفعة PI')} placeholder={appText('معرّف دفعة PI (اختياري)')} value={receipt} onChange={e=>setReceipt(e.target.value)}/><button disabled={busy} onClick={restore}>{appText('استعادة شراء سابق')}</button></div>}
    <h3>{appText('سجل شحن الماس')}</h3>
    {data?.purchases?.map(p=><p key={p.payment}>{p.diamonds} 💎 · {p.payment}{p.reversed?' · '+appText('ماس مسترد')+' '+p.reversed:''}</p>)}
    <button onClick={onHelp}>{appText('مشكلة في عملية شراء')}</button>
    <h3 id="clipi-packs">{appText('شراء الماس')}</h3>
    {paymentPiUid?packs.map(n=><button key={n} disabled={busy} style={{margin:4,padding:10}} onClick={()=>buy(n)}>{n.toLocaleString(interfaceLocale())} 💎 · {packPrice(n)} PI</button>):<p>{appText('ادخل بحساب PI لشراء الماس')}</p>}
    <p role="status">{appText(message)}</p><h3>{appText('آخر الهدايا المدفوعة')}</h3>
    {data?.history.map((g,i)=><p key={g.receipt?g.sender+g.receipt:i}>{uid===g.host?appText('واردة'):appText('مرسلة')} · {appText(g.gift)} · {g.cost} 💎 · {g.units?appText('رصيد سابق')+' '+g.units/20+' PI':appText('ماسات للمكافأة')+' '+rewardDiamonds(g.cost)} · {appText('غرفة')} {g.room} · {g.receipt}</p>)}
  </section>
}
