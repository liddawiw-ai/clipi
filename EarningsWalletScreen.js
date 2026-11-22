import React,{useEffect,useState,useRef} from 'react';
import {View,Text,TextInput,TouchableOpacity,ScrollView,Alert,StyleSheet,AppState} from 'react-native';
import functions from '@react-native-firebase/functions';
import * as LocalAuthentication from 'expo-local-authentication';
const call=name=>functions().httpsCallable(name);
const money=n=>'$'+((n||0)/100).toFixed(2);
export default function EarningsWalletScreen({onBack,payoutCountries,payoutWallets}){
 const [unlocked,setUnlocked]=useState(false),[unlocking,setUnlocking]=useState(false),[lockError,setLockError]=useState('');
 const lockRef=useRef(false);
 const authenticatingRef=useRef(false);
 const requestEpochRef=useRef(0);
 const [data,setData]=useState(null),[pin,setPin]=useState(''),[oldPin,setOldPin]=useState(''),[busy,setBusy]=useState(false);
 const [countryOpen,setCountryOpen]=useState(false),[countryCode,setCountryCode]=useState('');
 const [destination,setDestination]=useState(null);
 const country=payoutCountries.find(([code])=>code===countryCode);
 function selectCountry(code){
  setCountryCode(code);
  setDestination(null);
  setCountryOpen(false);
 }
 async function load(){
  setBusy(true);
  const epoch=requestEpochRef.current;
  try{const r=await call('getEarningsWallet')({});if(epoch===requestEpochRef.current&&!lockRef.current)setData(r.data)}
  catch(e){Alert.alert('تعذر تحميل المحفظة',e.message)}
  finally{setBusy(false)}
 }
 useEffect(()=>{
  let active=true;
  const subscription=AppState.addEventListener('change',state=>{
   if(state==='background'||(state==='inactive'&&!authenticatingRef.current)){
    lockRef.current=true;
    requestEpochRef.current+=1;
    if(active){setUnlocked(false);setData(null);setPin('');setOldPin('');selectCountry('')}
   }
  });
  return ()=>{active=false;subscription.remove()};
 },[]);
 async function unlockWallet(){
  if(unlocking)return;
  setUnlocking(true);setLockError('');
  lockRef.current=false;
  authenticatingRef.current=true;
  try{
   const result=await LocalAuthentication.authenticateAsync({
    promptMessage:'فتح محفظة Clipi',
    cancelLabel:'إلغاء',
    disableDeviceFallback:false,
    fallbackLabel:'رمز الجهاز',
   });
   if(result.success&&!lockRef.current){
    setUnlocked(true);
    await load();
   }else setLockError('لم ينجح التحقق. حاول مجددًا أو استخدم وسيلة قفل الجهاز إذا عرضها النظام.');
  }catch(e){setLockError('تعذر التحقق من الجهاز: '+e.message)}
  finally{authenticatingRef.current=false;setUnlocking(false)}
 }
 if(!unlocked)return <View style={[S.page,S.lockScreen]}>
  <Text style={S.lockIcon}>🔐</Text>
  <Text style={S.heading}>محفظة Clipi محمية</Text>
  <Text style={S.label}>افتح المحفظة ببصمة الوجه أو الإصبع أو رمز قفل الجهاز عند إتاحته من نظام التشغيل.</Text>
  <TouchableOpacity disabled={unlocking} onPress={unlockWallet} style={S.button}><Text style={S.buttonText}>{unlocking?'جارٍ التحقق...':'فتح المحفظة بأمان'}</Text></TouchableOpacity>
  {!!lockError&&<Text style={S.error}>{lockError}</Text>}
  <TouchableOpacity onPress={onBack} style={S.button}><Text style={S.buttonText}>رجوع</Text></TouchableOpacity>
 </View>;

 async function savePin(){
  if(!/^\d{6}$/.test(pin))return Alert.alert('الرقم السري','أدخل 6 أرقام');
  setBusy(true);
  try{await call('setEarningsWalletPin')({pin,currentPin:oldPin});setPin('');setOldPin('');Alert.alert('تم','تم حفظ الرقم السري');await load()}
  catch(e){Alert.alert('خطأ',e.message)}finally{setBusy(false)}
 }
 async function preview(method){
  const current=oldPin||pin;
  if(!/^\d{6}$/.test(current))return Alert.alert('الرقم السري','أدخل الرقم السري الحالي');
  setBusy(true);
  try{const r=await call('previewEarningsWithdrawal')({pin:current,method}),v=r.data;
   Alert.alert('معاينة فقط',v.eligible?(method==='cash'?money(v.usdMinor):v.diamonds.toLocaleString('en-US')+' ماسة')+' — التحويل غير مفعل':'لم تستوفِ الشروط. المتبقي '+v.remainingPoints+' نقطة أو فترة الانتظار');
   setPin('');setOldPin('');
  }catch(e){Alert.alert('تعذر المعاينة',e.message)}finally{setBusy(false)}
 }
 const btn=(title,fn)=><TouchableOpacity disabled={busy} onPress={fn} style={S.button}><Text style={S.buttonText}>{title}</Text></TouchableOpacity>;
 return <ScrollView style={S.page} contentContainerStyle={S.body}>
  {btn('❮ رجوع',onBack)}
  <Text style={S.heading}>💼 محفظة {data?.role==='owner'?'المالك':data?.role==='agent'?'الوكيل':'المضيف'}</Text>
  <View style={S.panel}>
   <Text style={S.number}>🪙 {(data?.availablePoints||0).toLocaleString('en-US')} نقطة</Text>
   <Text style={S.value}>القيمة بالدولار: {money(data?.availableUsdMinor)}</Text>
   <Text style={S.label}>نقاط معلقة: {data?.pendingPoints||0} · {money(data?.pendingUsdMinor)}</Text>
   <Text style={S.label}>المتبقي للوصول إلى 2,000 نقطة: {data?.remainingPoints??2000}</Text>
   <Text style={S.label}>طلب سحب واحد كل 15 يومًا. وصول المال مستهدف خلال 5 أيام عمل بعد الموافقة، وليس مضمونًا.</Text>
   {data?.nextEligibleAt&&<Text style={S.label}>أقرب موعد طلب: {new Date(data.nextEligibleAt).toLocaleDateString('ar')}</Text>}
   {btn('تحديث المحفظة',load)}
  </View>
  <View style={S.panel}>
   <Text style={S.heading}>خيارات سحب الأرباح</Text>
   <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:countryOpen}}
    onPress={()=>setCountryOpen(open=>!open)} style={S.option}>
    <Text style={S.buttonText}>{country?.[1]||'اختر الدولة'} {countryOpen?'▴':'▾'}</Text>
   </TouchableOpacity>
   {countryOpen&&payoutCountries.map(([code,name])=><TouchableOpacity key={code}
    accessibilityRole="button" accessibilityState={{selected:countryCode===code}}
    onPress={()=>selectCountry(code)} style={S.option}>
    <Text style={S.buttonText}>{name}</Text>
   </TouchableOpacity>)}
   {country&&<>
    <Text style={S.label}>محافظ إلكترونية</Text>
    {payoutWallets[countryCode].map(wallet=><TouchableOpacity key={wallet}
     accessibilityRole="button" accessibilityState={{selected:destination===wallet}}
     onPress={()=>setDestination(wallet)} style={[S.option,destination===wallet&&S.selected]}>
     <Text style={S.buttonText}>{wallet}</Text>
    </TouchableOpacity>)}
    <Text style={S.label}>البنوك</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{selected:destination==='bank'}}
     onPress={()=>setDestination('bank')} style={[S.option,destination==='bank'&&S.selected]}>
     <Text style={S.buttonText}>تحويل إلى حساب بنكي</Text>
    </TouchableOpacity>
    <Text style={S.label}>اختيار طريقة السحب للتجربة. التحويلات الفعلية غير مفعّلة.</Text>
    {destination&&btn('معاينة السحب النقدي',()=>preview('cash'))}
   </>}
  </View>
  <View style={S.panel}>
   <Text style={S.heading}>🔐 الرقم السري للمحفظة</Text>
   {data?.pinConfigured&&<TextInput style={S.input} secureTextEntry keyboardType="number-pad" maxLength={6} value={oldPin} onChangeText={setOldPin} placeholder="الرقم الحالي"/>}
   <TextInput style={S.input} secureTextEntry keyboardType="number-pad" maxLength={6} value={pin} onChangeText={setPin} placeholder="الرقم الجديد - 6 أرقام"/>
   {btn(data?.pinConfigured?'تغيير الرقم السري':'إنشاء الرقم السري',savePin)}
   {btn('معاينة التحويل إلى ماسات',()=>preview('diamonds'))}
   <Text style={S.label}>المحفظة تعرض أرصدة الخادم فقط. السحب والتحويل الحقيقيان غير مفعّلين.</Text>
  </View>
 </ScrollView>
}
const S=StyleSheet.create({
 lockScreen:{justifyContent:'center',padding:24,alignItems:'center'},lockIcon:{fontSize:62,marginBottom:18},error:{color:'#ffb6c1',textAlign:'center',marginTop:12},
 page:{flex:1,backgroundColor:'#170b2c'},body:{padding:18,paddingTop:45,paddingBottom:35},
 panel:{backgroundColor:'#302051',padding:18,borderRadius:14,marginVertical:10},
 heading:{fontSize:21,fontWeight:'900',color:'white',marginBottom:12},
 number:{fontSize:28,fontWeight:'900',color:'#ffe39a',marginBottom:8},
 value:{fontSize:19,color:'#91f2bd',fontWeight:'800',marginBottom:8},
 label:{color:'#ddd0ee',marginVertical:5,lineHeight:21},
 button:{backgroundColor:'#a72f73',padding:14,borderRadius:12,marginTop:9,alignItems:'center'},
 option:{backgroundColor:'#443165',padding:12,borderRadius:10,marginVertical:3},
 selected:{backgroundColor:'#695087',borderColor:'#ffe39a',borderWidth:1},
 buttonText:{color:'white',fontWeight:'900'},
 input:{backgroundColor:'white',padding:13,borderRadius:9,marginVertical:7,color:'#222'}
});
