import {ui as appText} from './interface-language.mjs';
import React,{useEffect} from 'react';
import {BackHandler,Pressable,StyleSheet,Text,View} from 'react-native';

export default function DeleteVideoDialog({translate,busy,error,onCancel,onConfirm}){
  useEffect(()=>{
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{if(!busy)onCancel();return true;});
    return ()=>handler.remove();
  },[busy,onCancel]);
  return <View accessibilityViewIsModal importantForAccessibility="yes" style={s.overlay}>
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.title}>{translate('حذف الفيديو؟')}</Text>
      <Text style={s.note}>{translate('سيُحذف المقطع وتعليقاته نهائيًا.')}</Text>
      {!!error&&<Text accessibilityRole="alert" style={s.error}>{appText(error)}</Text>}
      <View style={s.actions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={s.button}><Text style={s.label}>{translate('إلغاء')}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onConfirm} style={[s.button,s.danger]}>
          <Text style={[s.label,s.white]}>{translate(busy?'جارٍ الحذف…':'تأكيد الحذف')}</Text>
        </Pressable>
      </View>
    </View>
  </View>;
}
const s=StyleSheet.create({
  overlay:{...StyleSheet.absoluteFillObject,zIndex:10,elevation:10,backgroundColor:'rgba(12,22,20,.48)',justifyContent:'center',alignItems:'center',padding:12},
  card:{width:'100%',maxWidth:320,padding:18,gap:9,borderRadius:16,backgroundColor:'#fffcf9'},
  title:{fontSize:20,fontWeight:'700',color:'#192625',textAlign:'right'},note:{fontSize:15,color:'#46514e',textAlign:'right'},
  error:{color:'#8a2726',textAlign:'right'},actions:{flexDirection:'row-reverse',gap:8},
  button:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#e5ede7'},
  label:{fontWeight:'700',color:'#23382f'},danger:{backgroundColor:'#942e32'},white:{color:'#fff'}
});
