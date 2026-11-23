import React from 'react';
import GiftMotion from './GiftMotion';
import {ui} from './interface-language.mjs';
import './gift-effect.css';
function Bird({fire,duck}){
  return <div className={'bird-flight'+(fire?' fire':'')+(duck?' duck':'')}><div className="bird">
    <i className="far wing"/><i className="tail"/><i className="body"/><i className="head"/><i className="bill"/><i className="eye"/><i className="near wing"/>
  </div></div>;
}

function renderBird(gift){
  if(gift[3]!=='phoenix'&&gift[3]!=='duck')return null;
  return <Bird fire={gift[1]==='نسر ناري'} duck={gift[3]==='duck'}/>;
}
export default function GiftEffect(props){
  return <GiftMotion {...props} label={ui(props.gift[1])} renderMark={renderBird}/>;
}
