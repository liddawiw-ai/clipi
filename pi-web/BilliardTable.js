import {ui as appText} from './interface-language.mjs';
import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {ballRadius, pockets, replayShot, tableHeight, tableWidth} from './PoolRules.mjs';

import {matterLicense} from './vendor/matter-js/notice.mjs';

const rails = 6;
const visualBallScale=1.10;
const palette = ['#fff4dc', '#f8c544', '#3275b6', '#d84d42', '#8353a0', '#ef8840', '#34855c', '#923c4a', '#182028'];
const light = '#f6f1dd';
const gold = '#edc784';
const clamp = (n, low, high) => Math.max(low, Math.min(n, high));
const circle = (x, y, r) => ({position:'absolute', left:x-r, top:y-r, width:r*2, height:r*2, borderRadius:r});
const rect = (x, y, width, height) => ({position:'absolute', left:x, top:y, width, height});

function stroke(x1, y1, x2, y2, width, color) {
  const length = Math.hypot(x2-x1, y2-y1);
  return {...rect((x1+x2-length)/2, (y1+y2-width)/2, length, width), backgroundColor:color, borderRadius:width/2,
    transform:[{rotate:Math.atan2(y2-y1, x2-x1)+'rad'}]};
}

// Find where a moving ball's centre reaches a circular pocket or a stationary ball.
function rayCircle(cue, dx, dy, x, y, radius) {
  const ox = x-cue.x, oy = y-cue.y, projection = ox*dx+oy*dy;
  if (projection < 0) return Infinity;
  const perpendicular = Math.abs(ox*dy-oy*dx);
  if (perpendicular > radius) return Infinity;
  return Math.max(0, projection-Math.sqrt(radius*radius-perpendicular*perpendicular));
}

function aimGeometry(cue, balls, angle, power) {
  const dx = Math.cos(angle), dy = Math.sin(angle), r = ballRadius;
  const tx = Math.abs(dx)<1e-8 ? Infinity : ((dx>0?tableWidth-r:r)-cue.x)/dx;
  const ty = Math.abs(dy)<1e-8 ? Infinity : ((dy>0?tableHeight-r:r)-cue.y)/dy;
  const reach = Math.max(0, (.3+power*.039-.035)/.009);
  let distance = Math.min(Math.max(0, Math.min(tx, ty)), reach), target = null;
  let kind = distance<reach ? 'rail' : 'end';
  for (const ball of balls) {
    if (!ball.n) continue;
    const contact = rayCircle(cue, dx, dy, ball.x, ball.y, r*2);
    if (contact < distance) { distance=contact; target=ball; kind='ball'; }
  }
  for (const [x, y] of pockets) {
    const entry = rayCircle(cue, dx, dy, x, y, 5.9);
    if (entry < distance) { distance=entry; target=null; kind='pocket'; }
  }
  const x = cue.x+dx*distance, y = cue.y+dy*distance;
  let extension = null;
  if (target) {
    const factor = 12/(Math.hypot(target.x-x, target.y-y)||1);
    extension = [target.x, target.y, target.x+(target.x-x)*factor, target.y+(target.y-y)*factor];
  } else if (kind==='rail') {
    const reflectedX = tx<=ty ? -dx : dx, reflectedY = ty<=tx ? -dy : dy;
    const length = Math.min(12, reach-distance);
    extension = [x, y, x+length*reflectedX, y+length*reflectedY];
  }
  return {x, y, dx, dy, distance, kind, extension};
}

