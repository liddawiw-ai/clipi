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
    catch(e){if(alive.current)setIssue(e.message);}
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
    }catch(e){if(alive.current)setIssue(e.message);return false;}finally{busy.current=false;}
  }
  const info=t=><Text style={{textAlign:'right',color:'#E0E6ED',fontSize:15}}>{t}</Text>;
  return <View style={{marginTop:12,gap:6,borderRadius:14,backgroundColor:'#17233B',padding:16}}>
    {info('المحفظة التجريبية')}
    {issue&&info(issue)}{!wallet&&<Choice onPress={refresh}>تحديث الرصيد التجريبي</Choice>}
    {wallet&&<>
      {wallet.owner!=null&&<Choice onPress={()=>setBucket('owner')}>{(bucket==='owner'?'✓ ':'')+'منحة المالك · '+wallet.owner.toLocaleString()+' 💎'}</Choice>}
      <Choice onPress={()=>setBucket('sandbox')}>{(bucket==='sandbox'?'✓ ':'')+'رصيد الشحن التجريبي · '+wallet.sandbox.toLocaleString()+' 💎'}</Choice>
      <Choice disabled>الدفع الحقيقي بالدولار · غير مفعّل هنا</Choice>
      {info('اختر باقة وطريقة شحن تجريبية')}
      <View style={{flexDirection:'row-reverse',gap:6}}>{[1,5,10].map(d=><Choice key={d} onPress={()=>setUsd(d)}>{(usd===d?'✓ ':'')+'$'+d}</Choice>)}</View>
      <View style={{flexDirection:'row-reverse',gap:6}}>{[['card','بطاقة تجريبية'],['wallet','محفظة تجريبية']].map(([k,title])=><Choice key={k} onPress={()=>setMethod(k)}>{(method===k?'✓ ':'')+title}</Choice>)}</View>
      <Choice onPress={()=>apply('trialTopup',{usd,method},'أُضيفت '+(usd*1000).toLocaleString()+' ماسة تجريبية')}>{'محاكاة شحن '+usd+' دولار · '+(usd*1000).toLocaleString()+' 💎'}</Choice>
      <Choice onPress={()=>setShowGifts(v=>!v)}>تجربة هدية</Choice>
      {showGifts&&gifts.map(g=><Choice key={g[1]} onPress={()=>apply('trialGift',{gift:g[1]},'ظهرت '+g[0]+' '+g[1]+' في المعاينة')}>{g[0]+' '+g[1]+' · '+g[2]+' 💎'}</Choice>)}
      <Choice onPress={()=>setPlaying(true)}>العب Greedy Star بالرصيد التجريبي</Choice>
      {receipt&&info(receipt)}
      {playing&&<Game visible diamonds={wallet[bucket]||0} roomName="اللعب التجريبي" onClose={()=>{setPlaying(false);void refresh();}} onRestoreRoom={()=>setPlaying(false)} onShop={()=>setPlaying(false)}
        onBet={(amount,pick,round)=>apply('trialPlay',{amount,pick,round},'تم تسجيل اختيارك للجولة')} onCredit={()=>void refresh()}/>}
    </>}
  </View>;
}
