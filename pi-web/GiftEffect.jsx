import React,{useEffect,useRef} from 'react';
import {ui} from './interface-language.mjs';
import './gift-effect.css';

function Bloom({blue}){
  return <div className={'bloom'+(blue?' blue':'')}>
    <i className="stem"/><i className="leaf left"/><i className="leaf right"/>
    <div className="corolla">{[[-44,1.09], [44,1.09],[-31,.96],[31,.96],[-18,.82],[18,.82],[-7,.66],[7,.66]].map(([angle,size],i)=>
      <i key={i} className="petal" style={{'--angle':angle+'deg','--size':size,'--delay':(250+i*75)+'ms','--light':(60-i*2)+'%'}}/>)}</div>
    <i className="calyx"/>
  </div>;
}
function Bird({fire,duck}){
  return <div className={'bird-flight'+(fire?' fire':'')+(duck?' duck':'')}><div className="bird">
    <i className="far wing"/><i className="tail"/><i className="body"/><i className="head"/><i className="bill"/><i className="eye"/><i className="near wing"/>
  </div></div>;
}
// Motion, secondary objects and their movement follow the pictured gift.
const scenes={
  heart:['pulse','♥','rise'],kiss:['kiss','♡','drift'],clap:['clap','✦','pop'],
  candy:['twirl','✧','pop'],ice:['freeze','❄','fall'],cake:['present','🕯️','glow'],
  bear:['cuddle','♡','rise'],treasure:['open','🪙','pop'],gold:['jingle','🪙','fall'],
  magic:['cast','✦','drift'],crown:['crown','✧','glow'],ring:['jewel','✦','glow'],
  fairy:['hover','✨','fall'],castle:['build','☁','drift'],rocket:['launch','🔥','exhaust'],
  spaceship:['orbit','✧','drift'],helicopter:['hover','☁','drift'],plane:['fly','☁','drift'],
  car:['drive','💨','exhaust'],dragon:['swoop','🔥','breath'],robot:['march','⚡','pop'],
  cat:['pounce','✧','glow'],animal:['hop','🌿','pop'],party:['bounce','🎊','fall'],
  flower:['unfold','🌸','fall'],fruit:['pour','💧','fall'],dance:['dance','♫','rise'],
  water:['recoil','💧','breath'],money:['float','🪙','fall'],meteor:['drop','✨','exhaust'],
  space:['float','✧','drift'],flag:['wave','',''],dinner:['present','♨','rise'],
  bundle:['open','🎀','pop'],perfume:['spritz','✧','breath'],smoke:['float','☁','rise'],
  butterfly:['flutter','✧','drift'],gem:['jewel','✧','glow']
};
export default function GiftEffect({gift,onDone}){
  const finish=useRef(onDone);finish.current=onDone;
  useEffect(()=>{const timer=setTimeout(()=>finish.current(),3600);return()=>clearTimeout(timer)},[gift]);
  const [icon,name,,kind]=gift;
  const [motion,particle,trail]=scenes[kind]||['present','✦','glow'];
  return <div className="gift-theatre"><div className="gift-stage">
    {kind==='rose'?<Bloom blue={icon==='💙'}/>:kind==='phoenix'||kind==='duck'?<Bird fire={icon==='🔥'} duck={kind==='duck'}/>:<div className={'gift-object m-'+motion}>
      <span>{icon}</span>{particle&&[0,1,2].map(i=><i key={i} className={'trail t-'+trail} style={{'--i':i,'--x':(i-1)*34+'px'}}>{particle}</i>)}
    </div>}
    <div className="gift-caption">{ui(name)}</div>
  </div></div>;
}