const TableSurface = memo(function TableSurface({unit:u,theme}) {
  const w=(tableWidth+2*rails)*u, h=(tableHeight+2*rails)*u;
  const marks=[];
  const inlay=(key,x,y)=>marks.push(<View key={key} style={[rect((x+rails)*u-.51*u,(y+rails)*u-.51*u,1.02*u,1.02*u),{backgroundColor:'#e2c992',transform:[{rotate:'45deg'}]}]}/>);
  for (const x of [25,50,75]) for (const y of [-3,179]) inlay('h'+x+'/'+y,x,y);
  for (const x of [-3,103]) for (const y of [22,44,66,110,132,154]) inlay('v'+x+'/'+y,x,y);
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill,{direction:'ltr'}]}>
    <View style={[rect(0,0,w,h),{borderRadius:6*u,backgroundColor:'#16171b',borderWidth:1.1*u,borderColor:'#b9a9a2'}]}/>
    <View style={[rect(1.15*u,1.15*u,w-2.3*u,h-2.3*u),{borderRadius:4.8*u,borderWidth:.5*u,borderColor:'#b5a49c'}]}/>
    <View style={[rect((rails-1.45)*u,(rails-1.45)*u,(tableWidth+2.9)*u,(tableHeight+2.9)*u),{borderRadius:2*u,backgroundColor:'#400b0e'}]}/>
    <View style={[rect(rails*u,rails*u,tableWidth*u,tableHeight*u),{backgroundColor:theme?.color||'#a20d19'}]}/>
    <View style={[rect((rails+1.2)*u,(rails+1.2)*u,(tableWidth-2.4)*u,(tableHeight-2.4)*u),{borderWidth:.34*u,borderColor:'#d64a4d'}]}/>
    {[-1,1].map(s=><React.Fragment key={s}>
      {[7,95].map(y=><View key={y} style={[rect((s===-1?rails-1.2:rails+tableWidth-1.45)*u,(y+rails)*u,2.65*u,74*u),{backgroundColor:'#4b1015',borderColor:'#b84449',borderWidth:.25*u,borderRadius:1.25*u}]}/>)}
      <View style={[rect((rails+7)*u,(s===-1?rails-1.2:rails+tableHeight-1.45)*u,86*u,2.65*u),{backgroundColor:'#4b1015',borderColor:'#b84449',borderWidth:.25*u,borderRadius:1.25*u}]}/>
    </React.Fragment>)}
    <View style={[stroke((rails+4)*u,(rails+133)*u,(rails+96)*u,(rails+133)*u,.24*u,'rgba(216,239,217,.18)')]}/>
    {[49,134].map(y=><View key={y} style={[circle((rails+50)*u,(rails+y)*u,.6*u),{backgroundColor:'#9dbbad'}]}/>)}
    {pockets.map(([x,y],i)=><React.Fragment key={i}>
      <View style={[circle((rails+x)*u,(rails+y)*u,5.1*u),{backgroundColor:'#73131a',borderWidth:.38*u,borderColor:'#c4b5b4'}]}/>
      <View style={[circle((rails+x)*u,(rails+y)*u,4.25*u),{backgroundColor:'#100b0d',borderWidth:.55*u,borderColor:'#391015'}]}/>
      <View style={[circle((rails+x)*u,(rails+y+.62)*u,3.05*u),{backgroundColor:'#050406'}]}/>
    </React.Fragment>)}
    {marks}
  </View>;
});

const BallFace=memo(function BallFace({n,unit:u}) {
  const diameter=2*ballRadius*u*visualBallScale, pigment=palette[n>8?n-8:n];
  return <>
    <View style={[rect(0,0,diameter,diameter),{borderRadius:diameter/2,overflow:'hidden',alignItems:'center',justifyContent:'center',
      backgroundColor:n>8?'#f6efdb':pigment,borderColor:'#322128',borderWidth:.16*u,backgroundImage:'radial-gradient(circle at 28% 20%, rgba(255,255,255,.65), transparent 30%), radial-gradient(circle at 65% 85%, rgba(0,0,0,.42), transparent 68%)'}]}>
      {n>8&&<View style={[rect(0,diameter*.22,diameter,diameter*.56),{backgroundColor:pigment,transform:[{rotate:'-16deg'}]}]}/>}
      {n>0&&<View style={{width:diameter*.55,height:diameter*.55,borderRadius:diameter/2,backgroundColor:'#faf1dc',alignItems:'center',justifyContent:'center'}}>
        <Text allowFontScaling={false} style={{fontWeight:'900',fontSize:diameter*.39,lineHeight:diameter*.52,color:'#1d2528',includeFontPadding:false}}>{n}</Text>
      </View>}
      <View style={[circle(diameter*.29,diameter*.22,diameter*.093),{backgroundColor:'rgba(255,255,255,.83)'}]}/>
    </View>
  </>;
});

