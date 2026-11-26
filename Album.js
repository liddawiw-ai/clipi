import React,{useEffect,useRef,useState} from 'react';
import {Image,PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';
import {ui} from './interface-language.mjs';
import {nonce} from './ShortMedia';

export function Overlay({text,timed=false}){
  return text?<View pointerEvents="none" style={[s.overlay,timed&&s.timed]}><Text style={s.words}>{text}</Text></View>:null;
}
export function Album({count,uri,notes,index,setIndex,onSeen,onDismiss}){
  const latest=useRef();latest.current={index,count,setIndex};
  const [width,setWidth]=useState(0);
  const swipe=useRef(PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>12&&Math.abs(g.dx)>Math.abs(g.dy)*1.4,
    onPanResponderRelease:(_,g)=>{const v=latest.current;if(Math.abs(g.dx)>30)v.setIndex(Math.max(0,Math.min(v.count-1,v.index+(g.dx<0?1:-1))));}
  })).current;
  return <View style={StyleSheet.absoluteFill} {...swipe.panHandlers} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
    <Image key={uri} resizeMode="contain" source={{uri}} onLoad={()=>onSeen?.(index)} style={StyleSheet.absoluteFill} accessibilityLabel={ui('صورة')+' '+(index+1)}/>
    {onDismiss&&<Pressable accessibilityRole="button" accessibilityLabel={ui('الرجوع من المعاينة')} style={StyleSheet.absoluteFillObject} onPress={onDismiss}/>}
    <Overlay text={notes?.[index]}/>
    {count>1&&<View style={[s.pager,{left:Math.max(8,(width-144)/2)}]}>
      <Pressable accessibilityRole="button" accessibilityLabel={ui('الصورة السابقة')} disabled={index===0} onPress={()=>setIndex(index-1)} style={s.arrow}><Text style={s.num}>‹</Text></Pressable>
      <Text style={s.num}>{index+1} / {count}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={ui('الصورة التالية')} disabled={index===count-1} onPress={()=>setIndex(index+1)} style={s.arrow}><Text style={s.num}>›</Text></Pressable>
    </View>}
  </View>;
}
export function PublishedAlbum({item,source,notes,active,request,onIndex}){
  const [index,setIndex]=useState(0),[loaded,setLoaded]=useState(-1);
  const session=useRef(null);
  useEffect(()=>{
    if(!active){session.current=null;return;}
    if(loaded!==index)return;
    const visit=session.current??(session.current={id:nonce(),seen:new Set(),sent:false,done:false});
    visit.seen.add(index);
    const finished=visit.seen.size===item.photoCount;
    if(finished?visit.done:visit.sent)return;
    request('/account-number',{op:'shortWatch',clip:item.id,visit:visit.id,finished}).then(()=>{
      visit.sent=true;if(finished)visit.done=true;
    }).catch(()=>{});
  },[active,index,loaded,item.id,item.photoCount,request]);
  return <Album count={item.photoCount} uri={source+'?photo='+index} notes={notes} index={index}
    setIndex={i=>{setIndex(i);onIndex(i);}} onSeen={setLoaded}/>;
}
const s=StyleSheet.create({timed:{top:undefined,bottom:'10%'},overlay:{position:'absolute',left:'8%',right:'8%',top:'40%',alignItems:'center'},words:{color:'white',fontSize:22,fontWeight:'700',textAlign:'center',backgroundColor:'rgba(0,0,0,.55)',borderRadius:8,paddingHorizontal:9,paddingVertical:4},
  pager:{position:'absolute',bottom:'13%',flexDirection:'row',direction:'ltr',width:144,justifyContent:'space-around',alignItems:'center',backgroundColor:'rgba(0,0,0,.65)',borderRadius:18},arrow:{minHeight:44,minWidth:42,alignItems:'center',justifyContent:'center'},num:{color:'#fff',fontWeight:'700',fontSize:16}});
