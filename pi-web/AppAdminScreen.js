import React,{useRef,useState} from 'react';
import {StyleSheet,Text,TextInput,TouchableOpacity,View} from 'react-native';
import {ui,uiError} from './interface-language.mjs';

function Action({label,onPress,disabled}){
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[s.action,disabled&&{opacity:.5}]}><Text style={s.actionText}>{ui(label)}</Text></TouchableOpacity>;
}
export default function AppAdminScreen({request}){
  const [number,setNumber]=useState(''),[person,setPerson]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const pending=useRef(false);
  const valid=/^[0-9]{3,7}$/.test(number);
  function edit(value){
    setNumber(value.trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
      .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)));
    setPerson(null);setError('');setNotice('');
  }
  async function submit(change){
    if(pending.current||!valid||(change&&(!person||person.owner)))return;
    pending.current=true;setBusy(true);setError('');setNotice('');
    try{
      const params=change?{op:'setAppAdmin',targetUid:person.uid,enabled:!person.admin}:{op:'lookupAppAdmin'};
      const result=await request('/account-number',{...params,number});
      setPerson(result);
      if(change)setNotice(ui(result.admin?'تم تعيين أدمن التطبيق':'تم سحب صلاحية أدمن التطبيق'));
    }catch(e){setPerson(null);setError(uiError(e));}
    finally{pending.current=false;setBusy(false);}
  }
  return <View style={s.card}>
    <Text style={s.label}>{ui('رقم حساب كليبي')}</Text>
    <TextInput accessibilityLabel={ui('رقم حساب كليبي')} keyboardType="number-pad" maxLength={7}
      editable={!busy} value={number} onChangeText={edit} style={s.input}/>
    <Action label="بحث عن الحساب" disabled={busy||!valid} onPress={()=>submit(false)}/>
    {!!error&&<Text accessibilityRole="alert" style={s.label}>{error}</Text>}
    {person&&<View style={s.details}>
      <Text selectable style={s.label}>{[person.name,person.number].filter(Boolean).join(' · ')}</Text>
      <Text style={s.label}>{ui(person.owner?'هذا الحساب مالك التطبيق':person.admin?'أدمن للتطبيق':'حساب بدون صلاحية أدمن للتطبيق')}</Text>
      {!person.owner&&<Action label={person.admin?'سحب صلاحية أدمن التطبيق':'تأكيد تعيين أدمن للتطبيق'} disabled={busy} onPress={()=>submit(true)}/>}
    </View>}
    {!!notice&&<Text accessibilityLiveRegion="polite" style={s.label}>{notice}</Text>}
  </View>;
}
const s=StyleSheet.create({
  card:{padding:16,gap:12,backgroundColor:'#17233b',borderRadius:14},
  label:{color:'white',fontSize:16,textAlign:'right'},details:{gap:8},
  input:{backgroundColor:'#24334a',color:'white',padding:12,borderRadius:8,textAlign:'right'},
  action:{backgroundColor:'#304460',padding:12,borderRadius:8,alignSelf:'flex-end'},
  actionText:{color:'#ffe1a1',fontWeight:'700'}
});