function Aim({balls,cue,angle,power,unit:u}) {
  const aim=aimGeometry(cue,balls,angle,power);
  const line=(x1,y1,x2,y2,width,color)=>stroke(x1*u,y1*u,x2*u,y2*u,width*u,color);
  const cuePoint=distance=>[cue.x-aim.dx*distance,cue.y-aim.dy*distance];
  const gap=4.5+power*.18;
  const grip=cuePoint(gap+33),join=cuePoint(gap+13),tip=cuePoint(gap),chalk=cuePoint(gap-.65);
  const startX=cue.x+aim.dx*ballRadius,startY=cue.y+aim.dy*ballRadius;
  return <>
    {aim.distance>ballRadius&&<View style={line(startX,startY,aim.x,aim.y,.36,'rgba(241,255,233,.78)')}/>}
    {aim.kind==='ball'&&<View style={[circle(aim.x*u,aim.y*u,ballRadius*u),{borderWidth:.5*u,borderColor:'#ecdcac',backgroundColor:'rgba(237,222,181,.1)'}]}/>}
    {!!aim.extension&&<View style={line(...aim.extension,.54,aim.kind==='ball'?'#ead39a':'#9fcbc0')}/>}
    <View style={line(...grip,...join,1.46,'#462826')}/>
    <View style={line(...cuePoint(gap+25),...join,.94,'#aa6c42')}/>
    <View style={line(...join,...tip,1.04,'#e6c699')}/>
    <View style={line(...cuePoint(gap+1.3),...tip,.91,'#f9ead3')}/>
    <View style={line(...tip,...chalk,.82,'#75bed2')}/>
  </>;
}

function Control({label,children,onPress,disabled,active,wide}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{disabled:!!disabled}} disabled={disabled} onPress={onPress}
    style={({pressed})=>[styles.control,wide&&styles.wide,active&&styles.active,disabled&&styles.disabled,pressed&&styles.pressed]}>
    <Text style={[styles.controlText,active&&{color:'#15392f'}]}>{children??label}</Text>
  </Pressable>;
}

function localPoint(event) {
  const node=event.currentTarget, native=event.nativeEvent;
  const box=node?.getBoundingClientRect?.();
  if (box&&Number.isFinite(native.clientX)&&Number.isFinite(native.clientY)) return [native.clientX-box.left,native.clientY-box.top];
  return [native.locationX,native.locationY];
}

