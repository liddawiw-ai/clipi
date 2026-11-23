import React,{useEffect,useRef,useState} from 'react';
import {Animated,Platform,StyleSheet,Text,View} from 'react-native';

export function RoomTermsNotice({onRead,chatRevision,legacyMessages}){
  const initialRevision=useRef(chatRevision);
  const stage=Math.min(4,legacyMessages+Math.max(0,(chatRevision??0)-(initialRevision.current??0)));
  const progress=useRef(new Animated.Value(0)).current;
  const [hidden,setHidden]=useState(false);
  useEffect(()=>{
    const animation=Animated.timing(progress,{toValue:stage,duration:420,useNativeDriver:Platform.OS!=='web',isInteraction:false});
    animation.start(({finished})=>{if(finished&&stage===4)setHidden(true)});
    return ()=>animation.stop();
  },[progress,stage]);
  if(hidden)return null;
  const opacity=progress.interpolate({inputRange:[0,1,2,3,4],outputRange:[1,.88,.70,.46,0]});
  const translateY=progress.interpolate({inputRange:[0,4],outputRange:[0,-30]});
  return <Animated.View testID="room-guidelines" style={[s.notice,{opacity,transform:[{translateY}]}]}>
    <View style={s.links}>
      <Text accessibilityRole="link" style={[s.ink,s.link]} onPress={()=>onRead('privacy')}>Privacy · الخصوصية</Text>
      <Text accessibilityRole="link" style={[s.ink,s.link]} onPress={()=>onRead('terms')}>Terms · شروط الخدمة</Text>
    </View>
    <Text style={[s.ink,s.ar]}>احترم المشاركين وخصوصيتهم. شارك فقط ما تملك إذنًا ببثّه. تُرسل الهدايا من الماس المشترى.</Text>
    <Text style={[s.ink,s.en]}>Respect other participants and their privacy. Share only what you have permission to broadcast. Gifts use purchased diamonds.</Text>
  </Animated.View>;
}
const s=StyleSheet.create({
  notice:{paddingHorizontal:8,paddingBottom:6,backgroundColor:'transparent'},
  links:{flexDirection:'row',flexWrap:'wrap',gap:12,justifyContent:'flex-end',paddingBottom:2},
  ink:{color:'#fff',fontSize:12,lineHeight:17,fontWeight:'600',textShadowColor:'#110b13',textShadowOffset:{width:0,height:1},textShadowRadius:3},
  link:{color:'#ffdfac',fontWeight:'800',textDecorationLine:'underline'},
  ar:{textAlign:'right',writingDirection:'rtl'},en:{textAlign:'left',writingDirection:'ltr'}
});
