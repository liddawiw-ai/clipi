import {uiError,ui as appText,interfaceLocale} from './interface-language.mjs';
import {theme} from './ClipiTheme';
import React,{useState,useEffect,useRef} from 'react';
import {View,Text,TextInput,TouchableOpacity,StyleSheet} from 'react-native';
import {rewardDetail} from './reward-detail.mjs';

export default function PayoutPicker({request,data,verifyEmail,revision}){
 const [amount,setAmount]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState('');
 const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const [preference,setPreference]=useState(null);
 useEffect(()=>{
   let current=true;
   request('hostEarnings').then(summary=>{if(current)setPreference(summary)})
     .catch(e=>{if(current)setError(uiError(e))});
   return ()=>{current=false};
 },[request,revision]);
 const locale=interfaceLocale();
 const normalized=amount.trim().replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
 const points=/^\d+$/.test(normalized)?Number(normalized):NaN;
 const funded=preference?.funded;
 const available=funded?.availablePoints??data?.availablePoints;
 const review=preference?.review;
 const waiting=review&&(!review.reply||review.created*1000+15*86400000>Date.now());
 const reviewable=!!(preference?.contact||preference?.walletAddress||preference?.method)&&!waiting&&
   !data?.activeWithdrawal&&funded?.withdrawal?.state!=='pending'&&!(preference?.funded?.nextEligibleAt>Date.now())&&
   Number.isSafeInteger(points)&&points>=2000&&points<=funded?.availablePoints;
 async function reviewAction(send=false){
   if(lock.current)return;
   lock.current=true;setBusy(true);setError('');
   try{
     const next=await request(send?'requestRewardReview':'hostEarnings',send?{points}:{});
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
 const action=(text,onPress,disabled=false)=><TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={[S.button,disabled&&{opacity:.5}]}><Text style={S.cta}>{text}</Text></TouchableOpacity>;
 return <View style={S.panel}><Text style={S.heading}>{appText("مكافآت المضيف")}</Text>
 {preference&&<Text style={S.label}>{appText('نقاط كشف الوكالة')} · {preference.statementPoints}</Text>}
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
 <Text style={S.label}>{appText('النقاط المتاحة')} · {available==null?appText('تعذّر تأكيد الرصيد'):Number(available).toLocaleString(locale)+' '+appText('نقطة')}</Text>
 {funded?.withdrawal&&<Text style={S.label}>{appText('حالة طلب المكافأة')} · {appText(({pending:'قيد المعالجة',issued:'صدر رابط الاستلام',canceled:'ملغى'})[funded.withdrawal.state]||'قيد المعالجة')} · {funded.withdrawal.points} {appText('نقطة')}</Text>}
 {review&&<Text selectable style={S.label}>{appText('طلب مكافأة')} · {rewardDetail(review.detail,appText('نقطة'),locale)} · {review.reply||appText('قيد المراجعة')}</Text>}
 <Text style={S.label}>{appText('يراجع المالك طلب المكافأة ويرسل الرد إلى صندوق الوارد.')}</Text>
 <TextInput accessibilityLabel={appText('عدد نقاط المكافأة')} keyboardType="number-pad" placeholder={appText('عدد نقاط المكافأة')} value={amount} onChangeText={setAmount} style={S.input}/>
 {action(appText('إرسال طلب مكافأة'),()=>reviewAction(true),busy||!reviewable)}
 {action(appText('تحديث حالة الطلب'),()=>reviewAction(),busy)}
 {!!result&&<Text style={S.label}>{appText(result)}</Text>}
 {!!error&&<Text accessibilityLiveRegion="polite" style={S.error}>{appText(error)}</Text>}
 </View>;
}
const S=StyleSheet.create({panel:{padding:18,marginVertical:10,gap:9,backgroundColor:theme.paper,borderRadius:14},heading:{fontSize:21,fontWeight:'900',color:theme.ink,textAlign:'right'},label:{color:theme.secondary,textAlign:'right',lineHeight:22},input:{padding:11,borderRadius:10,backgroundColor:theme.paper,color:theme.ink,textAlign:'right'},button:{alignSelf:'center',backgroundColor:theme.mint,paddingHorizontal:16,paddingVertical:9,borderRadius:12,alignItems:'center'},cta:{color:theme.ink,fontWeight:'800'},error:{color:theme.danger,textAlign:'right'}});
