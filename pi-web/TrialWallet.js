import {uiError,ui as appText,interfaceLocale} from './interface-language.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {Pressable,Text,View} from 'react-native';

function Choice({children,onPress,disabled}){
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={{alignSelf:'flex-end',padding:10,backgroundColor:disabled?'#515865':'#264653',borderRadius:8,marginVertical:3}}>
    <Text style={{color:'white',textAlign:'right'}}>{children}</Text></Pressable>;
}
export default function TrialWallet({request,nonce,gifts,Game}){
  const [wallet,setWallet]=useState(null),[issue,setIssue]=useState(''),[receipt,setReceipt]=useState('');
  const [bucket,setBucket]=useState('sandbox'),[playing,setPlaying]=useState(false),[showGifts,setShowGifts]=useState(false);
  const [usd,setUsd]=useState(5),[method,setMethod]=useState('card');
  const alive=useRef(true),busy=useRef(false),pending=useRef(null);
  async function refresh(){
    try{const data=await request('/account-number',{op:'trialRead'});
      if(alive.current){setWallet(data);setIssue('');return data;}}
    catch(e){if(alive.current)setIssue(uiError(e));}
  }
  useEffect(()=>{alive.current=true;void refresh().then(w=>{if(alive.current&&w?.owner!=null)setBucket('owner');});return ()=>{alive.current=false;};},[]);
  async function apply(op,params,message){
    if(busy.current)return false;
    busy.current=true;
    const identity=JSON.stringify([op,bucket,params]);
    if(pending.current?.identity!==identity)pending.current={identity,key:nonce()};
    try{
      const data=await request('/account-number',{op,...params,bucket,nonce:pending.current.key});
      pending.current=null;
      if(alive.current){setWallet(data);setIssue('');setReceipt(message);}
      return true;
    }catch(e){if(alive.current)setIssue(uiError(e));return false;}finally{busy.current=false;}
  }
  const info=t=><Text style={{textAlign:'right',color:'#E0E6ED',fontSize:15}}>{appText(t)}</Text>;
  return <View style={{marginTop:12,gap:6,borderRadius:14,backgroundColor:'#17233B',padding:16}}>
    {info('المحفظة التجريبية')}
    {issue&&info(issue)}{!wallet&&<Choice onPress={refresh}>{appText("تحديث الرصيد التجريبي")}</Choice>}
    {wallet&&<>
      {wallet.owner!=null&&<Choice onPress={()=>setBucket('owner')}>{(bucket==='owner'?'✓ ':'')+appText('منحة المالك · ')+wallet.owner.toLocaleString(interfaceLocale())+' 💎'}</Choice>}
      <Choice onPress={()=>setBucket('sandbox')}>{(bucket==='sandbox'?'✓ ':'')+appText('رصيد الشحن التجريبي · ')+wallet.sandbox.toLocaleString(interfaceLocale())+' 💎'}</Choice>
      <Choice disabled>{appText("الدفع الحقيقي بالدولار · غير مفعّل هنا")}</Choice>
      {info('اختر باقة وطريقة شحن تجريبية')}
      <View style={{flexDirection:'row-reverse',gap:6}}>{[1,5,10].map(d=><Choice key={d} onPress={()=>setUsd(d)}>{(usd===d?'✓ ':'')+'$'+d}</Choice>)}</View>
      <View style={{flexDirection:'row-reverse',gap:6}}>{[['card','بطاقة تجريبية'],['wallet','محفظة تجريبية']].map(([k,title])=><Choice key={k} onPress={()=>setMethod(k)}>{(method===k?'✓ ':'')+appText(title)}</Choice>)}</View>
      <Choice onPress={()=>apply('trialTopup',{usd,method},appText('أُضيفت ') +(usd*1000).toLocaleString(interfaceLocale())+appText(' ماسة تجريبية'))}>{appText('محاكاة شحن ')+usd+appText(' دولار · ')+(usd*1000).toLocaleString(interfaceLocale())+' 💎'}</Choice>
      <Choice onPress={()=>setShowGifts(v=>!v)}>{appText("تجربة هدية")}</Choice>
      {showGifts&&gifts.map(g=><Choice key={g[1]} onPress={()=>apply('trialGift',{gift:g[1]},appText('ظهرت ')+g[0]+' '+appText(g[1])+appText(' في المعاينة'))}>{g[0]+' '+appText(g[1])+' · '+g[2]+' 💎'}</Choice>)}
      <Choice onPress={()=>setPlaying(true)}>{appText("العب Greedy Star بالرصيد التجريبي")}</Choice>
      {receipt&&info(receipt)}
      {playing&&<Game visible diamonds={wallet[bucket]||0} roomName={appText('اللعب التجريبي')} onClose={()=>{setPlaying(false);void refresh();}} onRestoreRoom={()=>setPlaying(false)} onShop={()=>setPlaying(false)}
        onBet={(amount,pick,round)=>apply('trialPlay',{amount,pick,round},'تم تسجيل اختيارك للجولة')} onCredit={()=>void refresh()}/>}
    </>}
  </View>;
}
