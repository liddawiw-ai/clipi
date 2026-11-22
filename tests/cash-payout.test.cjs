'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Module=require('node:module');
// Provider and database fixtures exercise reservations without moving funds.
const original=Module._load;
let payouts;
try{
 Module._load=function(name,...args){
  if(name==='firebase-functions/v2/https')return {HttpsError:class extends Error{constructor(code,msg){super(msg);this.code=code}}};
  return original.call(this,name,...args);
 };
 payouts=require('../functions/cashPayout');
}finally{Module._load=original}
test('withdrawals reserve funded points once and recover the original request',async()=>{
 const records=new Map([['earningsWallets/u',{availablePoints:3500}]]),orders=new Map();
 function collection(prefix){return {doc(id){const key=prefix+'/'+id;return {key,collection:c=>collection(key+'/'+c),get:async()=>({data:()=>records.get(key)})}}}}
 const db={collection,runTransaction:async cb=>cb({get:r=>r.get(),create:(r,d)=>records.set(r.key,d),update:(r,d)=>{
  for(const [k,v] of Object.entries(d))if(v instanceof Date)d[k]={toMillis:()=>v.getTime()};
  records.set(r.key,{...records.get(r.key),...d});
 }})};
 const prev=globalThis.fetch,previousKey=process.env.TREMENDOUS_API_KEY;
 process.env.TREMENDOUS_API_KEY='test';
 let pending=true,creates=0,deny=false;
 globalThis.fetch=async(url,opt)=>{
  if(url.includes('/products?'))return Response.json({products:[{id:'bank',category:'ach',name:'Bank',countries:[{abbr:'US'}],currency_codes:['USD'],skus:[{min:10,max:1000,currency_code:'USD'}]}]});
  if(opt.method==='POST'){
   if(deny)return Response.json({},{status:402});
   const payload=JSON.parse(opt.body);creates++;assert.equal(payload.reward.value.denomination,20);
   orders.set(payload.external_id,{id:'provider-id',external_id:payload.external_id});
   return Response.json({order:{...orders.get(payload.external_id),status:'PENDING'}});
  }
  const o=orders.get(url.split('/').pop());
  return o?Response.json({order:{...o,status:pending?'PENDING':'EXECUTED',rewards:[{delivery:{link:'https://www.tremendous.com/rewards/test'}}]}}):Response.json({},{status:404});
 };
 const request=(extra={})=>payouts.execute({db,uid:'u',input:{pin:'123456',country:'US',product:'bank',points:2000,...extra},validatePin:v=>v==='123456',checkWalletPin:async()=>{}});
 try{
  assert.deepEqual(await payouts.methods('JO'),[]);
  await assert.rejects(request({points:1900}));
  await assert.rejects(request({pin:''}));
  assert.equal((await request()).state,'pending');
  assert.equal(records.get('earningsWallets/u').availablePoints,1500);
  assert.equal((await request()).state,'pending');
  pending=false;
  assert.equal((await request()).state,'issued');
  assert.equal((await request({receipt:true})).url,'https://www.tremendous.com/rewards/test');
  await assert.rejects(request());
  assert.equal(creates,1);assert.equal(records.get('earningsWallets/u').availablePoints,1500);
  records.set('earningsWallets/u',{availablePoints:3200});deny=true;
  assert.equal((await request()).state,'canceled');
  assert.equal(records.get('earningsWallets/u').availablePoints,3200);
 }finally{globalThis.fetch=prev;if(previousKey===undefined)delete process.env.TREMENDOUS_API_KEY;else process.env.TREMENDOUS_API_KEY=previousKey}
});
