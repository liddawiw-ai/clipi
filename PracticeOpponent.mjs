// Practice uses the same legal moves and physics as a multiplayer table.
import {chooseJackarooMove} from './JackarooPractice.mjs';
import {chooseLudoMove} from './LudoPractice.mjs';
import {choicesWithPositions} from './TableRules.mjs';
import {ballGroup,ballRadius,pockets,simulate} from './PoolRules.mjs';

function aimShot(game){
  const cue=game.balls.find(b=>!b.n),group=game.groups[game.turn];
  const own=game.balls.filter(b=>b.n&&b.n!==8&&(!group||ballGroup(b.n)===group));
  const targets=own.length?own:game.balls.filter(b=>b.n===8);
  if(!game.shot)return {type:'shot',angle:-Math.PI/2,power:96};
  const paths=[];
  for(const ball of targets){
    for(const [x,y] of pockets){
      const dx=x-ball.x,dy=y-ball.y,leg=Math.hypot(dx,dy);
      if(!leg)continue;
      const gx=ball.x-2*ballRadius*dx/leg,gy=ball.y-2*ballRadius*dy/leg;
      if(gx<ballRadius||gx>100-ballRadius||gy<ballRadius||gy>176-ballRadius)continue;
      const fromCue=Math.hypot(gx-cue.x,gy-cue.y);
      if(!fromCue)continue;
      const alignment=((gx-cue.x)*dx+(gy-cue.y)*dy)/(leg*fromCue);
      if(alignment<.25)continue;
      paths.push({angle:Math.atan2(gy-cue.y,gx-cue.x),power:Math.min(100,Math.max(34,Math.round((leg/alignment+fromCue)*.53))),difficulty:fromCue+leg+130*(1-alignment)});
    }
  }
  paths.sort((a,b)=>a.difficulty-b.difficulty);
  const candidates=paths.slice(0,8);
  for(const ball of targets.slice().sort((a,b)=>Math.hypot(a.x-cue.x,a.y-cue.y)-Math.hypot(b.x-cue.x,b.y-cue.y)).slice(0,4)){
    candidates.push({angle:Math.atan2(ball.y-cue.y,ball.x-cue.x),power:80});
  }
  let best,highest=-Infinity;
  for(const candidate of candidates){
    const result=simulate(game.balls,candidate.angle,candidate.power);
    const firstOK=targets.some(b=>b.n===result.first);
    const scratch=result.fallen.includes(0);
    const legal=firstOK&&!scratch&&(result.fallen.length>0||result.rail);
    const hits=result.fallen.filter(n=>targets.some(b=>b.n===n)).length;
    const score=(legal?80:0)+(firstOK?20:0)+hits*75-(scratch?100:0)-
      (result.fallen.includes(8)&&(!legal||own.length)?600:0);
    if(score>highest){highest=score;best=candidate;}
    if(legal&&hits&&!result.fallen.includes(8))break;
  }
  return {type:'shot',angle:best?.angle??-Math.PI/2,power:best?.power??75};
}
export function practiceAction(game){
  if(game.winner!==null)return null;
  if(game.kind==='pool')return aimShot(game);
  if(game.kind==='ludo'&&!game.die)return {type:'roll'};
  if(game.exchange){
    const hand=game.hands[game.turn],partner=(game.turn+2)%4;
    const needsStart=game.pieces[partner].filter(p=>p<0).length>1;
    const score=rank=>(needsStart&&(rank===1||rank===13)?20:0)+(hand.indexOf(rank)!==hand.lastIndexOf(rank)?5:0)+rank;
    const bestIndex=hand.reduce((best,rank,i)=>score(rank)>score(hand[best])?i:best,0);
    return {type:'exchange',cardIndex:bestIndex};
  }
  const legal=choicesWithPositions(game);
  const id=game.kind==='ludo'?chooseLudoMove(game,legal):chooseJackarooMove(game,legal);
  return id?{type:'move',id}:null;
}
