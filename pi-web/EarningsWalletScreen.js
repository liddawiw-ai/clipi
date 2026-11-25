import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,ScrollView} from 'react-native';
import {auth,functions} from './services';
import {ui,uiError} from './interface-language.mjs';
import {theme} from './ClipiTheme';
import PayoutPicker from './PayoutPicker';

const call=name=>payload=>functions().httpsCallable(name)(payload);
const button={padding:12,backgroundColor:theme.mint,borderRadius:12,alignItems:'center'};
export default function EarningsWalletScreen({request,onBack}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[revision,refresh]=useState(0);
  const [pin,setPin]=useState(''),[currentPin,setCurrentPin]=useState(''),[saving,setSaving]=useState(false);
  useEffect(()=>{
    let active=true;
    call('getEarningsWallet')({}).then(r=>{if(active){setData(r.data);setError('')}})
      .catch(()=>{if(active){setData(null);setError('')}});
    return ()=>{active=false};
  },[revision]);
  const reload=()=>refresh(n=>n+1);
  async function savePin(){
    if(saving)return;
    setSaving(true);
    try{await call('setEarningsWalletPin')({pin,currentPin});setPin('');setCurrentPin('');reload()}
    catch(e){setError(uiError(e))}finally{setSaving(false)}
  }
  return <ScrollView contentContainerStyle={{padding:18,gap:12,backgroundColor:theme.paper}}>
    <TouchableOpacity accessibilityRole="button" onPress={onBack} style={button}><Text>{ui('رجوع')}</Text></TouchableOpacity>
    <Text style={{fontSize:22,fontWeight:'bold'}}>{ui('محفظة المضيف')}</Text>
    {data&&<Text>{data.availablePoints} {ui('نقطة')} · ${(data.availableUsdMinor/100).toFixed(2)}</Text>}
    {!!error&&<Text accessibilityLiveRegion="polite">{ui(error)}</Text>}
    <TouchableOpacity accessibilityRole="button" onPress={reload} style={button}><Text>{ui('تحديث المحفظة')}</Text></TouchableOpacity>
    <PayoutPicker verifyEmail={()=>auth().currentUser.sendEmailVerification()} request={request} call={call} data={data} reload={reload}/>
    {data&&<View style={{gap:8}}>
      {data.pinConfigured&&<TextInput placeholder={ui('الرقم الحالي')} secureTextEntry keyboardType="number-pad" maxLength={6} value={currentPin} onChangeText={setCurrentPin}/>}
      <TextInput placeholder={ui('الرقم الجديد - 6 أرقام')} secureTextEntry keyboardType="number-pad" maxLength={6} value={pin} onChangeText={setPin}/>
      <TouchableOpacity disabled={saving||!/^\d{6}$/.test(pin)} onPress={savePin} style={button}><Text>{ui(data.pinConfigured?'تغيير الرقم السري':'إنشاء الرقم السري')}</Text></TouchableOpacity>
    </View>}
  </ScrollView>;
}
