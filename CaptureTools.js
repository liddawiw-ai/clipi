import React from 'react';
import {Image,Keyboard,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {ui} from './interface-language.mjs';
import symbols from './camera-symbols.json';

export function CameraTool({icon,label,onPress,disabled=false,selected=false}){
  return <Pressable accessibilityRole="button" accessibilityLabel={ui(label)} accessibilityState={{disabled,selected}}
    disabled={disabled} onPress={onPress} style={[s.hit,disabled&&s.disabled]}>
    <View style={[s.disc,selected&&s.selected]}>{symbols[icon]
      ?<Image accessible={false} source={{uri:symbols[icon]}} style={s.icon}/>
      :<Text accessible={false} style={icon==='T'?s.type:s.glyph}>{icon}</Text>}</View>
  </Pressable>;
}

export function CameraTextEditor({value,onChange,onDone,label}){
  function done(){Keyboard.dismiss();onDone();}
  return <View style={s.sheet} accessibilityViewIsModal>
    <Pressable accessibilityRole="button" accessibilityLabel={ui('رجوع')} style={StyleSheet.absoluteFillObject} onPress={done}/>
    <TextInput autoFocus multiline maxLength={160} value={value} onChangeText={onChange}
      accessibilityLabel={ui(label)} placeholder={ui('اكتب هنا')} placeholderTextColor="#e4e4e4" style={s.input}/>
    <View style={s.done}><CameraTool icon="✓" label="تم" onPress={done}/></View>
  </View>;
}
const s=StyleSheet.create({
  hit:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  disc:{width:32,height:32,alignItems:'center',justifyContent:'center',borderRadius:16,backgroundColor:'rgba(12,14,16,.64)'},
  selected:{backgroundColor:'#84344c',borderWidth:1,borderColor:'white'},disabled:{opacity:.5},
  icon:{width:22,height:22},type:{fontSize:23,lineHeight:27,fontWeight:'700',color:'#fff'},glyph:{fontSize:22,lineHeight:26,color:'#fff'},
  sheet:{...StyleSheet.absoluteFillObject,zIndex:5,backgroundColor:'rgba(9,10,12,.7)',alignItems:'center',justifyContent:'center',paddingHorizontal:24},
  input:{width:'100%',maxWidth:520,maxHeight:'65%',minHeight:65,fontSize:22,color:'#fff',fontWeight:'700',textAlign:'center',padding:10},
  done:{position:'absolute',right:12,top:16}
});
