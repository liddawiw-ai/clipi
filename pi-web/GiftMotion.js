import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Platform,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import GiftMark from './GiftMark';
import {giftScores} from './giftScores';
import GiftAudio from './GiftAudio';

// Five waypoints give each gesture an entrance, action and exit within the stage.
const paths={
  bloom:{s:[.76,.86,.98,1,1]},kiss:{y:[15,0,-10,-22,-30],s:[.6,.94,1.12,1,.94]},
  clap:{r:[-12,13,-10,12,-4]},twirl:{r:[-85,-30,20,70,105]},
  freeze:{s:[.4,.85,1.1,1,.97]},present:{y:[45,12,-6,0,0]},cuddle:{r:[-16,10,-9,8,0]},
  open:{r:[0,-10,11,-6,0],s:[.7,.93,1.14,1,1]},jingle:{r:[-15,18,-13,12,0]},
  cast:{r:[-50,-30,23,-6,-14]},crown:{y:[-80,-32,4,0,0]},jewel:{r:[-36,-12,22,5,-12],s:[.67,1,1.12,1,.95]},
  hover:{x:[-20,-8,0,12,22],y:[30,-12,-20,-10,-25]},build:{y:[40,15,0,0,0],s:[.46,.74,1.06,1,1]},
  launch:{x:[-60,-42,-12,38,85],y:[90,68,12,-57,-120],s:[.55,.8,1.2,.95,.53]},
  orbit:{x:[-90,-30,35,70,98],y:[15,-30,-22,12,0],r:[-15,-5,12,5,-6]},
  fly:{x:[-110,-48,0,48,112],y:[47,24,0,-24,-53],s:[.55,.84,1.1,.87,.6]},
  drive:{x:[112,40,0,-40,-115],s:[.7,.94,1.12,1,.78]},
  swoop:{x:[-90,-46,0,48,92],y:[-45,-21,22,-18,-57],r:[8,15,-4,-14,-20]},
  march:{x:[-46,-22,0,24,46],y:[0,-12,0,-12,0],r:[-8,8,-8,8,0]},
  pounce:{x:[-45,-30,0,28,43],y:[20,12,-42,-8,15]},hop:{y:[12,-27,10,-20,8]},
  bounce:{s:[.7,1.16,.88,1.08,1]},unfold:{s:[.38,.7,1.05,1.12,1],r:[-17,-8,0,6,0]},
  pour:{r:[0,-12,-40,-25,0]},dance:{r:[-22,18,-15,21,-8],y:[0,-12,4,-10,0]},
  recoil:{x:[0,15,0,9,0],r:[0,-12,0,-6,0]},float:{y:[22,2,-14,-5,-22],r:[-6,4,9,-2,-8]},
  drop:{x:[78,45,0,-35,-55],y:[-85,-46,0,35,60]},wave:{r:[-11,12,-10,12,-5]},
  spritz:{y:[0,0,8,0,0],r:[-12,-3,9,0,-5]},flutter:{x:[-42,-20,0,18,44],y:[25,-12,6,-18,-3],r:[-18,18,-14,14,-8]}
};
const timeline=[0,.25,.5,.75,1], duration=3000;
export default function GiftMotion({gift,muted,onDone,label=gift[1],renderMark}){
  const score=giftScores[gift[1]];
  const p=useRef(new Animated.Value(0)).current, done=useRef(onDone);
  done.current=onDone;
  const reducedDefault=Platform.OS==='web'&&!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [reduced,setReduced]=useState(reducedDefault);
  const {width}=useWindowDimensions();
  useEffect(()=>{
    let active=true;
    AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)setReduced(value)}).catch(()=>{});
    const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);
    return ()=>{active=false;sub?.remove()};
  },[]);
  useEffect(()=>{
    p.setValue(0);
    const animation=Animated.timing(p,{toValue:1,duration,easing:Easing.linear,useNativeDriver:Platform.OS!=='web',isInteraction:false});
    animation.start(({finished})=>{if(finished)done.current()});
    return ()=>animation.stop();
  },[p,gift]);
  if(!score)return null;
  const curve=(out,range=timeline)=>p.interpolate({inputRange:range,outputRange:out});
  const path=paths[score.motion]??{};
  let scale=path.s?curve(path.s):1;
  if(score.motion==='pulse'){
    const beats=[.38,.38+score.beatGap,1.45,1.45+score.beatGap];
    const times=[0],sizes=[1];
    beats.forEach((at,i)=>{times.push(at/3,(at+.04)/3,(at+.18)/3);sizes.push(1,i%2?1.12:1.25,1)});
    times.push(1);sizes.push(1);scale=curve(sizes,times);
  }
  const transform=reduced?[]:[{translateX:path.x?curve(path.x):0},{translateY:path.y?curve(path.y):0},{rotate:path.r?curve(path.r.map(n=>n+'deg')):'0deg'},{scale}];
  return <View pointerEvents="none" style={styles.overlay}>
    {!muted&&<GiftAudio source={score.sound}/>}
    <Animated.View style={[styles.stage,{opacity:reduced?1:curve([0,1,1,1,0],[0,.09,.5,.88,1])}]}>
      <Animated.View style={{transform}}>{renderMark?.(gift)??<GiftMark gift={gift} size={Math.min(width*.25,110)} progress={reduced?null:p}/>}</Animated.View>
      {!reduced&&[-1,1].map((side,i)=><Animated.Text key={side} style={[styles.accent,{opacity:curve([0,0,.8,.65,0]),transform:[{translateX:curve([0,side*14,side*38,side*56,side*76])},{translateY:curve([0,0,-10,-26-i*8,-46-i*8])}]}]}>{score.accent}</Animated.Text>)}
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  </View>;
}
const styles=StyleSheet.create({
 overlay:{...StyleSheet.absoluteFillObject,justifyContent:'center',alignItems:'center',zIndex:100,elevation:12},
 stage:{width:'95%',height:222,justifyContent:'center',alignItems:'center'},
 accent:{position:'absolute',fontSize:21},label:{position:'absolute',bottom:0,color:'#fff',backgroundColor:'#173e38',borderRadius:14,paddingHorizontal:12,paddingVertical:4,overflow:'hidden',fontWeight:'700',textAlign:'center'}
});
