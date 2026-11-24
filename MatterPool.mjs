// Matter.js solves ball-ball and ball-cushion contact. Table units are scaled
// to typical Matter body sizes, and the clock is fixed for shareable replays.
import Matter from './vendor/matter-js/matter.cjs';

const {Bodies, Body, Composite, Engine, Events} = Matter;
export const physicsVersion = 'matter-0.20.0/1';
export const tableWidth = 100, tableHeight = 176, ballRadius = 2.6;
export const pockets = [[0,0],[100,0],[0,88],[100,88],[0,176],[100,176]];

const scale = 10, timestep = 1000/120, pocketRadius = 5.9, stopSpeed = .035*scale;
const pocketRadiusSq = (pocketRadius*scale)**2;
const slots = [
  [-3,44,6,75], [-3,132,6,75], [103,44,6,75], [103,132,6,75],
  [50,-3,87,6], [50,179,87,6],
];

function cushion([x,y,w,h]) {
  return Bodies.rectangle(x*scale,y*scale,w*scale,h*scale,{
    label:'cushion', isStatic:true, friction:0, frictionStatic:0, restitution:.83,
    chamfer:{radius:1.5*scale,quality:4},
  });
}

function billiardBall({n,x,y}) {
  const body = Bodies.circle(x*scale,y*scale,ballRadius*scale,{
    label:'ball', friction:0, frictionStatic:0, frictionAir:.009,
    restitution:.96, slop:.02, plugin:{number:n},
  },40);
  Body.setInertia(body,Infinity);
  return body;
}

function pocketed(body) {
  const {x,y} = body.position;
  return pockets.some(([px,py])=>(x-px*scale)**2+(y-py*scale)**2<pocketRadiusSq) ||
    x<0 || x>tableWidth*scale || y<0 || y>tableHeight*scale;
}

export function matterShot(balls,angle,power,captureFrames=false) {
  if (!Number.isFinite(angle) || !Number.isInteger(power) || power<1 || power>100) {
    throw Error('ضربة غير صالحة');
  }
  const engine = Engine.create({gravity:{x:0,y:0,scale:0},positionIterations:5,velocityIterations:5});
  const active = balls.map(billiardBall);
  const cue = active.find(b=>b.plugin.number===0);
  if (!cue) throw Error('ضع الكرة البيضاء');
  Composite.add(engine.world,[...slots.map(cushion),...active]);
  const speed = (.3+power*.039)*scale;
  Body.setVelocity(cue,{x:Math.cos(angle)*speed,y:Math.sin(angle)*speed});
  const fallen = [], frames = [];
  let first = null, rail = false;
  Events.on(engine,'collisionStart',({pairs})=>{
    for (const {bodyA,bodyB} of pairs) {
      if (first!==null) break;
      if (bodyA===cue && bodyB.label==='ball') first=bodyB.plugin.number;
      if (bodyB===cue && bodyA.label==='ball') first=bodyA.plugin.number;
    }
    if (first!==null && pairs.some(({bodyA,bodyB})=>bodyA.label==='cushion'||bodyB.label==='cushion')) rail=true;
  });
  const snapshot = ()=>active.map(b=>({n:b.plugin.number,x:b.position.x/scale,y:b.position.y/scale}));
  if (captureFrames) frames.push(balls.map(({n,x,y})=>({n,x,y})));
  for (let step=0;step<2400;step++) {
    Engine.update(engine,timestep);
    let moving = false;
    for (let i=active.length-1;i>=0;i--) {
      const body = active[i];
      if (pocketed(body)) {
        fallen.push(body.plugin.number);
        active.splice(i,1);
        Composite.remove(engine.world,body);
      } else if (body.speed>=stopSpeed) {
        moving=true;
      } else if (body.speed>0) {
        Body.setVelocity(body,{x:0,y:0});
      }
    }
    if (captureFrames && step%10===0) frames.push(snapshot());
    if (!moving) break;
  }
  const final = snapshot();
  if (captureFrames) frames.push(final);
  Events.off(engine);
  Composite.clear(engine.world,false);
  Engine.clear(engine);
  return {balls:final,fallen,first,rail,frames};
}
