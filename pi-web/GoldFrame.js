import React from 'react';
import {StyleSheet, View} from 'react-native';
import {theme} from './ClipiTheme';

const palettes = {
  mint: [theme.mint, '#ADDACA', '#83C4B2', '#DFF3DC'],
  apricot: [theme.peach, '#F4CDAD', '#E9BA9B', '#F8DBB6'],
  lilac: [theme.lilac, '#D5CFE9', '#BCB6D8', '#E5DDF0'],
};

// Concentric bands echo a microphone diaphragm across the cover art and stage.
export default function GoldFrame({tone = 'mint', stage = false}) {
  const [base, outer, middle, center] = palettes[tone] || palettes.mint;
  return <View pointerEvents="none" accessible={false} style={[s.frame, {backgroundColor:base}]}>
    <View style={[s.orbit, stage && s.stageOrbit, {borderColor:outer}]}>
      <View style={[s.disc, {backgroundColor:middle}]}>
        <View style={[s.centre, {backgroundColor:center}]}/>
      </View>
    </View>
    <View style={[s.arc, stage && s.stageArc, {borderColor:outer}]}/>
  </View>;
}

const s = StyleSheet.create({
  frame: {...StyleSheet.absoluteFillObject, overflow:'hidden'},
  orbit: {position:'absolute', width:232, height:232, borderRadius:116, borderWidth:18,
    left:-74, top:-80, alignItems:'center', justifyContent:'center'},
  disc: {width:'84%', height:'84%', borderRadius:160, alignItems:'center', justifyContent:'center'},
  centre: {width:'54%', height:'54%', borderRadius:100},
  arc: {position:'absolute', width:270, height:270, borderRadius:135, borderWidth:2, left:2, bottom:-230},
  stageOrbit: {width:420, height:420, borderRadius:210, borderWidth:27, left:-288, top:-76, opacity:0.58},
  stageArc: {width:620, height:620, borderRadius:310, borderWidth:32, left:'28%', bottom:-420, opacity:0.45},
});
