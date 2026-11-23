import React,{useEffect,useState} from 'react';
import {Pressable,Text,View,useWindowDimensions} from 'react-native';
import {trackPos} from './TableRules.mjs';
import {pockets,simulate} from './PoolRules.mjs';

const enamel=['#B93A36','#21785D','#DCAD34','#4067A5'];
const pigments=['#284D76','#E2AC26','#254684','#C6453B','#68598C','#C9893A','#40845F','#934140','#24272C'];
const ring=[[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]];
function rotate(x,y,k){for(let i=0;i<k;i++)[x,y]=[14-y,x];return [x,y];}
function circle(x,y,rad){return {position:'absolute',left:x-rad,top:y-rad,width:2*rad,height:2*rad,borderRadius:rad};}
function marble(key,x,y,r,color,text,onPress){
  const style=[circle(x,y,r),{backgroundColor:color,borderColor:'#E6C078',borderWidth:1,alignItems:'center',justifyContent:'center'}];
  const body=<><View style={[circle(r*.64,r*.45,r*.24),{backgroundColor:'rgba(255,255,255,.54)'}]}/><Text style={{color:'white',fontSize:Math.max(8,r*1.14),fontWeight:'bold',textShadowColor:'#291F1B',textShadowRadius:2}}>{text}</Text></>;
  return onPress?<Pressable key={key} accessibilityRole="button" accessibilityLabel={'حجر '+text} onPress={onPress} style={style}>{body}</Pressable>:<View key={key} style={style}>{body}</View>;
}
export function Board({game:g,onPiece}){
  const {width}=useWindowDimensions(),side=Math.min(374,Math.max(190,width-58)),ludo=g.kind==='ludo';
  const cell=side/15,at=([x,y])=>[(x+.5)*cell,(y+.5)*cell];
  const polar=(i,r)=>{const angle=Math.PI*(i/32-.5);return [side*(.5+r*Math.cos(angle)),side*(.5+r*Math.sin(angle))];};
  const nodes=[];
  function tile(k,x,y,c){nodes.push(<View key={k} style={{position:'absolute',left:x*cell,top:y*cell,width:cell,height:cell,borderWidth:.5,borderColor:'#B9A984',backgroundColor:c}}/>);}
  function hole(k,pos,r,color){nodes.push(<View key={k} style={[circle(...pos,r),{borderWidth:1,borderColor:'#A87E4E',backgroundColor:color}]}/>);}
  const base=(color,i)=>ludo?at(rotate(1.6+i%2*2.35,1.6+Math.floor(i/2)*2.35,color)):
    polar(color*16+(i%2?1.65:-1.65)+6,.23+.075*Math.floor(i/2));
  if(ludo){
    for(let c=0;c<4;c++){
      const [x,y]=[[0,0],[9,0],[9,9],[0,9]][c];
      nodes.push(<View key={'base'+c} style={{position:'absolute',left:x*cell,top:y*cell,width:cell*6,height:cell*6,borderRadius:cell*.35,backgroundColor:enamel[c],borderWidth:2,borderColor:'#D6B883'}}/>);
      for(let i=0;i<4;i++)hole('b'+c+i,base(c,i),cell*.65,'#F1E2CC');
    }
    ring.forEach(([x,y],i)=>tile('r'+i,x,y,i%13===0?enamel[i/13]:i%13===8?'#D3C59C':'#F3E9D3'));
    for(let c=0;c<4;c++)for(let i=0;i<6;i++)tile('h'+c+i,...rotate(1+i,7,c),enamel[c]);
    nodes.push(<View key="center" style={[circle(side/2,side/2,cell*.61),{backgroundColor:'#A7834D',borderColor:'#F5D599',borderWidth:2}]}/>);
  }else{
    for(let i=0;i<64;i++)hole('t'+i,polar(i,.443),side*.015,i%16===0?enamel[i/16]:'#2E211C');
    for(let c=0;c<4;c++)for(let i=0;i<4;i++){
      hole('b'+c+i,base(c,i),side*.027,'#30231C');hole('h'+c+i,polar(c*16-1,.375-i*.056),side*.02,enamel[c]);
    }
    nodes.push(<Text key="brand" style={{position:'absolute',top:'47%',width:'100%',textAlign:'center',fontSize:16,letterSpacing:2,color:'#DEC291',fontWeight:'600'}}>CLIPI</Text>);
  }
  const placed=new Map();
  g.pieces.forEach((pieces,s)=>pieces.forEach((p,i)=>{
    const c=ludo&&g.count===2?s*2:s;
    let xy;
    if(p<0)xy=base(c,i);
    else if(ludo)xy=p<51?at(ring[trackPos(g,s,p)]):at(rotate(1+p-51,7,c));
    else xy=p<64?polar(trackPos(g,s,p),.443):polar(c*16-1,.375-(p-64)*.056);
    const key=xy.join('/'),stack=placed.get(key)||0;placed.set(key,stack+1);
    nodes.push(marble('m'+s+i,xy[0]+stack*2,xy[1]+stack*2,side*(ludo?.029:.0255),enamel[c],i+1,()=>onPiece?.(s,i)));
  }));
  return <View style={{alignSelf:'center',padding:5,backgroundColor:'#62412C',borderRadius:11,borderWidth:2,borderColor:'#AC895A'}}><View style={{width:side,height:side,backgroundColor:ludo?'#C7A87A':'#614331',borderRadius:5}}>{nodes}</View></View>;
}
export function PoolBoard({game,angle,placing,onPoint}){
  const {width,height}=useWindowDimensions(),unit=Math.min((width-68)/100,Math.max(1.25,height*.50/176),3);
  const [frame,setFrame]=useState(null),shot=game.shot;
  const previous=React.useRef(shot?.number||0);
  useEffect(()=>{
    if(!shot||shot.number===previous.current)return;
    previous.current=shot.number;
    const {frames}=simulate(shot.before,shot.angle,shot.power,true);
    let i=0;setFrame(frames[0]);
    const timer=setInterval(()=>{if(++i>=frames.length){clearInterval(timer);setFrame(null);}else setFrame(frames[i]);},18);
    return ()=>{clearInterval(timer);};
  },[shot?.number]);
  const balls=frame||game.balls,cue=balls.find(b=>!b.n);
  return <View style={{alignSelf:'center',borderWidth:5,borderColor:'#6A4935',backgroundColor:'#0E5D4D',borderRadius:8}}>
    <View style={{width:100*unit,height:176*unit,overflow:'hidden',borderRadius:3,backgroundColor:'#166957'}}>
      {pockets.map(([x,y],i)=><View key={i} style={[circle(x*unit,y*unit,6*unit),{backgroundColor:'#171D1A',borderWidth:1.5,borderColor:'#BB9E6B'}]}/>)}
      {!frame&&cue&&!placing&&Array.from({length:16},(_,i)=><View key={'aim'+i} style={[circle((cue.x+(5+i*2.65)*Math.cos(angle))*unit,(cue.y+(5+i*2.65)*Math.sin(angle))*unit,.46*unit),{backgroundColor:'rgba(251,249,224,.76)'}]}/>)}
      {balls.map(({n,x,y})=><View key={'ball'+n} style={[circle(x*unit,y*unit,2.6*unit),{backgroundColor:n===0||n>8?'#FFF8DE':pigments[n],borderWidth:.5,borderColor:'#333C32',alignItems:'center',justifyContent:'center',overflow:'hidden'}]}>
        {n>8&&<View style={{position:'absolute',width:'100%',height:'57%',backgroundColor:pigments[n-8]}}/>}
        {n>0&&<Text style={{fontSize:Math.max(5,unit*2.5),fontWeight:'900',color:n===8?'white':'#241C1C',backgroundColor:n===8?'transparent':'#F5ECD4',borderRadius:3}}>{n}</Text>}
        <View style={[circle(unit*1.25,unit,unit*.5),{backgroundColor:'rgba(255,255,255,.7)'}]}/>
      </View>)}
      <Pressable accessibilityRole="button" accessibilityLabel={placing?'تحديد مكان الكرة البيضاء':'توجيه العصا'} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}
        onPress={e=>{if(frame)return;const n=e.nativeEvent,rect=e.currentTarget?.getBoundingClientRect?.();
          const x=rect?(n.clientX-rect.left)/unit:n.locationX/unit,y=rect?(n.clientY-rect.top)/unit:n.locationY/unit;
          if(Number.isFinite(x)&&Number.isFinite(y))onPoint(x,y);
        }}/>
    </View>
  </View>;
}
