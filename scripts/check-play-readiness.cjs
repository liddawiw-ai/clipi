#!/usr/bin/env node
'use strict';
// Intentionally fails closed until release-critical requirements are verified.
const fs=require('node:fs');
const config=require('../app.config.js').expo;
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=fs.readFileSync('App.js','utf8');
const failures=[];
const sdk=Number(String(pkg.dependencies.expo||'').match(/\d+/)?.[0]||0);
if(sdk<54)failures.push('Expo SDK migration and Android API 36 compatibility not verified (SDK '+sdk+')');
if(config.android?.versionCode<=17)failures.push('Android versionCode is '+config.android.versionCode+'; verify next code against Play Console and increment');
if(!config.plugins.some(p=>Array.isArray(p)&&p[0]==='expo-build-properties'&&p[1]?.android?.targetSdkVersion>=36))failures.push('Android targetSdkVersion 36+ not configured and verified');
if(app.includes("EXPO_PUBLIC_ENABLE_LIVEKIT_MEDIA==='true'"))failures.push('Native RTC remains opt-in; real-device audio/video verification outstanding');
if(app.includes('pkPreviewOpen'))failures.push('PK preview remains; real PK signaling and verified score backend outstanding');
if(app.includes('REAL_PURCHASES_ENABLED=false'))failures.push('Real purchases disabled; decide and document launch scope');
if(app.includes('REAL_PAYOUTS_ENABLED=false'))failures.push('Real payouts disabled; decide and document launch scope');
if(!fs.existsSync('release-evidence.json'))failures.push('release-evidence.json (signed-off real-device and policy verification) missing');
if(failures.length){console.error('NOT READY FOR GOOGLE PLAY:');failures.forEach((v,i)=>console.error((i+1)+'. '+v));process.exitCode=1}
else console.log('Static checks passed; manual Play Console and device review still required');
