import {matterShot, physicsVersion, tableWidth, tableHeight, ballRadius, pockets} from './MatterPool.mjs';
export {tableWidth, tableHeight, ballRadius, pockets};
export const simulate = matterShot;

// Historical multiplayer records have no physics marker and must reproduce
// the old server's paths. New records identify their solver with the shot.
export function replayShot(record) {
  const solve = record.physics===physicsVersion ? matterShot : legacyShot;
  return solve(record.before,record.angle,record.power,true);
}
export function rack(){
  const balls=[{n:0,x:50,y:134}],ids=[1,10,3,2,8,13,12,5,15,6,4,14,7,9,11];
  for(let row=0;row<5;row++)for(let col=0;col<=row;col++){
    balls.push({n:ids[balls.length-1],x:50+(col-row/2)*5.28,y:49-row*4.58});
  }
  return balls;
}
function legalSpot(balls,x,y){
  return Number.isFinite(x)&&Number.isFinite(y)&&x>=4&&x<=96&&y>=4&&y<=172&&
    !balls.some(b=>b.n&&Math.hypot(b.x-x,b.y-y)<ballRadius*2+.1)&&!pockets.some(([px,py])=>Math.hypot(x-px,y-py)<6);
}
export function placeCue(balls,x,y){
  if(!legalSpot(balls,x,y))throw Error('اختَر مكانًا خاليًا للكرة البيضاء');
  return [{n:0,x,y},...balls.filter(b=>b.n!==0)];
}
function legacyShot(balls,angle,power,captureFrames=false){
  if(!Number.isFinite(angle)||!Number.isInteger(power)||power<1||power>100)throw Error('ضربة غير صالحة');
  const active=balls.map(b=>({...b,vx:0,vy:0})),cue=active.find(b=>!b.n);
  if(!cue)throw Error('ضع الكرة البيضاء');
  const speed=.3+power*.039;
  cue.vx=Math.cos(angle)*speed;cue.vy=Math.sin(angle)*speed;
  const fallen=[],frames=[];let first=null,rail=false;
  const snapshot=()=>active.map(({n,x,y})=>({n,x,y}));
  if(captureFrames)frames.push(snapshot());
  for(let t=0;t<1850;t++){
    for(const b of active){b.x+=b.vx;b.y+=b.vy;}
    for(let i=active.length-1;i>=0;i--){
      const b=active[i];
      if(pockets.some(([x,y])=>Math.hypot(b.x-x,b.y-y)<5.9)){fallen.push(b.n);active.splice(i,1);continue;}
      const r=ballRadius;
      const wallX=b.x<r&&b.vx<0||b.x>tableWidth-r&&b.vx>0;
      const wallY=b.y<r&&b.vy<0||b.y>tableHeight-r&&b.vy>0;
      if(wallX){b.x=Math.max(r,Math.min(tableWidth-r,b.x));b.vx*=-.84;}
      if(wallY){b.y=Math.max(r,Math.min(tableHeight-r,b.y));b.vy*=-.84;}
      if((wallX||wallY)&&first!==null)rail=true;
    }
    for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
      const a=active[i],b=active[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      if(d>=2*ballRadius||d===0)continue;
      const nx=dx/d,ny=dy/d,v=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
      const separate=(2*ballRadius-d)/2;
      a.x-=nx*separate;a.y-=ny*separate;b.x+=nx*separate;b.y+=ny*separate;
      if(v<=0)continue;
      if(first===null&&(a.n===0||b.n===0))first=a.n||b.n;
      a.vx-=v*.97*nx;a.vy-=v*.97*ny;b.vx+=v*.97*nx;b.vy+=v*.97*ny;
    }
    let moving=false;
    for(const b of active){
      b.vx*=.991;b.vy*=.991;
      if(Math.hypot(b.vx,b.vy)<.035){b.vx=0;b.vy=0;}else moving=true;
    }
    if(captureFrames&&t%5===0)frames.push(snapshot());
    if(!moving)break;
  }
  return {balls:snapshot(),fallen,first,rail,frames};
}
export const ballGroup=n=>n>8?'striped':n>0&&n<8?'solid':null;
export function poolMove(g,a){
  if(a.type==='place'&&g.inHand){g.balls=placeCue(g.balls,a.x,a.y);return;}
  if(a.type!=='shot')throw Error('ضربة غير صالحة');
  const group=g.groups[g.turn],onBlack=group&&!g.balls.some(b=>ballGroup(b.n)===group);
  const before=g.balls, result=simulate(before,a.angle,a.power);
  const {first,fallen}=result;
  const wrong=onBlack?first!==8:group?ballGroup(first)!==group:first===8;
  const foul=first===null||wrong||fallen.includes(0)||(!fallen.length&&!result.rail);
  g.balls=result.balls;
  g.shot={physics:physicsVersion,before,angle:a.angle,power:a.power,number:(g.shot?.number||0)+1};
  const other=1-g.turn;
  if(fallen.includes(8)){g.winner=onBlack&&!foul?g.turn:other;return;}
  const firstColor=fallen.map(ballGroup).find(Boolean);
  if(!group&&!foul&&firstColor){
    g.groups[g.turn]=firstColor;g.groups[other]=firstColor==='solid'?'striped':'solid';
  }
  g.inHand=foul;
  if(!g.balls.some(b=>!b.n)){
    for(let y=134;y>4;y-=6){let found=false;
      for(let x=50;x<95;x+=6)if(legalSpot(g.balls,x,y)){g.balls=placeCue(g.balls,x,y);found=true;break;}
      if(found)break;
    }
  }
  if(foul||!fallen.some(n=>ballGroup(n)===g.groups[g.turn]))g.turn=other;
  g.note=foul?'خطأ · الكرة البيضاء بيد اللاعب التالي':fallen.length?'دخلت كرة في الجيب':'انتقل الدور';
}
