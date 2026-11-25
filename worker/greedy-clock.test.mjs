import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoundClock} from '../pi-web/greedy-clock.mjs';
import worker from './worker.mjs';

test('rooms opened at different times use the same server time despite skew and ignore a delayed resync',async t=>{
  let server=700000*40000;
  t.mock.method(Date,'now',()=>server);
  async function enter(skew){
    const entered=server;
    const clock=createRoundClock(()=>server-entered,()=>server+skew);
    await clock.sync(async()=>{
      server+=20;
      const response=await worker.fetch(new Request('https://clipi.test/game-clock'),{});
      assert.match(response.headers.get('Cache-Control'),/no-store/);
      const sample=(await response.json()).now;
      server+=20;
      return sample;
    });
    return clock;
  }
  const first=await enter(300000);
  server+=13651;
  const second=await enter(-120000);
  for(const elapsed of [0,29999,30000,35999,36000,39999,40000]){
    server=700001*40000+elapsed;
    assert.equal(first.now(),server);
    assert.equal(first.now(),second.now());
  }
  await first.sync(async()=>{server+=5000;return server-5000});
  assert.equal(first.now(),second.now());
});
