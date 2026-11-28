import {ui} from './interface-language.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {cardName} from './TableRules.mjs';

const cardFaces={
  clubs:require('./assets/external-tables/clubs.png'),
  diamonds:require('./assets/external-tables/diamonds.png'),
  hearts:require('./assets/external-tables/hearts.png'),
  spades:require('./assets/external-tables/spades.png'),
};
const suitNames={clubs:'السباتي',diamonds:'الديناري',hearts:'الكبة',spades:'البستوني'};
const dice=require('./assets/external-tables/dice.png');

function Sprite({source,frame,columns,rows,width,height}){
  const x=frame%columns, y=Math.floor(frame/columns);
  return <View accessible={false} pointerEvents="none" style={{width,height,overflow:'hidden',direction:'ltr'}}>
    <Image accessible={false} fadeDuration={0} resizeMode="stretch" source={source}
      style={{position:'absolute',start:-x*width,top:-y*height,width:width*columns,height:height*rows}}/>
  </View>;
}

function cardLabel(rank,suit){
  return ui('ورقة')+' '+cardName(rank)+(Object.hasOwn(suitNames,suit)?' '+ui(suitNames[suit]):'');
}
export function CardFace({rank,suit,width=49}){
  const height=width*190/140;
  if(Object.hasOwn(cardFaces,suit))return <Sprite source={cardFaces[suit]} frame={rank-1} columns={7} rows={2} width={width} height={height}/>;
  return <View style={[styles.legacyCard,{width,height}]}><Text style={styles.rank}>{cardName(rank)}</Text></View>;
}
export function LastCard({card,player}){
  const label=ui('آخر ورقة')+' · '+player;
  return <View accessible accessibilityLabel={label+'، '+cardLabel(card.rank,card.suit)}
    style={{flexDirection:'row-reverse',gap:8,alignItems:'center',marginTop:2}}>
    <CardFace rank={card.rank} suit={card.suit} width={30}/>
    <Text style={{color:'#48544D',fontSize:13,fontWeight:'600'}}>{label}</Text>
  </View>;
}
export function PlayingCard({rank,suit,enabled,selected,onPress}){
  return <Pressable accessibilityRole="button" accessibilityLabel={cardLabel(rank,suit)}
    accessibilityState={{selected,disabled:!enabled}} disabled={!enabled} onPress={onPress}
    style={[styles.cardFrame,{borderColor:selected?'#BB872F':'transparent',opacity:enabled?1:.71}]}>
    <CardFace rank={rank} suit={suit}/>
  </Pressable>;
}

const tumbleFrames=[[3,-15,-2],[6,9,-5],[2,18,-6],[5,-8,-4],[1,5,-1],[4,-3,0]];
export function Die({value,rollKey}){
  const [motionLimited,setMotionLimited]=useState(false),[step,setStep]=useState(-1);
  const previousRoll=useRef(rollKey);
  useEffect(()=>{
    let mounted=true;
    AccessibilityInfo.isReduceMotionEnabled?.().then(v=>{if(mounted)setMotionLimited(v);}).catch(()=>{});
    const subscription=AccessibilityInfo.addEventListener?.('reduceMotionChanged',setMotionLimited);
    return ()=>{mounted=false;subscription?.remove?.();};
  },[]);
  useEffect(()=>{
    if(previousRoll.current===rollKey||motionLimited){previousRoll.current=rollKey;setStep(-1);return;}
    previousRoll.current=rollKey;
    let frame=0;
    setStep(frame);
    const timer=setInterval(()=>{
      frame++;
      if(frame===tumbleFrames.length){clearInterval(timer);setStep(-1);}
      else setStep(frame);
    },58);
    return ()=>clearInterval(timer);
  },[rollKey,motionLimited]);
  if(!value&&step<0)return null;
  const [face,rotation,rise]=step<0?[value,0,0]:tumbleFrames[step];
  return <View accessible accessibilityLabel={value?ui('نتيجة النرد')+' '+value:ui('جارٍ رمي النرد')}
    style={{transform:[{translateY:rise},{rotate:rotation+'deg'}]}}>
    <svg aria-hidden="true" width="60" height="62" viewBox="0 0 100 104"><ellipse cx="50" cy="93" rx="39" ry="8" fill="#000" opacity=".35"/><path d="M12 20 L68 8 L91 27 L91 78 L70 95 L12 81Z" fill="#b9c3d2" stroke="#78879d" strokeWidth="2"/><path d="M68 8 L91 27 L70 41 L12 20Z" fill="#fffdf5"/><path d="M70 41 L91 27 L91 78 L70 95Z" fill="#9baec3"/><path d="M12 20 L70 41 L70 95 L12 81Z" fill="#fff" stroke="#e0d6bd" strokeWidth="2"/>{({1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],4:[[0,0],[2,0],[0,2],[2,2]],5:[[0,0],[2,0],[1,1],[0,2],[2,2]],6:[[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]]}[face]||[]).map(([x,y],i)=><ellipse key={i} cx={24+x*16} cy={39+y*15+x*5} rx="4.8" ry="5.5" fill="#c82b3f"/>)}<path d="M16 25 L65 43" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></svg>
  </View>;
}
const styles=StyleSheet.create({
  cardFrame:{padding:2,borderWidth:2,borderRadius:8,alignItems:'center',justifyContent:'center'},
  legacyCard:{backgroundColor:'#FFFDF8',borderColor:'#C2BAA9',borderWidth:1,borderRadius:5,alignItems:'center',justifyContent:'center'},
  rank:{fontSize:26,color:'#293631',fontWeight:'700'},
});
