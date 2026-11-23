import {theme} from './ClipiTheme';
import React,{useState,useRef} from 'react';
import {View,Text,TouchableOpacity,StyleSheet,Linking,Share,Platform} from 'react-native';
import * as Crypto from 'expo-crypto';
import {storeBilling} from './storeBilling';
const units=[1,2,5,10,20,50,100];
const fmt=n=>n.toLocaleString('en-US');
export default function DiamondShop({request,externalAllowed,endpoint,uid,isCurrentUser}){
 const [method,methodTo]=useState('card'),[count,select]=useState(1),[offer,setOffer]=useState(null);
 const [storeMessage,setStoreMessage]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[fallback,setFallback]=useState('');
 const lock=useRef(false),attempt=useRef(null);
 const pi=method==='pi',nativeStore=!externalAllowed&&!pi;
 const storeName=Platform.OS==='ios'?'App Store':'Google Play';
 function reset(){setStoreMessage('');setOffer(null);setError('');setFallback('');attempt.current=null}
 async function next(){
  if(lock.current||(pi&&!externalAllowed))return;
  lock.current=true;setBusy(true);setError('');
  try{
   if(nativeStore){
    const price=await storeBilling({request,uid,isCurrentUser,productId:'clipi_diamonds_'+count*1000,buy:!!offer});
    if(offer){setOffer(null);setStoreMessage('تم إرسال الشراء للتحقق. يظهر الماس في المحفظة بعد تأكيد المتجر.')}
    else setOffer({localPrice:price});
    return;
   }
   if(pi&&offer){
    if(Date.now()>=offer.expires){reset();throw Error('انتهى السعر. اطلب سعرًا محدّثًا.')}
    try{await Linking.openURL(offer.url.replace(/^https:/,'pi:'))}catch{setFallback(offer.url);throw Error('افتح رابط الدفع من PI Browser.')}
    return;
   }
   if(!attempt.current)attempt.current=Crypto.randomUUID();
   const checkout=await request('/account-number',{op:'externalCreate',id:attempt.current,method,dollars:count});
   if(pi){
    if(checkout.url!==endpoint+'/external-checkout#'+attempt.current)throw Error('تعذّر التحقق من رابط PI');
    setOffer(checkout);
   }else{
    if(!checkout.url?.startsWith('https://checkout.stripe.com/'))throw Error('رابط الدفع غير متاح');
    await Linking.openURL(checkout.url);attempt.current=null;
   }
  }catch(e){if(e.status===409)reset();setError(e.userCancelled?'أُلغي الدفع.':e.message)}
  finally{lock.current=false;setBusy(false)}
 }
 const selected=pi?1200:1000;
 return <View style={s.body}>
  <View style={s.segment}>{(externalAllowed?[['card','الدولار'],['pi','عملة PI']]:[['card',storeName]]).map(([key,label])=><TouchableOpacity key={key} disabled={busy} accessibilityRole="tab" accessibilityState={{selected:method===key}} onPress={()=>{methodTo(key);reset()}} style={[s.tab,method===key&&s.on]}><Text style={[s.tabText,method===key&&s.dark]}>{label}</Text></TouchableOpacity>)}</View>
  <View style={s.summary}><Text style={s.eyebrow}>{pi?'الدفع من PI Browser':'الدفع بالدولار'}</Text><Text style={s.amount}>💎 {fmt(count*selected)}</Text><Text style={s.desc}>{pi?'بقيمة '+count+' USD حسب سعر PI عند الطلب':nativeStore?'السعر الأساسي '+count+' USD · '+storeName:count+' USD عبر Visa أو Google Pay عند توفره'}</Text></View>
  <Text style={s.title}>اختر الباقة</Text>
  <View style={s.grid}>{units.map(n=><TouchableOpacity key={n} disabled={busy} onPress={()=>{select(n);reset()}} accessibilityRole="button" accessibilityState={{selected:count===n}} style={[s.pack,count===n&&s.chosen]}><Text style={s.number}>{fmt(n*selected)} 💎</Text><Text style={s.price}>{n} USD</Text></TouchableOpacity>)}</View>
  {offer&&pi&&<Text accessibilityLiveRegion="polite" style={s.desc}>{offer.amount} PI · السعر صالح حتى {new Date(offer.expires).toLocaleTimeString('ar')}</Text>}
  {nativeStore&&offer&&<Text style={s.desc}>{storeName} · {offer.localPrice}</Text>}
  {!!storeMessage&&<Text style={s.desc}>{storeMessage}</Text>}
  <TouchableOpacity accessibilityRole="button" disabled={busy||(pi&&!externalAllowed)} onPress={next} style={[s.cta,(busy||(pi&&!externalAllowed))&&{opacity:.55}]}><Text style={s.dark}>{busy?'جارٍ الاتصال…':pi?(offer?'متابعة في PI Browser':'عرض سعر PI الآن'):nativeStore?(offer?'الشراء عبر '+storeName:'عرض سعر '+storeName):'متابعة إلى الدفع'}</Text></TouchableOpacity>
  {pi&&!externalAllowed&&<Text style={s.desc}>الدفع بعملة PI متاح في نسخة أندرويد المباشرة.</Text>}
  {!!error&&<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
  {fallback&&<TouchableOpacity onPress={()=>Share.share({message:fallback})}><Text style={s.price}>مشاركة رابط الدفع أو نسخه</Text></TouchableOpacity>}
 </View>;
}
const s=StyleSheet.create({body:{gap:14},segment:{flexDirection:'row-reverse',borderRadius:15,backgroundColor:theme.paper,padding:4},tab:{minHeight:45,justifyContent:'center',flex:1,padding:12,alignItems:'center',borderRadius:11,backgroundColor:'transparent'},on:{backgroundColor:theme.paper},tabText:{fontWeight:'800',color:theme.ink},dark:{fontWeight:'900',color:theme.ink,fontSize:16},summary:{borderWidth:1,borderColor:theme.line,backgroundColor:theme.sea,padding:20,borderRadius:18,gap:7},eyebrow:{color:theme.ink,textAlign:'right',fontWeight:'700'},amount:{color:theme.ink,fontSize:35,fontWeight:'900',textAlign:'right'},desc:{writingDirection:'rtl',color:theme.secondary,fontSize:15,textAlign:'right',lineHeight:23},title:{color:theme.ink,fontSize:19,fontWeight:'800',textAlign:'right'},grid:{flexDirection:'row-reverse',flexWrap:'wrap',gap:9},pack:{width:'31%',minHeight:68,justifyContent:'center',paddingVertical:10,alignItems:'center',gap:3,borderRadius:13,borderWidth:1,borderColor:theme.line,backgroundColor:theme.paper},chosen:{borderColor:theme.accent,backgroundColor:theme.mint},number:{fontWeight:'800',fontSize:15,color:theme.ink},price:{fontSize:13,color:theme.secondary},cta:{minHeight:42,alignSelf:'center',maxWidth:'100%',justifyContent:'center',alignItems:'center',borderRadius:13,backgroundColor:theme.mint,paddingVertical:10,paddingHorizontal:16},error:{color:theme.danger,textAlign:'right'}});
