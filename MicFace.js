import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {theme} from './ClipiTheme';

export default function MicFace({main, person, host, locked, speaking}) {
  const portrait = person?.avatar?.startsWith('data:image/');
  return <View pointerEvents="none" style={[s.seat, main && s.main, person && s.occupied,
    host && s.host, speaking && s.live, person?.frame && s.frame]}>
    {portrait ? <Image source={{uri:person.avatar}} style={s.photo}/> : person?.avatar ?
      <Text style={s.avatar}>{person.avatar}</Text> : person?.name ?
      <Text style={s.initial}>{Array.from(person.name.trim())[0]}</Text> : locked && !person ?
      <Text style={s.avatar}>🔒</Text> :
      <View style={s.mic}>
        <View style={s.capsule}/><View style={s.cradle}/><View style={s.stem}/><View style={s.foot}/>
      </View>}
    {!locked && !person && <View style={s.plusBadge}><Text style={s.plus}>+</Text></View>}
    {!!person && <View style={[s.status, speaking && s.speaking]}/>}
  </View>;
}

const s = StyleSheet.create({
  seat:{width:49,height:49,borderRadius:25,borderWidth:1,borderColor:'#AFCABD',backgroundColor:theme.paper,alignItems:'center',justifyContent:'center'},
  main:{width:68,height:68,borderRadius:34},
  occupied:{backgroundColor:theme.mint,borderWidth:2,borderColor:'#79AD97'},
  host:{backgroundColor:theme.sand,borderColor:theme.brass},
  live:{borderColor:theme.accent},frame:{borderColor:theme.brass,borderWidth:3},
  photo:{width:'90%',height:'90%',borderRadius:40},crown:{fontSize:32,color:theme.gold},
  avatar:{fontSize:22},initial:{fontSize:22,fontWeight:'700',color:theme.accent},mic:{width:24,height:27,alignItems:'center',justifyContent:'flex-start'},
  capsule:{position:'absolute',top:1,width:10,height:16,borderRadius:5,backgroundColor:'#64998A'},
  cradle:{position:'absolute',top:8,width:17,height:13,borderWidth:2,borderTopWidth:0,borderColor:theme.accent,borderBottomLeftRadius:9,borderBottomRightRadius:9},
  stem:{position:'absolute',top:20,width:2,height:5,backgroundColor:theme.accent},
  foot:{position:'absolute',top:24,width:10,height:2,borderRadius:1,backgroundColor:theme.accent},
  plusBadge:{position:'absolute',right:-2,bottom:-1,width:16,height:16,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:theme.mint,borderWidth:1,borderColor:theme.paper},
  plus:{fontSize:12,lineHeight:14,fontWeight:'700',color:theme.accent},
  status:{position:'absolute',right:0,bottom:1,width:10,height:10,borderRadius:5,backgroundColor:'#899B91',borderWidth:2,borderColor:theme.paper},
  speaking:{backgroundColor:theme.accent},
});
