'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('App.js','utf8');
const config=require('../app.config.js').expo;
test('audio cannot initialize before credentials',()=>{
  const media=app.slice(app.indexOf('function RoomMedia('),app.indexOf('function ConnectedMedia('));
  assert.match(media,/!credentials\?\.token/);
  assert.ok(media.indexOf('!credentials?.token')<media.indexOf('AudioSession.startAudioSession()'));
  assert.match(media,/RTC_NATIVE_ENABLED/);
});
test('video PK is explicitly non-financial preview',()=>{
  assert.match(app,/pkPreviewOpen/);
  assert.match(app,/لم تبدأ المنافسة/);
  assert.match(app,/لا يوجد دعم مؤكد بعد/);
  assert.doesNotMatch(app,/REAL_PURCHASES_ENABLED=true/);
});
test('room options share a single accessible entry point',()=>{
  assert.match(app,/accessibilityLabel="قائمة خيارات الغرفة"/);
  for(const name of ['الخروج من الغرفة','تصغير الغرفة','الإعدادات','مشاركة الغرفة','إخفاء الدردشة'])
    assert.ok(app.includes(name),name);
});
test('production profile is an AAB, not APK',()=>{
  const eas=JSON.parse(fs.readFileSync('eas.json','utf8'));
  assert.equal(eas.build.production.android.buildType,'app-bundle');
  assert.equal(config.android.package,'com.walid.clipi');
});
