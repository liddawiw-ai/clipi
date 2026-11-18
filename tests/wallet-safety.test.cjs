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
