import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.mjs';

test('wallet linking uses the verified Pi identity and keeps accounts separate', async t=>{
  const sql=new DatabaseSync(':memory:');
  t.after(()=>sql.close());
  const db={
    prepare(query){return {query,bind(...args){const stmt=sql.prepare(query);return {
      first:()=>stmt.get(...args),all:()=>({results:stmt.all(...args)}),run:()=>({meta:stmt.run(...args)})
    }}}},
    batch(statements){return statements.map(s=>sql.exec(s.query))}
  };
  const env={PI_GIFTS_DB:db,PI_GIFTS_TESTNET:'1'};
  const addresses={first:'G'+'A'.repeat(55),second:'G'+'B'.repeat(55)};
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(new URL(url).hostname==='identitytoolkit.googleapis.com')
      return Response.json({users:[{localId:JSON.parse(options.body).idToken}]});
    assert.equal(String(url),'https://api.minepi.com/v2/me');
    const id=options.headers.Authorization.slice('Bearer '.length);
    if(id==='expired')return Response.json({}, {status:401});
    return Response.json({uid:id==='missing'?'second':id,wallet_address:addresses[id]});
  });
  const request=(uid,op,body={})=>worker.fetch(new Request('https://clipi.test/account-number',{
    method:'POST',headers:{Authorization:'Bearer '+uid},body:JSON.stringify({op,...body})
  }),env);
  const link=(uid,accessToken,extra)=>request('pi:'+uid,'linkHostWallet',{accessToken,...extra});
  const status=async uid=>(await (await request('pi:'+uid,'wallet')).json()).walletAddress;
  assert.equal((await link('first','first')).status,200);
  assert.equal(await status('first'),addresses.first);
  assert.equal(await status('second'),null);
  assert.equal((await link('second','first')).status,409);
  assert.equal((await link('second','expired')).status,401);
  assert.equal((await link('second','missing',{walletAddress:addresses.first})).status,422);
  assert.equal(await status('second'),null);
  for(let i=0;i<2;i++)assert.equal((await link('second','second',{uid:'pi:first',walletAddress:addresses.first})).status,200);
  assert.equal(await status('second'),addresses.second);
  assert.equal(await status('first'),addresses.first);
  assert.equal((await request('unlinked-email','linkHostWallet',{accessToken:'first'})).status,403);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM host_pi_wallet').get().n,2);
});
