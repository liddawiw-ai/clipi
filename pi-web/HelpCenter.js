import {uiError,ui as appText} from './interface-language.mjs';
import {theme} from './ClipiTheme';
import React,{useEffect,useRef,useState} from 'react';
import {ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View} from 'react-native';

export const caseLabels={video:'بلاغ عن مقطع أو تعليق',room:'بلاغ عن البث',participant:'بلاغ عن مشارك',message:'بلاغ عن رسالة',purchase:'مشكلة في عملية شراء',deletion:'طلب حذف الحساب'};
export function HelpCenter({request,newId,lang='ar',initialKind=null,initialSubject='',onBack}){
 const t=appText;
 const [kind,choose]=useState(initialKind),[subject,setSubject]=useState(initialSubject),[detail,setDetail]=useState('');
 const [data,setData]=useState(null),[queue,setQueue]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const pending=useRef(false),alive=useRef(true),attempt=useRef(null),revision=useRef(0);
 async function refresh(staff=false){
   const ticket=++revision.current;
   try{
     const result=await request(staff?'caseQueue':'caseList');
     if(!alive.current||ticket!==revision.current)return;
     if(staff)setQueue(result.cases);else{setData(result);setQueue(null)}
   }catch(error){if(alive.current)setMessage(uiError(error))}
 }
 useEffect(()=>{alive.current=true;void refresh();return()=>{alive.current=false}},[]);
 async function submit(){
   if(pending.current||!kind)return;
   pending.current=true;setBusy(true);setMessage('');
   const key=JSON.stringify([kind,subject,detail]);
   if(attempt.current?.key!==key)attempt.current={key,id:newId()};
   try{
     const r=await request('caseCreate',{kind,id:attempt.current.id,subject:subject.trim(),detail:detail.trim()});
     if(!alive.current)return;
     choose(null);setSubject('');setDetail('');attempt.current=null;
     setMessage(t('رقم الطلب')+' · '+r.id);await refresh();
   }catch(error){if(alive.current)setMessage(uiError(error))}
   finally{pending.current=false;if(alive.current)setBusy(false)}
 }
 function button(label,press,disabled=false){
   return <TouchableOpacity accessibilityRole="button" disabled={disabled} style={[s.button,disabled&&{opacity:.5}]} onPress={press}><Text style={s.action}>{t(label)}</Text></TouchableOpacity>;
 }
 return <ScrollView style={s.page} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
   <View style={s.row}><Text accessibilityRole="header" style={s.title}>{t('دعم كليبي')}</Text>{button(appText('رجوع'),onBack)}</View>
   <Text selectable style={s.text}>Liddawiw@gmail.com</Text>
   {kind?<View style={s.card}><Text style={s.title}>{t(caseLabels[kind])}</Text>
     {kind==='deletion'?<Text style={s.text}>{t('سيُرسل طلب حذف حسابك وبياناته المرتبطة إلى فريق كليبي للمراجعة.')}</Text>:<>
       <Text style={s.text}>{t('لا ترسل كلمة مرور أو معلومات البطاقة.')}</Text>
       <TextInput style={s.input} accessibilityLabel={t('رقم إيصال العملية')} placeholder={t('رقم إيصال العملية')} value={subject} onChangeText={setSubject} maxLength={128}/>
       <TextInput style={s.input} accessibilityLabel={t('تفاصيل المشكلة')} placeholder={t('تفاصيل المشكلة')} multiline maxLength={400} value={detail} onChangeText={setDetail}/>
     </>}
     {button(kind==='deletion'?appText('تأكيد طلب الحذف'):appText('إرسال الطلب'),submit,busy||(kind!=='deletion'&&!detail.trim()))}
     {button(appText('إلغاء'),()=>choose(null),busy)}
   </View>:<View style={s.row}>{button(appText('مشكلة في عملية شراء'),()=>choose('purchase'))}{button(appText('طلب حذف الحساب'),()=>choose('deletion'))}</View>}
   {!!message&&<Text selectable accessibilityLiveRegion="polite" style={s.text}>{appText(message)}</Text>}
   <View style={s.row}><Text style={s.title}>{t(queue?'طلبات بانتظار المراجعة':'طلباتي')}</Text>
     {button(appText('تحديث'),()=>refresh(queue!==null))}
     {data?.staff&&button(queue?appText('طلباتي'):appText('طلبات بانتظار المراجعة'),()=>refresh(queue===null))}
   </View>
   {(queue||data?.cases)?.map(item=><View key={item.id} style={s.card}>
     <Text style={s.text}>{t(caseLabels[item.kind])} · {t(item.state==='open'?'جديد':item.state==='reviewed'?'تمت المراجعة':'تمت المعالجة')}</Text>
     <Text selectable style={s.text}>{t('رقم الطلب')} · {item.id}</Text>
     {queue&&<><Text selectable style={s.text}>{t('معرّف الحساب')} · {item.uid}</Text>
       {!!item.subject&&<Text selectable style={s.text}>{item.subject}</Text>}{!!item.detail&&<Text selectable style={s.text}>{item.detail}</Text>}
       {item.kind!=='deletion'&&button(appText('تأكيد المراجعة'),async()=>{try{await request('caseReviewed',{id:item.id});await refresh(true)}catch(e){setMessage(uiError(e))}})}
     </>}
   </View>)}
   {(queue||data?.cases)?.length===0&&<Text style={s.text}>{t('لا توجد طلبات')}</Text>}
 </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:theme.canvas},body:{padding:18,paddingTop:46,gap:12},row:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center',justifyContent:'space-between'},title:{color:theme.ink,fontWeight:'800',fontSize:19},text:{color:theme.ink,fontSize:15,lineHeight:22},card:{backgroundColor:theme.paper,borderRadius:18,padding:12,gap:8,borderWidth:1,borderColor:theme.line},input:{backgroundColor:theme.paper,color:theme.ink,borderRadius:8,padding:10,borderColor:theme.line,borderWidth:1},button:{alignSelf:'flex-start',backgroundColor:'transparent',borderRadius:0,paddingHorizontal:13,paddingVertical:9,borderBottomWidth:1,borderBottomColor:theme.line},action:{color:theme.accent,fontWeight:'700'}});
