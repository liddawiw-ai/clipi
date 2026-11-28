import React from 'react';
// Original vector artwork for Clipi; classic Ludo geometry, no third-party brand assets.
const colors=['#ed343e','#24a94a','#f5bd12','#1689e7'];
export function LudoBoardArt(){
 return <svg aria-hidden="true" viewBox="0 0 1000 1000" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
 <defs><linearGradient id="ludoGold" x2=".85" y2="1"><stop stopColor="#fff0b5"/><stop offset=".25" stopColor="#e9bc51"/><stop offset=".55" stopColor="#936025"/><stop offset=".8" stopColor="#fce3a0"/><stop offset="1" stopColor="#82521e"/></linearGradient><linearGradient id="ludoTile" x2=".25" y2="1"><stop stopColor="#fff"/><stop offset=".75" stopColor="#fff3d7"/><stop offset="1" stopColor="#d7c8a6"/></linearGradient><radialGradient id="ludoSocket"><stop stopColor="#4a291c" stopOpacity=".45"/><stop offset=".78" stopColor="#fff" stopOpacity=".15"/><stop offset="1" stopColor="#fff" stopOpacity=".85"/></radialGradient>{colors.map((color,i)=><linearGradient key={i} id={'ludoZone'+i} x2=".4" y2="1"><stop stopColor="#fff" stopOpacity=".85"/><stop offset=".24" stopColor={color}/><stop offset="1" stopColor={color} stopOpacity=".65"/></linearGradient>)}</defs><rect width="1000" height="1000" rx="34" fill="#65431d"/><rect x="2" y="2" width="996" height="980" rx="32" fill="url(#ludoGold)"/><rect x="20" y="20" width="960" height="960" rx="20" fill="#d7ab51" stroke="#fff1b0" strokeWidth="5"/>
 <g transform="translate(32 32) scale(62.4)">
 {colors.map((color,i)=><g key={i} transform={'rotate('+i*90+' 7.5 7.5)'}>
 <rect width="6" height="6" rx=".12" fill={'url(#ludoZone'+i+')'} stroke={color} strokeWidth=".08"/><rect x=".8" y=".8" width="4.4" height="4.4" rx=".65" fill="url(#ludoTile)" stroke="#ffffff" strokeWidth=".06"/>
 {[1.95,4.05].flatMap(x=>[1.95,4.05].map(y=><circle key={x+'/'+y} cx={x} cy={y} r=".62" fill="url(#ludoSocket)" stroke="#fff" strokeWidth=".035"/>))}
 {Array.from({length:6},(_,x)=>[6,7,8].map(y=><rect key={x+'/'+y} x={x} y={y} width="1" height="1" rx=".045" fill={y===7&&x>0||y===6&&x===1?'url(#ludoZone'+i+')':'url(#ludoTile)'} stroke="#a99a7c" strokeWidth=".035"/>))}
 <path d="M6 6 L7.5 7.5 L6 9 Z" fill={'url(#ludoZone'+i+')'} stroke="#fff" strokeWidth=".025"/>
 <text x="1.5" y="6.7" textAnchor="middle" fill="#fff" fontSize=".58">★</text>
 <text x="2.5" y="8.7" textAnchor="middle" fill="#a0a9b5" fontSize=".58">★</text>
 </g>)}
 </g></svg>;
}
export function LudoBadge(){return <svg aria-hidden="true" viewBox="0 0 160 160" style={{width:'100%',height:'100%'}}>
 <defs><linearGradient id="clipiLudoBlue" x2="0%" y2="100%"><stop stopColor="#2265dc"/><stop offset="1" stopColor="#222276"/></linearGradient></defs>
 <rect x="3" y="3" width="154" height="154" rx="28" fill="url(#clipiLudoBlue)" stroke="#ffd16a" strokeWidth="5"/>
 <g transform="translate(34 65) scale(.092)"><rect width="1000" height="1000" rx="90" fill="#fff8de"/>{colors.map((c,i)=><rect key={i} x="45" y="45" width="360" height="360" rx="55" fill={c} transform={'rotate('+i*90+' 500 500)'}/>)}</g>
 <text x="80" y="30" textAnchor="middle" fontSize="23" fontWeight="900" fill="#fff">Clipi</text>
 <text x="80" y="57" textAnchor="middle" fontSize="30" fontWeight="900" fill="#ffdb54" stroke="#142c70" strokeWidth=".7">LUDO</text>
 <g transform="translate(80 108) rotate(-15)"><rect x="-24" y="-24" width="48" height="48" rx="10" fill="#fff" stroke="#e4b35e" strokeWidth="3"/>{[[-12,-12],[12,-12],[0,0],[-12,12],[12,12]].map(([x,y])=><circle key={x+'/'+y} cx={x} cy={y} r="4" fill="#d93240"/>)}</g></svg>}
