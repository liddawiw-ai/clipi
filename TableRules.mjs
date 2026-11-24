import {rack,poolMove} from './PoolRules.mjs';
export const games={ludo:'لودو',jackaroo:'جاكارو',pool:'بلياردو'};
export const seatsFor=k=>k==='jackaroo'?[4]:k==='pool'?[2]:[2,3,4];
const copy=x=>JSON.parse(JSON.stringify(x));
const suits=['clubs','diamonds','hearts','spades'];

function dealHands(g,amount){
  g.hands=Array.from({length:4},()=>g.deck.splice(0,amount));
  if(g.deckSuits)g.handSuits=Array.from({length:4},()=>g.deckSuits.splice(0,amount));
  if(g.partnerExchange)g.exchange={start:g.turn,picks:[null,null,null,null]};
}
export function deal(g,rng){
  const cards=Array.from({length:52},(_,i)=>i);
  for(let i=cards.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];
  }
  g.deck=cards.map(n=>n%13+1);
  g.deckSuits=cards.map(n=>suits[Math.floor(n/13)]);
  dealHands(g,4);
}
export function match(kind,count,rng=Math.random,{partnerExchange=false}={}){
  if(!Object.hasOwn(games,kind)||!seatsFor(kind).includes(count))throw Error('عدد اللاعبين غير مناسب');
  const g={kind,count,turn:0,winner:null,note:''};
  if(kind==='pool')return {...g,balls:rack(),groups:[null,null],inHand:false};
  g.pieces=Array.from({length:count},()=>[-1,-1,-1,-1]);
  g.die=0;if(kind==='jackaroo'){g.partnerExchange=partnerExchange;deal(g,rng);}return g;
}
export const trackSize=g=>g.kind==='ludo'?52:64;
export const offset=(g,s)=>g.kind==='ludo'&&g.count===2?s*26:s*trackSize(g)/4;
export const trackPos=(g,s,p)=>(p+offset(g,s))%trackSize(g);
const finish=g=>g.kind==='ludo'?56:67;
const gate=g=>g.kind==='ludo'?51:64;
function at(g,index){
  const list=[];g.pieces.forEach((pieces,s)=>pieces.forEach((p,i)=>{
    if(p>=0&&p<gate(g)&&trackPos(g,s,p)===index)list.push({s,i,p});
  }));return list;
}
const homeDone=(g,s)=>g.kind==='ludo'?g.pieces[s].every(p=>p===finish(g)):g.pieces[s].every(p=>p>=gate(g));
function shift(g,s,i,steps,deploy=false){
  const p=g.pieces[s][i],limit=finish(g),entry=gate(g),ludo=g.kind==='ludo';
  if(deploy?p!==-1:p<0||p===limit)return false;
  let next=deploy?0:p+steps;
  if(!ludo&&steps<0){if(p>=entry)return false;next=(next+64)%64;}
  if(next>limit||next<0)return false;
  if(!ludo&&!deploy&&steps>0){
    for(let k=p+1;k<=next;k++){
      if(k>=entry){if(g.pieces[s].includes(k))return false;}
      else if(at(g,trackPos(g,s,k)).some(o=>o.p===0))return false;
    }
  }
  if(next<entry){
    const pos=trackPos(g,s,next),occupants=at(g,pos);
    const safe=ludo&&[0,8].includes(pos%13);
    if(!ludo&&occupants.some(o=>o.s===s||o.p===0))return false;
    if(!safe)occupants.filter(o=>o.s!==s).forEach(o=>{g.pieces[o.s][o.i]=-1;});
  }
  g.pieces[s][i]=next;return true;
}
export const cardName=c=>({1:'A',11:'J',12:'Q',13:'K'})[c]||String(c);
function generate(g){
  const options=[],s=g.kind==='jackaroo'&&homeDone(g,g.turn)?(g.turn+2)%4:g.turn;
  function add(id,label,run){const draft={...g,pieces:g.pieces.map(row=>row.slice())};if(run(draft))options.push({id,label,pieces:draft.pieces});}
  const jack=g.kind==='jackaroo',cards=jack?[...new Set(g.hands[g.turn])]:[g.die];
  for(const c of cards){
    const tag=jack?cardName(c)+' · ':'';
    if(!c)continue;
    const start=options.length;
    g.pieces[s].forEach((p,i)=>{
      const piece='حجر '+(i+1);
      if(p===-1&&((jack&&(c===1||c===13))||(!jack&&c===6)))add(c+'/d/'+i,tag+'إنزال '+piece,d=>shift(d,s,i,0,true));
      if(p<0)return;
      if(jack&&c===11){
        if(p>0&&p<64)g.pieces.forEach((other,os)=>other.forEach((op,oi)=>{
          if(os===s||op<=0||op>=64)return;
          add(c+'/x/'+i+'/'+os+'/'+oi,tag+piece+' ↔ '+(os+1)+'/'+(oi+1),d=>{
            d.pieces[s][i]=(trackPos(g,os,op)-offset(g,s)+64)%64;
            d.pieces[os][oi]=(trackPos(g,s,p)-offset(g,os)+64)%64;return true;
          });
        }));
      }else if(jack&&c===7){
        add(c+'/m/'+i,tag+piece+' +7',d=>shift(d,s,i,7));
        g.pieces[s].forEach((_,j)=>{if(j===i)return;for(let k=1;k<7;k++){
          add(c+'/s/'+i+'/'+j+'/'+k,tag+piece+' +'+k+'، حجر '+(j+1)+' +'+(7-k),d=>shift(d,s,i,k)&&shift(d,s,j,7-k));
        }});
      }else{
        const steps=jack&&c===4?-4:c;
        add(c+'/m/'+i,tag+piece+' '+(steps>0?'+':'')+steps,d=>shift(d,s,i,steps));
      }
    });
    if(jack&&options.length===start)options.push({id:c+'/pass',label:tag+'تمرير',pass:true});
  }
  if(options.some(o=>!o.pass))return options.filter(o=>!o.pass);
  return options;
}
export function choicesWithPositions(g){
  if(g.exchange||g.winner!==null||g.kind==='pool'||g.kind==='ludo'&&!g.die)return [];
  return generate(g);
}
export function choices(g){
  return choicesWithPositions(g).map(({id,label})=>({id,label}));
}
export function move(state,a,rng=Math.random){
  if(state.winner!==null||!a||typeof a!=='object')throw Error('الحركة غير متاحة');
  const g=copy(state),advance=()=>{g.turn=(g.turn+1)%g.count;};
  if(g.kind==='pool'){poolMove(g,a);return g;}
  if(g.exchange){
    const seat=g.turn,index=a.cardIndex;
    if(a.type!=='exchange'||!Number.isInteger(index)||index<0||index>=g.hands[seat].length)
      throw Error('اختر ورقة من يدك لتمريرها');
    const {picks,start}=g.exchange;
    picks[seat]=index;
    if(picks.some(p=>p===null)){advance();return g;}
    const handoff=g.hands.map((hand,i)=>({rank:hand[picks[i]],suit:g.handSuits[i][picks[i]]}));
    for(let i=0;i<4;i++){
      const incoming=handoff[(i+2)%4];
      g.hands[i][picks[i]]=incoming.rank;
      g.handSuits[i][picks[i]]=incoming.suit;
    }
    delete g.exchange;g.turn=start;g.note='تبادل الشريكان الأوراق';return g;
  }

  if(g.kind==='ludo'&&a.type==='roll'&&!g.die){
    g.die=1+Math.floor(rng()*6);g.note='نتيجة النرد '+g.die;
    if(!generate(g).length){g.note+=' · لا توجد حركة';if(g.die!==6)advance();g.die=0;}
    return g;
  }
  const choice=generate(g).find(o=>o.id===a.id);
  if(a.type!=='move'||!choice)throw Error('اختيار غير صالح لهذا الدور');
  if(choice.pieces)g.pieces=choice.pieces;
  g.note=choice.label;
  if(g.kind==='ludo'){
    if(homeDone(g,g.turn))g.winner=g.turn;
    else if(g.die!==6)advance();
    g.die=0;
  }else{
    const rank=Number(a.id.split('/')[0]),hand=g.hands[g.turn];
    const index=a.cardIndex??hand.indexOf(rank);
    if(!Number.isInteger(index)||index<0||hand[index]!==rank)throw Error('الورقة المختارة غير متاحة');
    const suit=g.handSuits?.[g.turn]?.[index]??null;
    g.lastCard={rank,suit,seat:g.turn};
    hand.splice(index,1);g.handSuits?.[g.turn]?.splice(index,1);
    if(homeDone(g,g.turn)&&homeDone(g,(g.turn+2)%4))g.winner=g.turn%2;
    advance();
    if(g.hands.every(hand=>!hand.length)){
      if(!g.deck.length)deal(g,rng);
      else dealHands(g,Math.min(4,g.deck.length/4));
    }
  }
  return g;
}
export function viewFor(g,seat){
  if(!g)return null;
  if(g.kind!=='jackaroo')return g;
  const {deck,deckSuits,hands,handSuits,exchange,...rest}=g;
  const visible=rows=>rows.map((row,i)=>i===seat?row:[]);
  return {...rest,...(exchange?{exchange:{start:exchange.start}}:{}),hands:visible(hands),...(handSuits?{handSuits:visible(handSuits)}:{}),handSizes:hands.map(h=>h.length)};
}
