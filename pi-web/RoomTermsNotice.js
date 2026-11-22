import React,{useEffect,useRef,useState} from 'react';
import {Animated,Platform,StyleSheet,Text,TouchableOpacity,View} from 'react-native';

const copy={
  ar:{title:'شروط الخدمة',body:'احترم المشاركين وشارك فقط ما تملك إذنًا ببثّه. تُرسل الهدايا من الماس المشترى.'},
  en:{title:'Terms of Service',body:'Respect everyone in the room. Share only what you have permission to broadcast. Gifts use purchased diamonds.'}
};

export function RoomTermsNotice({language,onLanguage,onRead,chatRevision,hasNewMessage}){
  const [entryRevision]=useState(chatRevision);
  const [hidden,setHidden]=useState(false);
  const opacity=useRef(new Animated.Value(1)).current;
  const chatting=hasNewMessage||(Number.isInteger(entryRevision)&&chatRevision>entryRevision);
  useEffect(()=>{
    if(!chatting)return;
    const fade=Animated.timing(opacity,{toValue:0,duration:1600,useNativeDriver:Platform.OS!=='web',isInteraction:false});
    fade.start(({finished})=>{if(finished)setHidden(true)});
    return ()=>fade.stop();
  },[chatting,opacity]);
  if(hidden)return null;
  const arabic=language==='ar';
  const align={textAlign:arabic?'right':'left',writingDirection:arabic?'rtl':'ltr'};
  return <Animated.View style={[styles.notice,{opacity}]} pointerEvents={chatting?'none':'box-none'}
    accessibilityElementsHidden={chatting} importantForAccessibility={chatting?'no-hide-descendants':'auto'}>
    <View style={[styles.heading,{flexDirection:arabic?'row-reverse':'row'}]}>
      <TouchableOpacity accessibilityRole="link" onPress={onRead} hitSlop={{top:4,bottom:3,left:3,right:3}}>
        <Text style={[styles.ink,styles.title,align]}>{copy[language].title}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={arabic?'Show terms in English':'عرض الشروط بالعربية'}
        onPress={()=>onLanguage(arabic?'en':'ar')} hitSlop={{top:4,bottom:3,left:3,right:3}}>
        <Text style={[styles.ink,styles.language]}>{arabic?'English':'العربية'}</Text>
      </TouchableOpacity>
    </View>
    <Text style={[styles.ink,styles.body,align]}>{copy[language].body}</Text>
  </Animated.View>;
}

const styles=StyleSheet.create({
  notice:{paddingHorizontal:7,paddingBottom:5,backgroundColor:'transparent'},
  heading:{direction:'ltr',alignItems:'center',gap:14,paddingBottom:2},
  ink:{color:'#fff',textShadowColor:'#07060b',textShadowOffset:{width:0,height:1},textShadowRadius:2},
  title:{color:'#fff0b6',fontSize:14,fontWeight:'800',textDecorationLine:'underline'},
  language:{fontSize:13,fontWeight:'700'},
  body:{fontSize:14,lineHeight:20,fontWeight:'600'}
});
