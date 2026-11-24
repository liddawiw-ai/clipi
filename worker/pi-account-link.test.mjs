import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {generateKeyPairSync} from 'node:crypto';
import {piLogin} from './pi-login.mjs';
import {shortAccount} from './short-videos.mjs';
import {piGifts} from './pi-gifts.mjs';
import {roomStore} from './room-controls.mjs';

test('two verified owner accounts share the email profile only after confirmation',async t=>{
  const sql=new DatabaseSync(':memory:');
  t.after(()=>sql.close());
  function statement(query,args=[]){
    return {query,bind:(...values)=>statement(query,values),
      run:async()=>({meta:sql.prepare(query).run(...args)}),
      all:async()=>({results:sql.prepare(query).all(...args)}),first:async()=>sql.prepare(query).get(...args)};
  }
  const db={prepare:statement,batch:async statements=>{for(const s of statements)sql.exec(s.query);}};
  const q=await roomStore(db);
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const env={PI_GIFTS_NETWORK:'mainnet',PI_GIFTS_DB:db,PI_NETWORK_API_KEY:'fixture',PI_FIREBASE_SIGNER_EMAIL:'fixture@example.test',
    PI_FIREBASE_SIGNER_KEY:privateKey.export({type:'pkcs8',format:'pem'})};
  for(const [uid,n] of [['pi:original','1000100'],['email-author','1000101'],['pi:other','1000102'],['email-other','1000103']]){
    sql.prepare('INSERT INTO public_numbers VALUES(?,?,0)').run(n,uid);
    sql.prepare('INSERT INTO clipi_app_owner VALUES(?)').run(uid);
  }
  sql.prepare('INSERT INTO selected_number VALUES(?,?)').run('email-author','8888');
  const clipId=crypto.randomUUID();
  sql.prepare('INSERT INTO short_clip(id,owner,title,object_key) VALUES(?,?,?,?)').run(clipId,'email-author','existing Android film','shorts/fixture');
  const now=Math.floor(Date.now()/1000);
  const emailProof=new Map();
  function session(uid,overrides={}){
    const data={aud:'clipi-f67c0',iss:'https://securetoken.google.com/clipi-f67c0',sub:uid,auth_time:now,exp:now+3600,firebase:{sign_in_provider:'password'},...overrides};
    const proof='verified.'+Buffer.from(JSON.stringify(data)).toString('base64url')+'.fixture';
    emailProof.set(proof,uid);return proof;
  }
  const account=uid=>({localId:uid,email:'user@example.test',providerUserInfo:[{providerId:'password'}]});
  let currentPi='original',activeEmail=true,recipient='pi:original',payId='legacy';
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(url==='https://api.minepi.com/v2/me')return Response.json({uid:currentPi,username:'Original Pi name'});
    if(url.includes('/v1/accounts:lookup?')){
      const uid=emailProof.get(JSON.parse(options.body).idToken);
      return uid?Response.json({users:[account(uid)]}):new Response(null,{status:401});
    }
    if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'read-users'});
    if(url.endsWith('/projects/clipi-f67c0/accounts:lookup')){
      assert.equal(options.headers.Authorization,'Bearer read-users');
      const [uid]=JSON.parse(options.body).localId;
      return Response.json({users:activeEmail?[account(uid)]:[]});
    }
    if(url.endsWith('/payments/'+payId))return Response.json({user_uid:currentPi,identifier:payId,network:'Pi Network',direction:'user_to_app',amount:1,
      metadata:{kind:'diamond_pack',diamonds:1000,rate:1000,uid:recipient},status:{developer_approved:true,developer_completed:true,transaction_verified:true},
      transaction:{txid:(payId==='legacy'?'a':'b').repeat(64)}});
    throw Error('Unexpected service request');
  });
  const json=(body,status=200)=>({body,status});
  const tokenUid=r=>JSON.parse(Buffer.from(r.body.token.split('.')[1],'base64url').toString()).uid;
  const call=(suffix='',body)=>piLogin(new Request('https://clipi.example/auth/pi'+suffix,{method:'POST',
    headers:{Authorization:'Bearer pi-proof','Content-Type':'application/json'},body:body&&JSON.stringify(body)}),env,json,'api');
  const request={piUid:'pi:original',emailToken:session('email-author')};
  const confirm={...request,confirmNumber:'8888'};
  const links=()=>sql.prepare('SELECT count(*) AS n FROM clipi_pi_login_link').get().n;
  assert.equal(tokenUid(await call()),'pi:original');
  assert.equal((await call('/link-preview',{...request,piUid:'pi:other'})).status,409);
  assert.equal((await call('/link-preview',{...request,emailToken:session('ordinary')})).status,403);
  assert.equal((await call('/link-preview',{...request,emailToken:session('email-author',{auth_time:now-600})})).status,401);
  assert.equal((await call('/link-preview',{...request,emailToken:session('email-author',{firebase:{sign_in_provider:'custom'}})})).status,401);
  const preview=await call('/link-preview',request);
  assert.deepEqual(preview.body,{piNumber:'1000100',emailNumber:'8888',linked:false});
  assert.equal((await call('/link-confirm',{...confirm,confirmNumber:'other'})).status,409);
  assert.equal(links(),0);
  const applied=await call('/link-confirm',confirm);
  assert.equal(tokenUid(applied),'email-author');assert.equal(applied.body.username,'');
  assert.equal(tokenUid(await call('/link-confirm',confirm)),'email-author');assert.equal(links(),1);
  const nextLogin=tokenUid(await call());
  assert.equal(nextLogin,'email-author');assert.equal(tokenUid(await call('/original')),'pi:original');
  const gallery=(await shortAccount(q,nextLogin,{op:'shortProfileList'},json,true)).body;
  assert.equal(gallery.canDelete,true);assert.deepEqual(gallery.clips.map(c=>c.id),[clipId]);
  assert.equal((await shortAccount(q,'viewer',{op:'shortProfileList',owner:nextLogin},json,true)).body.canDelete,false);
  assert.equal((await call('/link-confirm',{...confirm,emailToken:session('email-other')})).status,409);
  currentPi='other';
  assert.equal((await call('/link-confirm',{...confirm,piUid:'pi:other'})).status,409);
  assert.equal(tokenUid(await call()),'pi:other');
  currentPi='original';activeEmail=false;
  const disabled=await call();assert.equal(tokenUid(disabled),'pi:original');assert.equal(disabled.body.needsEmail,true);
  activeEmail=true;
  const restore=()=>piGifts(new Request('https://clipi.example/pi-gifts/restore',{method:'POST',body:JSON.stringify({kind:'diamond_pack',paymentId:payId,accessToken:'pi-proof'})}),env,json);
  assert.equal((await restore()).status,200);
  recipient='email-other';payId='new';
  assert.equal((await restore()).status,403);
  recipient='email-author';assert.equal((await restore()).status,200);
  assert.equal((await restore()).status,200);
  assert.deepEqual(sql.prepare('SELECT uid FROM diamond_purchase ORDER BY payment').all().map(p=>p.uid),['pi:original','email-author']);
});
