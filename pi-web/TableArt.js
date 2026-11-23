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
  return 'ورقة '+cardName(rank)+(Object.hasOwn(suitNames,suit)?' '+suitNames[suit]:'');
}
export function CardFace({rank,suit,width=49}){
  const height=width*190/140;
  if(Object.hasOwn(cardFaces,suit))return <Sprite source={cardFaces[suit]} frame={rank-1} columns={7} rows={2} width={width} height={height}/>;
  return <View style={[styles.legacyCard,{width,height}]}><Text style={styles.rank}>{cardName(rank)}</Text></View>;
}
export function LastCard({card,player}){
  const label='آخر ورقة · '+player;
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
  return <View accessible accessibilityLabel={value?'نتيجة النرد '+value:'جارٍ رمي النرد'}
    style={{transform:[{translateY:rise},{rotate:rotation+'deg'}]}}>
    <Sprite source={dice} frame={face-1} columns={3} rows={2} width={41} height={41}/>
  </View>;
}
const styles=StyleSheet.create({
  cardFrame:{padding:2,borderWidth:2,borderRadius:8,alignItems:'center',justifyContent:'center'},
  legacyCard:{backgroundColor:'#FFFDF8',borderColor:'#C2BAA9',borderWidth:1,borderRadius:5,alignItems:'center',justifyContent:'center'},
  rank:{fontSize:26,color:'#293631',fontWeight:'700'},
});
