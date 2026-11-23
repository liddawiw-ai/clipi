import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {profileTables,tableSchema} from './profile-tables.mjs';
import {choices,match,move} from '../pi-web/TableRules.mjs';
import {simulate,placeCue} from '../pi-web/PoolRules.mjs';

function api(kind){
  const db=new DatabaseSync(':memory:');tableSchema.forEach(s=>db.exec(s));
  const q=(sql,...p)=>{const s=db.prepare(sql);return {first:()=>s.get(...p),all:()=>({results:s.all(...p)}),run:()=>({meta:s.run(...p)})};};
  return (uid,op,extras={})=>profileTables(q,uid,{op,kind,name:uid,...extras},(data,status=200)=>({status,...data}));
}
for(const [kind,count] of [['ludo',2],['jackaroo',4],['pool',2]]){
  test(kind+' is public to signed-in players, starts with seats, validates turns, restores and closes',async()=>{
    const call=api(kind);
    let {table}=await call('a','tableCreate');
    const code=table.code;
    assert.equal((await call('a','tableCreate')).table.code,code);
    assert.equal((await call('b','tableList')).lobbies[0].code,code);
    assert.equal((await call('visitor','tableRead',{code})).status,403);
    for(const n of ['b','c','d'].slice(0,count-1))({table}=await call(n,'tableJoin',{code}));
    assert.equal((await call('b','tableStart',{code,rev:table.rev})).status,409);
    ({table}=await call('a','tableStart',{code,rev:table.rev}));
    const rev=table.rev;
    let action=kind==='ludo'?{type:'roll'}:kind==='pool'?{type:'shot',angle:-Math.PI/2,power:95}:{type:'move',id:choices(table.game)[0].id};
    if(kind==='jackaroo'){
      assert.equal(table.game.hands[0].length,4);assert.deepEqual(table.game.hands.slice(1),[[],[],[]]);assert.equal('deck' in table.game,false);
      const b=(await call('b','tableRead',{code})).table;assert.equal(b.game.hands[0].length,0);assert.equal(b.game.hands[1].length,4);
    }
    assert.equal((await call('b','tableMove',{code,rev,action})).status,409);
    ({table}=await call('a','tableMove',{code,rev,action}));
    assert.equal(table.rev,rev+1);assert.equal((await call('a','tableMove',{code,rev,action})).status,409);
    assert.equal((await call('b','tableList')).table.rev,rev+1);
    assert.deepEqual((await call('a','tableRead',{code})).table.game,table.game);
    assert.equal((await call('b','tableLeave',{code,rev:table.rev})).status,200);assert.equal((await call('a','tableList')).table,null);
  });
}
test('ludo deploys on a six, captures, respects safe cells and requires an exact finish',()=>{
  let g=move(match('ludo',2),{type:'roll'},()=>.95);g=move(g,{type:'move',id:'6/d/0'});assert.equal(g.turn,0);
  g.pieces[1][2]=27;g.die=1;g=move(g,{type:'move',id:'1/m/0'});assert.equal(g.pieces[1][2],-1);
  g.turn=0;g.pieces[0]=[55,56,56,56];g.die=2;assert.equal(choices(g).length,0);g.die=1;
  assert.equal(move(g,{type:'move',id:'1/m/0'}).winner,0);
  g.pieces=[[7,-1,-1,-1],[34,-1,-1,-1]];g.die=1;assert.equal(move(g,{type:'move',id:'1/m/0'}).pieces[1][0],34);
});
test('Jackaroo split seven, reverse four, swap jack, protected marbles and partner finish',()=>{
  let g=match('jackaroo',4);g.hands[0]=[7,4,11,1];g.pieces[0]=[7,20,-1,-1];g.pieces[1][0]=2;
  assert.deepEqual(move(g,{type:'move',id:'7/s/0/1/3'}).pieces[0],[10,24,-1,-1]);
  assert.equal(move(g,{type:'move',id:'4/m/0'}).pieces[0][0],3);
  assert.equal(move(g,{type:'move',id:'11/x/0/1/0'}).pieces[0][0],18);
  g.pieces[1][0]=0;assert.ok(!choices(g).some(o=>o.id.includes('/x/')));
  g.pieces[0]=[64,65,66,67];g.pieces[2]=[63,65,66,67];
  assert.equal(move(g,{type:'move',id:'1/m/0'}).winner,0);
});
test('pool resolves contact, rebounds, pockets, scratch and legal eight-ball win',()=>{
  let g=match('pool',2);const one=simulate(g.balls,-Math.PI/2,100,true);
  assert.equal(one.first,1);assert.ok(one.frames.length>20);assert.ok(Math.hypot(one.balls.find(b=>b.n===1).x-50,one.balls.find(b=>b.n===1).y-49)>8);
  assert.deepEqual(simulate(g.balls,-Math.PI/2,100).balls,one.balls);
  g.balls=[{n:0,x:50,y:145},{n:8,x:62,y:158}];g.groups=['solid','striped'];
  g.balls=[{n:0,x:15,y:15},{n:8,x:8,y:8}];assert.equal(move(g,{type:'shot',angle:-3*Math.PI/4,power:30}).winner,0);
  g.balls.push({n:2,x:50,y:100});assert.equal(move(g,{type:'shot',angle:-3*Math.PI/4,power:30}).winner,1);
  g.balls=[{n:0,x:9,y:9},{n:8,x:80,y:80},{n:9,x:55,y:89}];g=move(g,{type:'shot',angle:-3*Math.PI/4,power:30});
  assert.equal(g.inHand,true);assert.equal(g.turn,1);assert.ok(g.balls.find(b=>b.n===0));assert.throws(()=>placeCue(g.balls,80,80));
});
