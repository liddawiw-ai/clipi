import {ui as appText} from './interface-language.mjs';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {choices, trackPos} from './TableRules.mjs';

import {LudoBoardArt} from './ClipiLudoArt';
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
function Piece({tone,diameter:d,piece,selected,available,stacked,sculpted=false}){
  if(sculpted)return <View pointerEvents="none" style={{width:d,height:d,position:'relative'}}><div style={{position:'absolute',inset:'-32% -5% -12%',pointerEvents:'none'}}><svg viewBox="0 0 100 138" width="100%" height="100%" aria-hidden="true"><ellipse cx="50" cy="119" rx="39" ry="13" fill="#000" opacity=".35"/><ellipse cx="50" cy="110" rx="42" ry="18" fill={selected||available?'#ffe58a':tone.shadow}/><ellipse cx="50" cy="105" rx="36" ry="14" fill={tone.color} stroke={tone.light} strokeWidth="3"/><path d="M20 99 Q35 80 39 54 Q50 46 61 54 Q65 80 80 99 Q50 117 20 99Z" fill={tone.color} stroke={tone.shadow} strokeWidth="2"/><path d="M29 97 Q43 76 44 55 L50 55 Q47 80 42 102Z" fill={tone.light} opacity=".65"/><circle cx="50" cy="36" r="28" fill={tone.shadow}/><circle cx="48" cy="31" r="25" fill={tone.color}/><ellipse cx="39" cy="20" rx="11" ry="7" fill={tone.light}/><ellipse cx="35" cy="17" rx="5" ry="3" fill="#fff" opacity=".8"/><text x="50" y="42" fontSize="22" fontWeight="900" fill="white" textAnchor="middle">{piece+1}</text></svg></div>{stacked>1&&<View style={[s.counter,s.center,{right:-d*.25,top:-d*.22,minWidth:d*.64,height:d*.64,borderRadius:d*.32}]}><Text style={[s.count,{fontSize:Math.max(8,d*.38)}]}>{stacked}</Text></View>}</View>;
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
export function Board({game,onPiece,legalOptions,selectedPiece=null,hintOption=null,theme}){
  const {width}=useWindowDimensions();
  const [size,setSize]=useState(0),[open,setOpen]=useState(null),[motion,setMotion]=useState([]);
  const previous=useRef(game);
  useEffect(()=>{
    const old=previous.current;previous.current=game;
    if(old.kind!==game.kind||old.count!==game.count||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const changed=[];
    game.pieces.forEach((row,seat)=>row.forEach((p,piece)=>{
      const before=old.pieces[seat][piece];if(before===p)return;
      const route=[spot(old,seat,piece,before)];
      if(before>=0&&p>before&&p-before<=13){for(let step=before+1;step<=p;step++)route.push(spot(game,seat,piece,step));}
      else route.push(spot(game,seat,piece,p));
      changed.push({seat,piece,route});
    }));
    if(!changed.length){setMotion([]);return;}
    setMotion(changed);const timer=setTimeout(()=>setMotion([]),480);return()=>clearTimeout(timer);
  },[game]);
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
    <View style={[s.frame,theme&&{outlineStyle:'solid',outlineWidth:3,outlineColor:theme.color}]} onLayout={event=>{const w=event.nativeEvent.layout.width;if(w>0)setSize(w);}}>
      {ludo?<LudoBoardArt/>:<Image accessible={false} source={jackarooArt} resizeMode="stretch" style={s.art}/>}
      {groups.map(group=>{
        const legal=group.pieces.filter(permitted);
        const selected=group.pieces.find(p=>p.seat===seat && p.piece===selectedPiece);
        const top=selected||legal[0]||group.pieces[0], tone=seats[corner(game,top.seat)];
        const d=pixels*(ludo ? (top.progress<0?.089:.060) : (top.progress<0?.061:.044));
        const target=Math.max(ludo?.062*pixels:.046*pixels,d);
        const pos={left:group.x*pixels-target/2,top:group.y*pixels-target/2,width:target,height:target};
        const moving=motion.some(m=>m.seat===top.seat&&m.piece===top.piece);
        const glyph=<Piece sculpted={ludo} tone={tone} diameter={d} piece={top.piece} stacked={group.pieces.length}
          available={legal.length>0} selected={!!selected}/>;
        if(!legal.length)return <View key={group.key} accessible accessibilityLabel={label(top)} pointerEvents="none" style={[s.spot,pos,moving&&group.pieces.length===1&&{opacity:0}]}>{glyph}</View>;
        return <Pressable key={group.key} accessibilityRole="button" accessibilityState={{selected:!!selected,expanded:legal.length>1?open===group.key:undefined}}
          accessibilityLabel={legal.length>1?appText('اختيار حجر من ')+legal.length+appText(' أحجار في الخانة'):label(legal[0])}
          onPress={()=>legal.length===1?select(legal[0]):setOpen(old=>old===group.key?null:group.key)}
          style={[s.spot,pos,{zIndex:2},moving&&group.pieces.length===1&&{opacity:0}]}>{glyph}</Pressable>;
      })}
      {motion.map(({seat,piece,route})=><MotionPawn key={seat+'/'+piece} {...{seat,piece,route,game,pixels}}/>)}
      {targets.map(([x,y],i)=>{
        const d=pixels*(ludo?.050:.041);
        return <View key={'hint'+i} pointerEvents="none" style={[s.destination,{left:x*pixels-d/2,top:y*pixels-d/2,width:d,height:d,borderRadius:d/2}]}/>;
      })}
    </View>
    {stack&&<View style={s.stackChoices}>
      {stack.pieces.filter(permitted).map(p=><Pressable key={p.piece} accessibilityRole="button" accessibilityLabel={label(p)}
        accessibilityState={{selected:selectedPiece===p.piece}} onPress={()=>select(p)} style={s.stackButton}>
        <Piece sculpted={ludo} tone={owner} diameter={22} piece={p.piece} available selected={selectedPiece===p.piece}/>
        <Text style={s.stackText}>{appText('حجر ')+arabic[p.piece]}</Text>
      </Pressable>)}
    </View>}
  </View>;
}
function MotionPawn({seat,piece,route,game,pixels}){
  const node=useRef(null);
  useEffect(()=>{
    if(!node.current?.animate)return;
    const animation=node.current.animate(route.map(([x,y])=>({transform:'translate('+x*pixels+'px,'+y*pixels+'px)'})),{duration:420,easing:'ease-out',fill:'forwards'});
    return()=>animation.cancel();
  },[route,pixels]);
  const d=pixels*(game.kind==='ludo'?.060:.044);
  return <div ref={node} aria-hidden="true" style={{position:'absolute',left:-d/2,top:-d/2,zIndex:5,pointerEvents:'none'}}><Piece sculpted={game.kind==='ludo'} tone={seats[corner(game,seat)]} diameter={d} piece={piece}/></div>;
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
