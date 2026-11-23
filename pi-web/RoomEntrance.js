import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Animated,Easing,Platform,StyleSheet,View} from 'react-native';
import EntranceRibbon from './EntranceRibbon';
import EntranceSound from './EntranceSound';
import motion from './entranceMotion.json';

const rides=[
  null,
  {type:'ferrari',image:require('./assets/entrances/ferrari.png'),sound:require('./assets/entrances/ferrari.mp3')},
  {type:'mercedes',image:require('./assets/entrances/mercedes.png'),sound:require('./assets/entrances/mercedes.mp3')},
  {type:'jet',image:require('./assets/entrances/jet.png'),sound:require('./assets/entrances/jet.mp3')},
  {type:'balloon',image:require('./assets/entrances/balloon.png'),sound:require('./assets/entrances/balloon.mp3')},
  null,
  {type:'rocket',image:require('./assets/entrances/rocket.png'),sound:require('./assets/entrances/rocket.mp3')}
];

export function useRoomEntrances(minimized,blocked){
  const [queue,setQueue]=useState([]);
  const add=people=>{
    if(minimized)return;
    const visible=people.filter(p=>!blocked.includes(p.uid));
    if(visible.length)setQueue(old=>old.concat(visible));
  };
  useEffect(()=>{
    if(minimized)setQueue([]);
    else if(blocked.length)setQueue(old=>old.filter(p=>!blocked.includes(p.uid)));
  },[minimized,blocked]);
  const finish=useCallback(person=>setQueue(old=>old[0]===person?old.slice(1):old),[]);
  return {current:queue[0],add,finish};
}

export function RoomEntrance({person,host,muted,onDone}){
  const art=rides[Number(person.ride)];
  const timeline=useRef(new Animated.Value(0)).current;
  const [area,setArea]=useState(null);
  const ready=!!area;
  useEffect(()=>{
    if(!ready)return;
    const animation=Animated.timing(timeline,{toValue:1,duration:art?3250:2050,easing:Easing.linear,useNativeDriver:Platform.OS!=='web',isInteraction:false});
    animation.start(({finished})=>{if(finished)onDone(person);});
    return ()=>animation.stop();
  },[ready,art,person,timeline,onDone]);
  const interpolate=(outputRange,inputRange=motion.stops)=>timeline.interpolate({inputRange,outputRange});
  const track=art&&motion[art.type];
  return <View pointerEvents="none" style={styles.overlay}
    onLayout={({nativeEvent:{layout:{width,height}}})=>{if(width>1&&height>1)setArea(old=>old?.w===width&&old?.h===height?old:{w:width,h:height});}}>
    {area&&<>
      {art&&<>
        <EntranceSound source={art.sound} muted={muted}/>
        <Animated.View style={[StyleSheet.absoluteFill,{backgroundColor:'#080C17',opacity:interpolate([0,.38,.36,0],[0,.2,.78,1])}]}/>
        <Animated.Image accessible={false} resizeMode="contain" source={art.image}
          style={[styles.subject,{width:area.w,height:area.h,top:0,left:0,
            opacity:interpolate([0,1,1,0],[0,.10,.90,1]),transform:[
            {translateX:interpolate(track.x.map(v=>v*area.w))},{translateY:interpolate(track.y.map(v=>v*area.h))},
            {rotate:interpolate(track.angle.map(v=>v+'deg'))},{scale:interpolate(track.scale)}]}]}/>
      </>}
      <EntranceRibbon name={person.name} role={host?'صاحب الغرفة':null} area={area} timeline={timeline}/>
    </>}
  </View>;
}
const styles=StyleSheet.create({
  overlay:{...StyleSheet.absoluteFillObject,zIndex:75,elevation:13,alignItems:'center',overflow:'hidden'},
  subject:{position:'absolute'}
});
