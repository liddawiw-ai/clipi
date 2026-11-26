import {ui as appText,uiError,interfaceLocale} from './interface-language.mjs';
import {theme} from './ClipiTheme';
import React,{useEffect,useState,useRef} from 'react';
import {View,Text,TouchableOpacity,StyleSheet,Linking,Share,Platform} from 'react-native';
import * as Crypto from 'expo-crypto';
import {storeBilling} from './storeBilling';
const units=[1,2,5,10,20,50,100];
const fmt=n=>n.toLocaleString(interfaceLocale());
export default function DiamondShop({request,externalAllowed,endpoint,uid,isCurrentUser}){
 const [method,methodTo]=useState(externalAllowed?'pi':'card'),[count,select]=useState(1),[offer,setOffer]=useState(null);
 const [storeMessage,setStoreMessage]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[fallback,setFallback]=useState('');
 const lock=useRef(false),attempt=useRef(null);
 const [cardAvailable,setCardAvailable]=useState(false);
 useEffect(()=>{
  if(!externalAllowed)return;
  const controller=new AbortController();
  fetch(endpoint+'/external-checkout/availability',{signal:controller.signal}).then(r=>r.json()).then(data=>{
   if(!controller.signal.aborted)setCardAvailable(data.usd===true);
  }).catch(()=>{});
  return ()=>controller.abort();
 },[endpoint,externalAllowed]);
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
    if(Date.now()>=offer.expires){reset();throw Error(appText('انتهى السعر. اطلب سعرًا محدّثًا.'))}
    const url=offer.url;
    setFallback(url);
    try{await Linking.openURL(url.replace(/^https:/,'pi:'))}
    catch{throw Error(appText('افتح رابط هذا الطلب في Pi Browser لإكمال الشراء.'))}
    setOffer(null);attempt.current=null;
    setStoreMessage('بعد الدفع ارجع إلى محفظة كليبي للتحقق من الشحن.');

    return;
   }
   if(!attempt.current)attempt.current=Crypto.randomUUID();
   const checkout=await request('/account-number',{op:'externalCreate',id:attempt.current,method,dollars:count});
   if(pi){
    if(checkout.url!==endpoint+'/external-checkout#'+attempt.current)throw Error(appText('تعذّر التحقق من رابط PI'));
    setFallback('');setStoreMessage('');setOffer(checkout);
   }else{
    if(!checkout.url?.startsWith('https://checkout.stripe.com/'))throw Error(appText('رابط الدفع غير متاح'));
    await Linking.openURL(checkout.url);attempt.current=null;
   }
  }catch(e){if(e.status===409)reset();setError(e.userCancelled?appText('أُلغي الدفع.'):uiError(e))}
  finally{lock.current=false;setBusy(false)}
 }
 const selected=pi?1200:1000;
 return <View style={s.body}>
  <View style={s.segment}>{(externalAllowed?[['pi','عملة PI'],['card','USD']]:[['card',storeName]]).map(([key,label])=><TouchableOpacity key={key} disabled={busy} accessibilityRole="tab" accessibilityState={{selected:method===key}} onPress={()=>{methodTo(key);reset()}} style={[s.tab,method===key&&s.on]}><Text style={[s.tabText,method===key&&s.dark]}>{appText(label)}</Text></TouchableOpacity>)}</View>
  <View style={s.summary}><Text style={s.eyebrow}>{pi?appText('الدفع من PI Browser'):nativeStore?storeName:'USD'}</Text><Text style={s.amount}>💎 {fmt(count*selected)}</Text><Text style={s.desc}>{pi?appText('بقيمة ')+count+appText(' USD حسب سعر PI عند الطلب'):nativeStore?appText('السعر حسب بلد حسابك في ')+storeName:count+appText(' USD عبر Visa أو Google Pay عند توفره')}</Text></View>
  <Text style={s.title}>{appText("اختر الباقة")}</Text>
  <View style={s.grid}>{units.map(n=><TouchableOpacity key={n} disabled={busy} onPress={()=>{select(n);reset()}} accessibilityRole="button" accessibilityState={{selected:count===n}} style={[s.pack,count===n&&s.chosen]}><Text style={s.number}>{fmt(n*selected)} 💎</Text>{!nativeStore&&<Text style={s.price}>{n} USD</Text>}</TouchableOpacity>)}</View>
  {offer&&pi&&<Text accessibilityLiveRegion="polite" style={s.desc}>{offer.amount}{appText(" PI · السعر صالح حتى ")}{new Date(offer.expires).toLocaleTimeString(interfaceLocale())}</Text>}
  {nativeStore&&offer&&<Text style={s.desc}>{storeName} · {offer.localPrice}</Text>}
  {!!storeMessage&&<Text style={s.desc}>{appText(storeMessage)}</Text>}
  <TouchableOpacity accessibilityRole="button" disabled={busy||(pi&&!externalAllowed)||(!pi&&externalAllowed&&!cardAvailable)} onPress={next} style={[s.cta,(busy||(pi&&!externalAllowed))&&{opacity:.55}]}><Text style={s.dark}>{busy?appText('جارٍ الاتصال…'):pi?(offer?appText('متابعة في PI Browser'):appText('عرض سعر PI الآن')):nativeStore?(offer?appText('الشراء عبر ')+storeName:appText('عرض سعر ')+storeName):appText('متابعة إلى الدفع')}</Text></TouchableOpacity>
  {pi&&!externalAllowed&&<Text style={s.desc}>{appText("الدفع بعملة PI متاح في نسخة أندرويد المباشرة.")}</Text>}
  {!pi&&externalAllowed&&!cardAvailable&&<Text style={s.desc}>{appText('الدفع بالدولار غير مفعّل حاليًا')}</Text>}
  {!!error&&<Text accessibilityLiveRegion="polite" style={s.error}>{appText(error)}</Text>}
  {fallback&&<TouchableOpacity onPress={()=>Share.share({message:fallback})}><Text style={s.price}>{appText("نسخ أو مشاركة رابط الطلب لفتحه في Pi Browser")}</Text></TouchableOpacity>}
 </View>;
}
const s=StyleSheet.create({body:{gap:14},segment:{flexDirection:'row-reverse',borderRadius:15,backgroundColor:theme.paper,padding:4},tab:{minHeight:45,justifyContent:'center',flex:1,padding:12,alignItems:'center',borderRadius:11,backgroundColor:'transparent'},on:{backgroundColor:theme.paper},tabText:{fontWeight:'800',color:theme.ink},dark:{fontWeight:'900',color:theme.ink,fontSize:16},summary:{borderWidth:1,borderColor:theme.line,backgroundColor:theme.sea,padding:20,borderRadius:18,gap:7},eyebrow:{color:theme.ink,textAlign:'right',fontWeight:'700'},amount:{color:theme.ink,fontSize:35,fontWeight:'900',textAlign:'right'},desc:{writingDirection:'rtl',color:theme.secondary,fontSize:15,textAlign:'right',lineHeight:23},title:{color:theme.ink,fontSize:19,fontWeight:'800',textAlign:'right'},grid:{flexDirection:'row-reverse',flexWrap:'wrap',gap:9},pack:{width:'31%',minHeight:68,justifyContent:'center',paddingVertical:10,alignItems:'center',gap:3,borderRadius:13,borderWidth:1,borderColor:theme.line,backgroundColor:theme.paper},chosen:{borderColor:theme.accent,backgroundColor:theme.mint},number:{fontWeight:'800',fontSize:15,color:theme.ink},price:{fontSize:13,color:theme.secondary},cta:{minHeight:42,alignSelf:'center',maxWidth:'100%',justifyContent:'center',alignItems:'center',borderRadius:13,backgroundColor:theme.mint,paddingVertical:10,paddingHorizontal:16},error:{color:theme.danger,textAlign:'right'}});