function Power({value,setValue,disabled}) {
  const [width,setWidth]=useState(1);
  const update=event=>{
    const [x]=localPoint(event);
    if (Number.isFinite(x)) setValue(clamp(Math.round(x/width*100),1,100));
  };
  return <View style={styles.powerRow}>
    <Text style={styles.powerCaption}>{appText("قوة الضربة")}</Text>
    <View accessible accessibilityRole="adjustable" accessibilityLabel={appText("قوة الضربة")}
      accessibilityValue={{min:1,max:100,now:value,text:value+'٪'}} accessibilityState={{disabled}}
      accessibilityActions={[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={e=>{
        if (!disabled) setValue(clamp(value+(e.nativeEvent.actionName==='increment'?5:-5),1,100));
      }} onLayout={e=>setWidth(Math.max(1,e.nativeEvent.layout.width))}
      onStartShouldSetResponder={()=>!disabled} onResponderGrant={update} onResponderMove={update}
      onResponderTerminationRequest={()=>false}
      style={styles.railTouch}>
      <View pointerEvents="none" style={styles.meter}>
        <View style={[styles.meterFill,{width:value+'%'}]}/>
        {[20,40,60,80].map(x=><View key={x} style={[styles.tick,{left:x+'%'}]}/>)}
      </View>
      <View pointerEvents="none" style={[styles.thumb,{left:clamp(width*value/100-6,0,Math.max(0,width-12))}]}/>
    </View>
    <Text style={styles.powerNumber}>{value}٪</Text>
  </View>;
}

function Remaining({balls,group}) {
  const count=group==='striped'?9:1,remaining=new Set(balls.map(b=>b.n));
  const numbers=Array.from({length:7},(_,i)=>i+count);
  return <View accessible accessibilityLabel={(group==='striped'?appText('المخططة'):appText('السادة'))+appText(' المتبقية ')+numbers.filter(n=>remaining.has(n)).length}
    style={styles.remaining}>
    <Text style={styles.group}>{group==='striped'?appText('المخططة'):appText('السادة')}</Text>
    <View style={styles.rack}>{numbers.map(n=><View key={n} style={[styles.rackBall,{opacity:remaining.has(n)?1:.17,backgroundColor:group==='striped'?'#f6eddb':palette[n]}]}>
      {group==='striped'&&<View style={{height:5,width:12,backgroundColor:palette[n-8]}}/>}
    </View>)}</View>
  </View>;
}

import {gameSound} from './GameAudio';

export default function BilliardTable({game, me, locked, send,theme}) {
  const screen=useWindowDimensions(), [available,setAvailable]=useState(null);
  const [angle,setAngle]=useState(-Math.PI/2),[power,setPower]=useState(82),[placing,setPlacing]=useState(false);
  const [frame,setFrame]=useState(null),timer=useRef(null),playback=useRef(false);
  const drag=useRef(null),[pulling,setPulling]=useState(false);
  const [showLicense,setShowLicense]=useState(false);
  const shot=game.shot,number=shot?.number||0,previous=useRef(number);
  const replay=useCallback(record=>{
    if (!record?.before) return;
    clearTimeout(timer.current);
    const {frames}=replayShot(record);
    playback.current=true;
    let i=0,lastCollision=-10;
    gameSound('shot');
    function step(){
      if (i>=frames.length) {playback.current=false;setFrame(null);return;}
      const next=frames[i],before=frames[i-1];
      if(before){
        if(next.length<before.length)gameSound('pocket');
        else if(i-lastCollision>5&&next.some((b,j)=>next.slice(j+1).some(a=>{
          const oldA=before.find(v=>v.n===a.n),oldB=before.find(v=>v.n===b.n);
          return oldA&&oldB&&Math.hypot(a.x-b.x,a.y-b.y)<ballRadius*2+.4&&Math.hypot(oldA.x-oldB.x,oldA.y-oldB.y)>ballRadius*2+.4;
        }))){gameSound('collision');lastCollision=i;}
      }
      setFrame(frames[i++]);timer.current=setTimeout(step,20);
    }
    step();
  },[]);
  useEffect(()=>{
    if (number!==previous.current) {
      previous.current=number;setPlacing(false);replay(shot);
    }
  },[number,replay,shot]);
  useEffect(()=>()=>{clearTimeout(timer.current);playback.current=false;},[]);
  useEffect(()=>{if(locked||!game.inHand)setPlacing(false);},[locked,game.inHand]);
  const balls=frame||game.balls,cue=balls.find(b=>!b.n);
  const disabled=!!locked||!!frame||game.winner!=null;
  const myTurn=game.turn===me&&game.winner==null;
  const canAim=!disabled&&myTurn;
  const maxHeight=Math.max(100,Math.min(760,screen.height-260));
  const u=Math.max(.1,Math.min(((available??Math.max(100,screen.width-16))-4)/(tableWidth+2*rails),maxHeight/(tableHeight+2*rails)));
  const point=(event,release=false)=>{
    if (!canAim||playback.current) return;
    const [px,py]=localPoint(event),x=px/u,y=py/u;
    if (!Number.isFinite(x)||!Number.isFinite(y))return;
    if (placing) {
      if (release) {send({type:'place',x,y});setPlacing(false);}
    } else if (cue&&Math.hypot(x-cue.x,y-cue.y)>.2) {
      setAngle(Math.atan2(y-cue.y,x-cue.x));
    }
  };
  function beginDrag(event){
    if(!canAim||playback.current)return;
    const [px,py]=localPoint(event),x=px/u,y=py/u;
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const dx=Math.cos(angle),dy=Math.sin(angle),rx=x-(cue?.x??0),ry=y-(cue?.y??0);
    const along=-(rx*dx+ry*dy),cross=Math.abs(rx*dy-ry*dx);
    const gap=4.5+power*.18;
    if(!placing&&cue&&along>=Math.max(0,gap-7)&&along<=gap+40&&cross<=Math.max(5,20/u)){
      drag.current={angle,x,y,power:0,number};setPulling(true);setPower(1);
    }else{drag.current=null;point(event);}
  }
  function moveDrag(event){
    if(!drag.current){point(event);return;}
    if(!canAim||playback.current){cancelDrag();return;}
    const [px,py]=localPoint(event),x=px/u,y=py/u,d=drag.current;
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const distance=-((x-d.x)*Math.cos(d.angle)+(y-d.y)*Math.sin(d.angle));
    d.power=clamp(Math.round(distance/28*100),0,100);setPower(Math.max(1,d.power));
  }
  function cancelDrag(){drag.current=null;setPulling(false);}
  function endDrag(event){
    if(!drag.current){point(event,true);return;}
    const d=drag.current;cancelDrag();
    if(canAim&&!playback.current&&d.number===number&&d.power>=5)send({type:'shot',angle:d.angle,power:d.power});
  }
  useEffect(()=>{if(!canAim||placing)cancelDrag();},[canAim,placing]);
  const group=game.groups?.[me];
  return <View style={styles.console} onLayout={e=>setAvailable(e.nativeEvent.layout.width-2)}>
    <View style={styles.inventory}>
      <Remaining balls={balls} group="solid"/><View style={styles.divider}/><Remaining balls={balls} group="striped"/>
    </View>
    <View style={{direction:'ltr',alignSelf:'center',width:(tableWidth+2*rails)*u,height:(tableHeight+2*rails)*u}}>
      <TableSurface unit={u} theme={theme}/>
      <View style={[rect(rails*u,rails*u,tableWidth*u,tableHeight*u),{direction:'ltr',overflow:'hidden'}]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {!frame&&cue&&canAim&&!placing&&<Aim {...{balls,cue,angle,power}} unit={u}/>}
          {balls.map(b=><View key={b.n} style={[circle(b.x*u,b.y*u,ballRadius*u*visualBallScale),{backgroundColor:'#3b0b13',shadowColor:'#160508',shadowOpacity:.55,shadowRadius:.45*u,shadowOffset:{width:.35*u,height:.65*u}}]}>
            <BallFace n={b.n} unit={u}/>
          </View>)}
          {placing&&cue&&<View style={[circle(cue.x*u,cue.y*u,4.8*u),{borderWidth:1.6,borderColor:gold}]}/>}
        </View>
        <View accessible={false} onStartShouldSetResponder={()=>canAim} onResponderGrant={beginDrag}
          onResponderMove={moveDrag} onResponderRelease={endDrag} onResponderTerminate={cancelDrag}
          onResponderTerminationRequest={()=>false} style={[StyleSheet.absoluteFill,{touchAction:'none'}]}/>
      </View>
    </View>
    <View style={styles.deck}>
      {!!group&&<Text style={styles.instruction}>{group==='striped'?appText('كراتك المخططة'):appText('كراتك السادة')}</Text>}
      {myTurn&&<>
        <Text style={styles.instruction}>{placing?appText('المس مكانًا خاليًا لوضع الكرة البيضاء'):(pulling?appText('قوة الضربة')+' '+power+'%':appText('المس القماش أو اسحب عليه لتوجيه العصا'))}</Text>
        <Power value={power} setValue={setPower} disabled={!canAim||placing}/>
        <View style={styles.actions}>
          <Control active wide label={appText("اضرب")} disabled={!canAim||placing||pulling||!cue} onPress={()=>send({type:'shot',angle,power})}/>
          <Control label={appText("تدوير العصا يمينًا درجة واحدة")} disabled={!canAim||placing} onPress={()=>setAngle(a=>a+Math.PI/180)}>↷ ١°</Control>
          <Control label={appText("تدوير العصا يسارًا درجة واحدة")} disabled={!canAim||placing} onPress={()=>setAngle(a=>a-Math.PI/180)}>١° ↶</Control>
        </View>
        {game.inHand&&<Control label={placing?appText('إلغاء تحريك الكرة البيضاء'):appText('تحريك الكرة البيضاء')} disabled={!canAim} onPress={()=>setPlacing(v=>!v)}/>}
      </>}
      {!!shot&&<Control label={appText("إعادة مشاهدة الضربة")} disabled={!!frame||placing} onPress={()=>replay(shot)}/>}
      <Pressable accessibilityRole="button" accessibilityLabel={appText("ترخيص محرك البلياردو Matter.js")} accessibilityState={{expanded:showLicense}}
        onPress={()=>setShowLicense(v=>!v)} style={{alignSelf:'center',paddingHorizontal:10,paddingVertical:7}}>
        <Text style={{color:'#b6d3c5',fontSize:12}}>Matter.js · MIT</Text>
      </Pressable>
      {showLicense&&<Text selectable style={{direction:'ltr',textAlign:'left',color:light,fontSize:13}}>{matterLicense}</Text>}
    </View>
  </View>;
}

const styles=StyleSheet.create({
  console:{backgroundColor:'#241015',borderColor:'#81534c',borderWidth:1,borderRadius:12,paddingHorizontal:1,paddingTop:4,paddingBottom:4,gap:4},
  inventory:{flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:15},
  remaining:{alignItems:'center',gap:3},group:{color:'#dbecdf',fontSize:12,fontWeight:'700'},
  rack:{flexDirection:'row',direction:'ltr',gap:3},rackBall:{width:10,height:10,borderRadius:5,alignItems:'center',justifyContent:'center',overflow:'hidden',borderWidth:.6,borderColor:'#b9be9d'},
  divider:{width:1,height:23,backgroundColor:'#406456'},deck:{gap:5,paddingHorizontal:5},instruction:{color:'#e3ecde',textAlign:'center',fontSize:13},
  powerRow:{flexDirection:'row-reverse',alignItems:'center',gap:12},powerCaption:{color:light,fontSize:13,fontWeight:'700'},powerNumber:{color:gold,textAlign:'center',fontSize:14,fontWeight:'800',minWidth:36},
  railTouch:{direction:'ltr',flex:1,height:38,justifyContent:'center',touchAction:'none'},meter:{height:9,backgroundColor:'#28483e',borderRadius:5,overflow:'hidden'},
  meterFill:{height:'100%',backgroundColor:'#e5ab43',backgroundImage:'linear-gradient(90deg,#38b66b,#e7c83a,#e46234)'},tick:{position:'absolute',top:1,bottom:1,width:1,backgroundColor:'#426354'},
  thumb:{width:12,height:19,position:'absolute',top:9,borderRadius:5,backgroundColor:'#f0d59b',borderWidth:1,borderColor:'#6f5c3b'},
  actions:{flexDirection:'row-reverse',gap:6},control:{minHeight:42,minWidth:47,paddingHorizontal:11,borderWidth:1,borderRadius:9,borderColor:'#487061',backgroundColor:'#173c32',alignItems:'center',justifyContent:'center'},
  controlText:{fontSize:14,fontWeight:'700',color:light,textAlign:'center'},wide:{flex:1},active:{backgroundColor:gold,borderColor:'#d8ae69'},
  disabled:{opacity:.45},pressed:{opacity:.73},
});
