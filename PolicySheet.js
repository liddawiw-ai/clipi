import React,{useState} from 'react';
import {Clipboard,Modal,Platform,ScrollView,Share,StyleSheet,Text,TouchableOpacity,View} from 'react-native';
import pages from './policy-content.json';

export function PolicySheet({page,endpoint,onClose}){
  const [status,setStatus]=useState('');
  const document=pages[page];
  if(!document)return null;
  const url=endpoint+'/'+page;
  async function copy(){
    try{
      if(Platform.OS==='web'){
        try{await navigator.clipboard.writeText(url)}
        catch{if(!Clipboard.setString(url))throw Error()}
      }else Clipboard.setString(url);
      setStatus('Link copied · تم نسخ الرابط');
    }catch{setStatus(url)}
  }
  async function share(){
    try{
      if(Platform.OS==='web'){
        if(!navigator.share){setStatus(url);return}
        await navigator.share({title:document.en[0],url});
      }else await Share.share({message:url});
    }catch(error){if(error.name!=='AbortError')setStatus(url)}
  }
  return <View style={s.backdrop} accessibilityViewIsModal>
    <TouchableOpacity accessible={false} style={StyleSheet.absoluteFillObject} onPress={onClose}/>
    <View style={s.sheet}>
      <View style={s.heading}><Text accessibilityRole="header" style={s.brand}>Clipi</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close · إغلاق" onPress={onClose} style={s.close}><Text style={s.cross}>×</Text></TouchableOpacity>
      </View>
      <ScrollView key={page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {['en','ar'].map(lang=><View key={lang} style={s.section}>
          {document[lang].map((line,index)=><Text key={line} selectable accessibilityRole={index===0?'header':undefined}
            style={[index===0?s.title:s.text,{textAlign:lang==='ar'?'right':'left',writingDirection:lang==='ar'?'rtl':'ltr'}]}>{line}</Text>)}
        </View>)}
      </ScrollView>
      <View style={s.actions}>{[['Share · مشاركة',share],['Copy link · نسخ الرابط',copy]].map(([label,press])=>
        <TouchableOpacity key={label} accessibilityRole="button" onPress={press} style={s.action}><Text style={s.actionText}>{label}</Text></TouchableOpacity>)}</View>
      {!!status&&<Text selectable accessibilityLiveRegion="polite" style={s.text}>{status}</Text>}
    </View>
  </View>;
}

export function PolicyModal({page,endpoint,onClose}){
  return <Modal visible={!!page} transparent animationType="fade" onRequestClose={onClose}>
    {page&&<PolicySheet key={page} page={page} endpoint={endpoint} onClose={onClose}/>}
  </Modal>;
}

const s=StyleSheet.create({
  backdrop:{flex:1,backgroundColor:'rgba(15,9,21,.68)',alignItems:'center',justifyContent:'center',padding:16},
  sheet:{width:'100%',maxWidth:480,maxHeight:'88%',paddingHorizontal:18,paddingBottom:16,borderRadius:20,borderWidth:1,borderColor:'#826348',backgroundColor:'#291e2a'},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:4},
  brand:{fontSize:18,fontWeight:'800',color:'#ffc485'},
  close:{width:44,height:44,justifyContent:'center',alignItems:'center'},cross:{color:'white',fontWeight:'600',fontSize:28},
  content:{gap:16,paddingVertical:5},section:{gap:6},title:{color:'#ffdfb3',fontWeight:'800',fontSize:18},
  text:{color:'#fff8ee',fontSize:14,lineHeight:21},actions:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:12},
  action:{backgroundColor:'#ffad69',paddingVertical:8,paddingHorizontal:12,borderRadius:12},actionText:{color:'#32180b',fontWeight:'700',fontSize:13}
});
