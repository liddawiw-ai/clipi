import {uiError,ui as appText,interfaceLocale} from './interface-language.mjs';
import {theme} from './ClipiTheme';
import React,{useState,useEffect,useRef} from 'react';
import {View,Text,TextInput,ScrollView,TouchableOpacity,StyleSheet,Alert,Linking} from 'react-native';
import countries from './payout-countries.json';
const normalize=v=>v.trim().toLowerCase().replace(/[أآإ]/g,'ا');
const digits=v=>v.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace('٫','.');
export default function PayoutPicker({data,call,reload,request,verifyEmail}){
 const [open,setOpen]=useState(false),[search,filter]=useState(''),[country,choose]=useState(null);
 const [options,setOptions]=useState(null),[method,setMethod]=useState(null),[amount,setAmount]=useState(''),[pin,setPin]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(''),[retry,refresh]=useState(0);
 const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 useEffect(()=>{
  let current=true;
  setOptions(null);setMethod(null);setError('');
  if(country&&data?.payoutsEnabled)call('getPayoutMethods')({country:country[0]}).then(r=>{if(current)setOptions(r.data.methods)}).catch(()=>{if(current)setError(appText('تعذّر تحميل طرق السحب المتاحة في هذه الدولة.'))});
  return()=>{current=false};
 },[country,retry,call,data?.payoutsEnabled]);
 const [preference,setPreference]=useState(null);
 useEffect(()=>{
   let mounted=true;
   request('hostEarnings').then(summary=>{
     if(!mounted)return;
     setPreference(summary);
     if(summary.method)choose(countries.find(([code])=>code===summary.method.country)||null);
   }).catch(e=>{if(mounted)setError(uiError(e))});
   return ()=>{mounted=false};
 },[request]);
 useEffect(()=>{
   if(options&&preference?.method?.country===country?.[0]){
     setMethod(options.find(m=>m.id===preference.method.product)||null);
   }
 },[options,preference,country]);
 async function saveMethod(){
   if(lock.current||!method||!country)return;
   lock.current=true;setBusy(true);
   try{
     const next=await request('saveReceivingMethod',{country:country[0],product:method.id,label:method.name});
     if(alive.current){setPreference(next);setResult('تم ربط وسيلة الاستلام')}
   }catch(e){if(alive.current)setError(uiError(e))}
   finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const locale=interfaceLocale();
 const regions=React.useMemo(()=>typeof Intl.DisplayNames==='function'?new Intl.DisplayNames([locale],{type:'region'}):null,[locale]);
 const countryName=([code,fallback])=>regions?.of(code)||appText(fallback);
 const points=Math.round(Number(digits(amount))*100);
 const can=Boolean(data?.payoutsEnabled&&data?.canRequest&&method&&/^\d+(\.\d{1,2})?$/.test(digits(amount))&&points>=data.minimumPoints&&points<=data.availablePoints&&method.bands.some(b=>points>=Math.round(b.min*100)&&points<=Math.round(b.max*100)));
 const funded=data||preference?.funded;
 const manual=!data?.payoutsEnabled;
 const review=preference?.review;
 const waiting=review&&(!review.reply||review.created*1000+15*86400000>Date.now());
 const reviewable=!!(preference?.contact||preference?.walletAddress||preference?.method)&&!waiting&&
   !funded?.activeWithdrawal&&funded?.withdrawal?.state!=='pending'&&!(preference?.funded?.nextEligibleAt>Date.now())&&
   /^\d+(\.\d{1,2})?$/.test(digits(amount))&&points>=2000&&points<=preference?.funded?.availableUsdMinor;
 async function reviewAction(send=false){
   if(lock.current)return;
   lock.current=true;setBusy(true);setError('');
   try{
     const next=await request(send?'requestWithdrawalReview':'hostEarnings',send?{points}:{});
     if(alive.current){setPreference(next);if(send)setAmount('')}
   }catch(e){if(alive.current)setError(uiError(e))}
   finally{lock.current=false;if(alive.current)setBusy(false)}
 }

 async function linkContact(){
   if(lock.current)return;
   lock.current=true;setBusy(true);
   try{const next=await request('linkReceivingContact');if(alive.current)setPreference(next)}
   catch(e){if(alive.current)setError(uiError(e))}
   finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 async function submit(receipt=false){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  try{
   const response=await call('requestCashPayout')({pin:digits(pin),country:country?.[0],product:method?.id,points:Number.isFinite(points)?points:0,receipt});
   if(!alive.current)return;
   const r=response.data;
   setResult(r.state==='issued'?'صدر رابط استلام المبلغ.':r.state==='canceled'?'أُلغي الطلب وأُعيد المبلغ إلى رصيدك.':'طلبك قيد المعالجة.');
   setPin('');await reload();
   if(alive.current&&r.url)await Linking.openURL(r.url);
  }catch(e){if(alive.current)setError(uiError(e))}
  finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const action=(text,onPress,disabled=false)=><TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={[S.button,disabled&&{opacity:.5}]}><Text style={S.cta}>{text}</Text></TouchableOpacity>;
 return <View style={S.panel}><Text style={S.heading}>{appText("سحب الأرباح")}</Text>
 {preference&&<Text style={S.label}>{appText('نقاط كشف الوكالة')} · {preference.statementPoints} · {appText('قيمة تقديرية')} ${(preference.statementPoints/100).toFixed(2)}</Text>}
 {preference?.method&&<Text style={S.label}>{appText('وسيلة الاستلام المرتبطة')} · {preference.method.label} · {preference.method.country}</Text>}
 {preference?.walletAddress&&<Text style={S.label}>{appText('محفظة Pi المرتبطة')} · {preference.walletAddress.slice(0,6)}…{preference.walletAddress.slice(-6)}</Text>}
 {preference?.contact&&<Text style={S.label}>{appText('جهة الاستلام الموثقة')} · {preference.contact}</Text>}
 {preference?.canVerifyEmail&&verifyEmail&&action(appText('تأكيد بريد الاستلام'),async()=>{
   if(lock.current)return;
   lock.current=true;setBusy(true);
   try{await verifyEmail();if(alive.current)setResult('راجع بريدك ثم حدّث حالة الطلب لربط جهة الاستلام')}
   catch(e){if(alive.current)setError(uiError(e))}
   finally{lock.current=false;if(alive.current)setBusy(false)}
 },busy)}
 {preference?.canLinkContact&&action(appText('ربط جهة الاستلام بحسابي'),linkContact,busy)}
 {manual&&funded&&<Text style={S.label}>{appText('النقاط المتاحة')} · {funded.availableUsdMinor.toLocaleString(locale)} {appText('نقطة')}</Text>}
 {funded?.withdrawal&&<Text style={S.label}>{appText('حالة طلب السحب')} · {appText(({pending:'قيد المعالجة',issued:'صدر رابط الاستلام',canceled:'ملغى'})[funded.withdrawal.state]||'قيد المعالجة')} · ${(funded.withdrawal.points/100).toFixed(2)}</Text>}
 <Text style={S.label}>{appText("الرصيد المتاح للسحب ")}{funded?'$'+(funded.availableUsdMinor/100).toFixed(2):appText('تعذّر تأكيد الرصيد')}</Text>
 {review&&<Text selectable style={S.label}>{appText('مراجعة سحب الأرباح')} · {review.detail} · {review.reply||appText('قيد المراجعة')}</Text>}
 {manual?<View style={{gap:8}}>
   <Text style={S.label}>{appText('يراجع المالك الطلب ويرسل الرد إلى صندوق الوارد. إرسال الطلب لا يحوّل المال.')}</Text>
   <TextInput accessibilityLabel={appText('مبلغ السحب بالدولار')} keyboardType="decimal-pad" placeholder={appText('المبلغ بالدولار')} value={amount} onChangeText={setAmount} style={S.input}/>
   {action(appText('إرسال طلب مراجعة السحب'),()=>reviewAction(true),busy||!reviewable)}
   {action(appText('تحديث حالة الطلب'),()=>reviewAction(),busy)}
 </View>:<>
 <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)} style={S.selection}><Text style={S.value}>{country?countryName(country):appText('اختر الدولة')}　{open?'▴':'▾'}</Text></TouchableOpacity>
 {open&&<View><TextInput accessibilityLabel={appText("البحث عن دولة")} placeholder={appText("ابحث باسم الدولة أو رمزها")} placeholderTextColor={theme.secondary} value={search} onChangeText={filter} style={S.input}/>
 <ScrollView nestedScrollEnabled style={{maxHeight:215}} keyboardShouldPersistTaps="handled">{countries.filter(([code,name])=>(normalize(name).includes(normalize(search))||normalize(countryName([code,name])).includes(normalize(search)))||code.includes(search.trim().toUpperCase())).map(c=><TouchableOpacity accessibilityRole="button" key={c[0]} onPress={()=>{choose(c);setOpen(false);filter('')}} style={S.row}><Text style={S.value}>{countryName(c)}</Text></TouchableOpacity>)}</ScrollView></View>}
 {country&&!options&&!error&&<Text style={S.label}>{appText("جارٍ جلب طرق السحب…")}</Text>}
 {options?.length===0&&<Text style={S.label}>{appText("لا تتوفر وسيلة سحب بالدولار لهذه الدولة حاليًا.")}</Text>}
 {['bank','wallet'].map(t=>options?.some(m=>m.type===t)&&<View key={t}><Text style={S.label}>{t==='bank'?appText('التحويل البنكي'):appText('المحافظ الإلكترونية')}</Text>
 {options.filter(m=>m.type===t).map(m=><TouchableOpacity key={m.id} accessibilityRole="radio" accessibilityState={{selected:method?.id===m.id}} onPress={()=>setMethod(m)} style={S.row}><Text style={S.value}>{method?.id===m.id?'●':'○'}　{m.name}</Text></TouchableOpacity>)}</View>)}
 {method&&action(appText('ربط وسيلة الاستلام'),saveMethod,busy||preference?.method?.product===method.id&&preference?.method?.country===country?.[0])}
 {method&&<TextInput accessibilityLabel={appText("مبلغ السحب بالدولار")} keyboardType="decimal-pad" placeholder={appText("المبلغ بالدولار")} value={amount} onChangeText={setAmount} placeholderTextColor={theme.secondary} style={S.input}/>}
 {(method||data?.activeWithdrawal||data?.lastWithdrawal)&&<TextInput keyboardType="number-pad" secureTextEntry maxLength={6} placeholder={appText("الرقم السري للمحفظة")} placeholderTextColor={theme.secondary} value={pin} onChangeText={setPin} style={S.input}/>}
 {method&&!data?.activeWithdrawal&&action(appText('طلب سحب'),()=>Alert.alert(appText('تأكيد السحب'),amount+' USD · '+countryName(country)+' · '+method.name,[{text:appText('إلغاء'),style:'cancel'},{text:appText('تأكيد'),onPress:()=>submit()}]),busy||!can||!/^\d{6}$/.test(digits(pin)))}
 {data?.activeWithdrawal&&action(appText('متابعة الطلب الحالي'),()=>submit(),busy||digits(pin).length!==6)}
 {data?.lastWithdrawal&&!data.activeWithdrawal&&action(appText('فتح آخر إيصال'),()=>submit(true),busy||digits(pin).length!==6)}
 </>}
 {!!result&&<Text style={S.label}>{appText(result)}</Text>}
 {!!error&&<Text accessibilityLiveRegion="polite" style={S.error}>{appText(error)}</Text>}
 {error&&country&&!options&&action(appText('إعادة تحميل الطرق'),()=>refresh(n=>n+1))}
 </View>;
}
const S=StyleSheet.create({panel:{padding:18,marginVertical:10,gap:9,backgroundColor:theme.paper,borderRadius:14},heading:{fontSize:21,fontWeight:'900',color:theme.ink,textAlign:'right'},label:{color:theme.secondary,textAlign:'right',lineHeight:22},selection:{padding:14,backgroundColor:'transparent',borderRadius:12,borderWidth:1,borderColor:theme.line},value:{fontSize:16,color:theme.ink,textAlign:'right'},row:{padding:11,borderBottomWidth:1,borderColor:theme.line},input:{padding:11,borderRadius:10,backgroundColor:theme.paper,color:theme.ink,textAlign:'right'},button:{alignSelf:'center',backgroundColor:theme.mint,paddingHorizontal:16,paddingVertical:9,borderRadius:12,alignItems:'center'},cta:{color:theme.ink,fontWeight:'800'},error:{color:theme.danger,textAlign:'right'}});
