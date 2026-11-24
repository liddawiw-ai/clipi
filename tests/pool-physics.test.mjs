import test from 'node:test';
import assert from 'node:assert/strict';
import {rack, simulate, replayShot} from '../PoolRules.mjs';
import {physicsVersion} from '../MatterPool.mjs';
import {match, move} from '../TableRules.mjs';
import {practiceAction} from '../PracticeOpponent.mjs';

test('the computer break uses the new solver and round-trips its recording',()=>{
  const game = match('pool',2);
  const result = move(game,practiceAction(game));
  assert.equal(result.shot.physics,physicsVersion);
  const replay = replayShot(result.shot);
  assert.equal(replay.first,1);
  assert.deepEqual(replay.frames[0],rack());
  assert.deepEqual(replay.frames.at(-1),replay.balls);
  assert.deepEqual(replay.balls,result.balls);
  assert.ok(replay.frames.length>20);
  const originalBalls = JSON.stringify(result.balls);
  const nextAction = practiceAction(result);
  assert.equal(nextAction.type,'shot');
  assert.ok(Number.isFinite(nextAction.angle));
  assert.equal(JSON.stringify(result.balls),originalBalls);
});

test('unversioned remote recordings keep their original paths and pocket timing',()=>{
  const replay = replayShot({before:[{n:0,x:15,y:15},{n:7,x:8,y:8}],angle:-3*Math.PI/4,power:30});
  assert.equal(replay.frames.length,7);
  assert.deepEqual(replay.fallen,[7]);
  assert.equal(replay.first,7);
  assert.equal(replay.balls.length,1);
  assert.ok(Math.abs(replay.balls[0].x-10.684742983021666)<1e-8);
  assert.ok(Math.abs(replay.frames[3][0].x-11.082549493595582)<1e-8);
});

test('a free ball rebounds off a solid cushion and drops through an open side pocket',()=>{
  const cushion = simulate([{n:0,x:76,y:46}],0,55,true);
  const farthest = Math.max(...cushion.frames.map(frame=>frame[0].x));
  assert.ok(farthest>95&&farthest<101);
  assert.ok(cushion.balls[0].x<farthest-8);
  assert.deepEqual(cushion.fallen,[]);
  const pocket = simulate([{n:0,x:76,y:88}],0,55);
  assert.deepEqual(pocket.fallen,[0]);
  assert.deepEqual(pocket.balls,[]);
});
