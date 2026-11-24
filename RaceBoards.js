import {ui as appText} from './interface-language.mjs';
import React, {useEffect, useMemo, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {choices, trackPos} from './TableRules.mjs';

const ludoArt = require('./assets/tables37/ludo-inlay.jpg');
const jackarooArt = require('./assets/tables37/jackaroo-walnut.jpg');
const seats = [
  {color:'#C94E43', shadow:'#7C2D29', light:'#FB9C83', name:'الأحمر'},
  {color:'#188873', shadow:'#0F5048', light:'#7FD5AA', name:'الأخضر'},
  {color:'#DCA73C', shadow:'#865C20', light:'#FFE49A', name:'الذهبي'},
  {color:'#426EB4', shadow:'#293E73', light:'#A3C9F4', name:'الأزرق'},
];
const arabic = ['١', '٢', '٣', '٤'];

// Coordinates follow the printed route clockwise, starting at the first seat's entrance.
const ludoQuarter = [[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0]];
const jackarooQuarter = [
  [.500,.108],[.545,.108],[.590,.108],[.635,.108],[.680,.108],[.725,.108],
  [.770,.113],[.812,.127],[.848,.150],[.875,.185],[.888,.230],[.892,.275],
  [.892,.320],[.892,.365],[.892,.410],[.892,.455],
];
const ludoGrid = (x,y) => [.032 + x*.936/15, .032 + y*.936/15];

function rotate([x,y], quarter){
  switch(quarter){
    case 1: return [1-y,x];
    case 2: return [1-x,1-y];
    case 3: return [y,1-x];
    default: return [x,y];
  }
}
function corner(g,seat){
  return g.kind==='ludo' && g.count===2 ? seat*2 : seat;
}
export function colorForSeat(game,seat){
  return seats[corner(game,seat)]?.color;
}
function spot(g, seat, piece, progress){
  const c=corner(g,seat);
  const ludo=g.kind==='ludo';
  if(progress<0){
    return rotate(ludo ? ludoGrid(1.95+2.10*(piece%2),1.95+2.10*Math.floor(piece/2))
      : [.669+.069*(piece%2),.234+.065*Math.floor(piece/2)], c);
  }
  const home=ludo ? 51 : 64;
  if(progress>=home){
    return rotate(ludo ? ludoGrid(1.5+progress-home,7.5) : [.455,.183+(progress-home)*.055], c);
  }
  const index=trackPos(g,seat,progress);
  if(!ludo) return rotate(jackarooQuarter[index%16], Math.floor(index/16));
  const [x,y]=ludoQuarter[index%13];
  return rotate(ludoGrid(x+.5,y+.5),Math.floor(index/13));
}
function activeSeat(game){
  return game.kind==='jackaroo' && game.pieces[game.turn].every(p=>p>=64) ? (game.turn+2)%4 : game.turn;
}
function destinations(game, moveId, seat){
  if(!moveId) return [];
  const [value,type,first,second,amount]=moveId.split('/');
  const piece=Number(first), target=Number(second);
  if(type==='x') return [spot(game,target,Number(amount),game.pieces[target][Number(amount)])];
  if(type==='d') return [spot(game,seat,piece,0)];
  if(type==='s') return [spot(game,seat,piece,game.pieces[seat][piece]+Number(amount)),
    spot(game,seat,target,game.pieces[seat][target]+7-Number(amount))];
  if(type!=='m') return [];
  const delta=game.kind==='jackaroo' && value==='4' ? -4 : Number(value);
  const next=game.pieces[seat][piece]+delta;
  return [spot(game,seat,piece,next<0?(next+64)%64:next)];
}
function tokenGroups(game){
  const clusters=new Map();
  game.pieces.forEach((pieces,seat)=>pieces.forEach((progress,piece)=>{
    const [x,y]=spot(game,seat,piece,progress);
    const key=Math.round(x*10000)+'/'+Math.round(y*10000);
    if(!clusters.has(key)) clusters.set(key,{key,x,y,pieces:[]});
    clusters.get(key).pieces.push({seat,piece,progress});
  }));
  return [...clusters.values()];
}
const disk = (size,color) => ({width:size,height:size,borderRadius:size/2,backgroundColor:color});
function Piece({tone,diameter:d,piece,selected,available,stacked}){
  return <View pointerEvents="none" style={[disk(d,selected?'#F9DD88':available?'#FCF2CE':tone.shadow),s.center,{
    borderColor:selected?'#6A4A24':available?'#836641':'#523E31',borderWidth:available||selected?1.15:.7,
  }]}>
    <View style={[disk(d*.85,tone.shadow),s.center]}>
      <View style={[disk(d*.73,tone.color),s.center,{marginTop:-d*.065,borderWidth:.6,borderColor:tone.light}]}>
        <View style={[s.specular,{width:d*.27,height:d*.09,left:d*.11,top:d*.07,backgroundColor:tone.light}]}/>
        <Text allowFontScaling={false} style={[s.numeral,{fontSize:d*.48,lineHeight:d*.60,color:'#FFFAEE'}]}>{arabic[piece]}</Text>
      </View>
    </View>
    {stacked>1&&<View style={[s.counter,s.center,{right:-d*.25,top:-d*.22,minWidth:d*.64,height:d*.64,borderRadius:d*.32}]}>
      <Text allowFontScaling={false} style={[s.count,{fontSize:Math.max(8,d*.38)}]}>{stacked}</Text>
    </View>}
  </View>;
}

// A stack of identical square positions opens large, individually labeled selectors.
export function Board({game,onPiece,legalOptions,selectedPiece=null,hintOption=null}){
  const {width}=useWindowDimensions();
  const [size,setSize]=useState(0),[open,setOpen]=useState(null);
  const ludo=game.kind==='ludo',seat=activeSeat(game);
  const groups=useMemo(()=>tokenGroups(game),[game]);
  const options=useMemo(()=>legalOptions??choices(game),[legalOptions,game]);
  const selectable=new Set(options.map(o=>o.id.split('/')[2]).filter(i=>i!==undefined).map(Number));
  const permitted=p=>!!onPiece && p.seat===seat && selectable.has(p.piece);
  const owner=seats[corner(game,seat)];
  const pixels=size||Math.min(520,Math.max(1,width-56));
  const hint=typeof hintOption==='string'?hintOption:hintOption?.id;
  const targets=options.some(o=>o.id===hint)?destinations(game,hint,seat):[];
  const stack=groups.find(g=>g.key===open && g.pieces.filter(permitted).length>1);
  useEffect(()=>{setOpen(null);},[game.turn,game.die,game.note,game.winner]);
  function label(p){
    return appText('الحجر')+' '+appText(seats[corner(game,p.seat)].name)+' '+String(p.piece+1)+(p.progress<0?' '+appText('في القاعدة'):'');
  }
  function select(p){
    setOpen(null);
    onPiece?.(p.seat,p.piece);
  }
  return <View style={s.container}>
    <View style={s.frame} onLayout={event=>{const w=event.nativeEvent.layout.width;if(w>0)setSize(w);}}>
      <Image accessible={false} source={ludo?ludoArt:jackarooArt} resizeMode="stretch" style={s.art}/>
      {groups.map(group=>{
        const legal=group.pieces.filter(permitted);
        const selected=group.pieces.find(p=>p.seat===seat && p.piece===selectedPiece);
        const top=selected||legal[0]||group.pieces[0], tone=seats[corner(game,top.seat)];
        const d=pixels*(ludo ? (top.progress<0?.089:.060) : (top.progress<0?.061:.044));
        const target=Math.max(ludo?.062*pixels:.046*pixels,d);
        const pos={left:group.x*pixels-target/2,top:group.y*pixels-target/2,width:target,height:target};
        const glyph=<Piece tone={tone} diameter={d} piece={top.piece} stacked={group.pieces.length}
          available={legal.length>0} selected={!!selected}/>;
        if(!legal.length)return <View key={group.key} accessible accessibilityLabel={label(top)} pointerEvents="none" style={[s.spot,pos]}>{glyph}</View>;
        return <Pressable key={group.key} accessibilityRole="button" accessibilityState={{selected:!!selected,expanded:legal.length>1?open===group.key:undefined}}
          accessibilityLabel={legal.length>1?appText('اختيار حجر من ')+legal.length+appText(' أحجار في الخانة'):label(legal[0])}
          onPress={()=>legal.length===1?select(legal[0]):setOpen(old=>old===group.key?null:group.key)}
          style={[s.spot,pos,{zIndex:2}]}>{glyph}</Pressable>;
      })}
      {targets.map(([x,y],i)=>{
        const d=pixels*(ludo?.050:.041);
        return <View key={'hint'+i} pointerEvents="none" style={[s.destination,{left:x*pixels-d/2,top:y*pixels-d/2,width:d,height:d,borderRadius:d/2}]}/>;
      })}
    </View>
    {stack&&<View style={s.stackChoices}>
      {stack.pieces.filter(permitted).map(p=><Pressable key={p.piece} accessibilityRole="button" accessibilityLabel={label(p)}
        accessibilityState={{selected:selectedPiece===p.piece}} onPress={()=>select(p)} style={s.stackButton}>
        <Piece tone={owner} diameter={22} piece={p.piece} available selected={selectedPiece===p.piece}/>
        <Text style={s.stackText}>{appText('حجر ')+arabic[p.piece]}</Text>
      </Pressable>)}
    </View>}
  </View>;
}
export const RaceBoard=Board;
const s=StyleSheet.create({
  container:{width:'100%',maxWidth:520,alignSelf:'center',gap:8},
  frame:{position:'relative',width:'100%',aspectRatio:1,direction:'ltr',borderRadius:12,overflow:'hidden',backgroundColor:'#493828'},
  art:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},
  spot:{position:'absolute',justifyContent:'center',alignItems:'center'},
  center:{justifyContent:'center',alignItems:'center'},
  specular:{position:'absolute',borderRadius:20,opacity:.82,transform:[{rotate:'-24deg'}]},
  numeral:{fontWeight:'900',textAlign:'center',includeFontPadding:false,textShadowColor:'#493521',textShadowOffset:{width:0,height:1},textShadowRadius:1},
  counter:{position:'absolute',backgroundColor:'#2E2825',borderWidth:.8,borderColor:'#EFD6A7'},
  count:{fontWeight:'800',color:'#FFF2D8',includeFontPadding:false},
  destination:{position:'absolute',borderWidth:2.5,borderColor:'#FFF4BC',backgroundColor:'rgba(245,202,97,.27)',zIndex:3},
  stackChoices:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',flexWrap:'wrap',gap:6},
  stackButton:{flexDirection:'row-reverse',gap:6,alignItems:'center',minHeight:44,paddingHorizontal:10,backgroundColor:'#3A3933',borderColor:'#9E8F74',borderWidth:1,borderRadius:10},
  stackText:{fontWeight:'700',fontSize:13,color:'#FBF3DF'},
});
