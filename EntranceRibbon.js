import {ui as appText} from './interface-language.mjs';
import React from 'react';
import {Animated, Image, StyleSheet, Text, View} from 'react-native';

const ribbon = require('./assets/entrances/entry-ribbon.png');

export default function EntranceRibbon({name,role,area,timeline}) {
  const width = Math.min(area.w * .976, 760);
  const height = width * .128;
  const shimmer = timeline.interpolate({inputRange:[0,.14,.62,1],outputRange:[-width*.23,-width*.23,width*.83,width*.83]});
  const shineOpacity = timeline.interpolate({inputRange:[0,.14,.24,.51,.62,1],outputRange:[0,0,.75,.75,0,0]});
  const fade = timeline.interpolate({inputRange:[0,.10,.90,1],outputRange:[0,1,1,0]});
  const move = timeline.interpolate({inputRange:[0,.12,1],outputRange:[9,0,0]});
  return <Animated.View style={[styles.ribbon,{width,height,top:area.h*.76,opacity:fade,transform:[{translateY:move}]}]}>
    <Image accessible={false} source={ribbon} resizeMode="stretch" style={styles.art}/>
    <View style={styles.reflection}>
      <Animated.View style={[styles.streak,{opacity:shineOpacity,transform:[{translateX:shimmer},{skewX:'-26deg'}]}]}>
        <View style={styles.fineLine}/>
      </Animated.View>
    </View>
    <View style={styles.legend}>
      <Text style={[styles.name,{fontSize:Math.min(23,width*.051)}]} numberOfLines={1} accessibilityLiveRegion="polite">{appText('دخل ')+name}</Text>
      {role&&<><View style={styles.divider}/><Text numberOfLines={1} style={[styles.role,{fontSize:Math.min(17,width*.038)}]}>{appText(role)}</Text></>}
    </View>
  </Animated.View>;
}

const styles=StyleSheet.create({
  ribbon:{position:'absolute',alignSelf:'center',alignItems:'center',justifyContent:'center'},
  art:{position:'absolute',width:'100%',height:'100%'},
  reflection:{position:'absolute',top:'28%',bottom:'28%',left:'13%',right:'13%',overflow:'hidden'},
  streak:{position:'absolute',left:0,top:-24,bottom:-24,width:36,backgroundColor:'rgba(255,226,250,0.15)',alignItems:'center'},
  fineLine:{width:2,height:'100%',backgroundColor:'rgba(255,239,217,.58)'},
  legend:{maxWidth:'68%',flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:8},
  name:{flexShrink:1,fontWeight:'800',color:'#FFF6FB',textAlign:'right',textShadowColor:'#2D152A',textShadowRadius:3,textShadowOffset:{width:0,height:1}},
  divider:{width:4,height:4,transform:[{rotate:'45deg'}],backgroundColor:'#E7BD91'},
  role:{color:'#FFE0B6',fontWeight:'600'}
});
