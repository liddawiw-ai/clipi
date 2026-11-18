'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const backend=fs.readFileSync('functions/index.js','utf8');
const wallet=fs.readFileSync('EarningsWalletScreen.js','utf8');
const store=fs.readFileSync('components/Store.js','utf8');
const app=fs.readFileSync('App.js','utf8');

test('six-digit PIN validation is not double escaped',()=>{
 const declaration=backend.match(/const validatePin=pin=>typeof pin==='string'&&([^;]+);/);
 assert.ok(declaration,'Missing server PIN validator');
 const valid=new Function('pin',`return typeof pin==='string'&&${declaration[1]}`);
 for(const pin of ['000000','123456','987654'])assert.equal(valid(pin),true);
 for(const pin of ['12345','1234567','abcdef','12345a','12 456','',123456,'\\d{6}'])
  assert.equal(valid(pin),false,`invalid PIN accepted: ${String(pin)}`);
});

test('PIN brute-force lockout and safe hash verification exist',()=>{
 assert.match(backend,/PIN_MAX_FAILURES=5/);
 assert.match(backend,/PIN_LOCK_MS=15\*60\*1000/);
 assert.match(backend,/until>0&&until<=now\?0:/,'Expired PIN lock must reset failed-attempt count');
 assert.match(backend,/timingSafeEqual\(actual,expected\)/);
 assert.match(backend,/checkWalletPin\(ref,currentPin\)/);
 assert.match(backend,/checkWalletPin\(db\.collection\('earningsWallets'\)/);
});

test('redemption minimum and payout gates remain safe',()=>{
 assert.match(backend,/minConversionPoints:2000/);
 assert.match(backend,/POINTS_MIN=2000/);
 assert.match(backend,/canRequest:false/);
 assert.match(backend,/REAL_PAYMENTS_ENABLED=false/);
 assert.match(backend,/REAL_PAYOUTS_ENABLED=false/);
 assert.match(backend,/executable:false/);
});

test('support conversion policy is arithmetically consistent',()=>{
 const policy=backend.match(/const SUPPORT_POLICY=Object\.freeze\((\{[^;]+\})\);/);
 assert.ok(policy,'Support policy missing');
 const p=new Function('return ('+policy[1]+')')();
 assert.equal(p.hostPercent+p.agentPercent+p.platformPercent,100);
 assert.equal(p.pointsPerUsd,100);
 assert.equal(p.minConversionPoints,2000);
 assert.equal(p.minConversionPoints/p.pointsPerUsd,20);
 assert.equal(p.minConversionPoints/p.pointsPerUsd*p.diamondsPerConversionUsd,22000);
});

test('luck gifts allocate the same support regardless of outcome',()=>{
 const start=backend.indexOf('function quoteLuckGiftSupport(');
 const end=backend.indexOf('exports.quoteLuckGiftSupport=',start);
 assert.ok(start>=0&&end>start);
 const policyMatch=backend.match(/const SUPPORT_POLICY=Object\\.freeze\\((\\{[^;]+\\})\\);/);
 assert.ok(policyMatch);
 const policy=new Function('return ('+policyMatch[1]+')')();
 const quote=new Function('SUPPORT_POLICY','HttpsError',backend.slice(start,end)+'; return quoteLuckGiftSupport;')(
  policy,class extends Error{});
 const paid=quote(1000,'paid');
 assert.equal(paid.grossHalfPoints,100);
 assert.equal(paid.hostHalfPoints,55);
 assert.equal(paid.agentHalfPoints,10);
 assert.equal(paid.ownerHalfPoints,35);
 assert.equal(paid.hostHalfPoints/2,27.5);
 assert.equal(paid.agentHalfPoints/2,5);
 assert.equal(paid.ownerHalfPoints/2,17.5);
 for(const source of ['welcome','ownerPromo','redeemed']){
  const free=quote(1000,source);
  assert.equal(free.grossHalfPoints,0);
  assert.equal(free.hostHalfPoints,0);
 }
 assert.match(backend,/senderBonusDiamonds:0,executable:false/);
 assert.doesNotMatch(backend.slice(start,end),/outcome/);
});

test('biometric wallet locks on background and ignores stale requests',()=>{
 assert.match(wallet,/LocalAuthentication\.authenticateAsync\(/);
 assert.match(wallet,/requestEpochRef\.current\+=1/);
 assert.match(wallet,/epoch===requestEpochRef\.current/);
 assert.match(wallet,/state==='background'/);
 assert.match(app,/page==='earningsWallet'/);
});

test('legacy shop cannot grant diamonds locally',()=>{
 assert.doesNotMatch(store,/setDiamonds\s*\(/);
 assert.match(store,/الشراء غير مفعّل/);
});

test('audio occupancy is unique per user',()=>{
 assert.match(backend,/already occupy another audio seat/);
});
