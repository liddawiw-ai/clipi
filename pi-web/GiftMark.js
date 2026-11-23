import React from 'react';
import {Animated, Text, View} from 'react-native';
import {giftScores} from './giftScores';

const petals = [[-49,1], [49,1], [-32,.91], [32,.91], [-15,.80], [15,.80], [0,.62]];
const red = ['#a92342','#c12a50','#d54165','#e65477','#ed7796','#fb9fb0','#ffbdc7'];
const blue = ['#24529d','#316bbe','#4281cf','#5197db','#74b4ed','#9ecdf5','#c6e4fd'];

function Rose({size, isBlue, progress}) {
  const palette = isBlue ? blue : red;
  return <View accessible={false} style={{width:size,height:size}}>
    <View style={{position:'absolute',top:size*.43,left:size*.49,width:size*.043,height:size*.53,backgroundColor:'#417045',borderRadius:size*.04}}/>
    {[-1,1].map(side=><View key={side} style={{position:'absolute',top:size*(side<0?.75:.66),left:size*(side<0?.28:.49),width:size*.24,height:size*.1,borderRadius:size*.07,backgroundColor:'#508650',transform:[{rotate:side<0?'32deg':'-32deg'}]}}/>)}
    {petals.map(([angle,factor],i)=>{
      const open = progress?.interpolate({inputRange:[0,.15,.72,1],outputRange:['0deg','0deg',angle+'deg',angle+'deg']}) ?? angle+'deg';
      const spread = progress?.interpolate({inputRange:[0,.72,1],outputRange:[.45,1,1]}) ?? 1;
      return <Animated.View key={i} style={{position:'absolute',left:size*(.5-.17*factor),top:size*.09,width:size*.34*factor,height:size*.50,transform:[{rotate:open},{scaleX:spread}]}}>
        <View style={{height:size*.42*factor,borderRadius:size*.17,backgroundColor:palette[i]}}/>
      </Animated.View>;
    })}
  </View>;
}
export default function GiftMark({gift, size=26, progress}) {
  const score=giftScores[gift[1]];
  if(score?.motion==='bloom')return <Rose size={size} progress={progress} isBlue={gift[1]==='وردة زرقاء'}/>;
  return <Text allowFontScaling={false} style={{fontSize:size,lineHeight:size*1.3,textAlign:'center'}}>{score?.glyph??gift[0]}</Text>;
}
