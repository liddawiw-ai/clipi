import test from 'node:test';
import assert from 'node:assert/strict';
import {deviceInstall} from './device-install.mjs';
const url='https://clipi.example/device-install/';
test('each download choice resolves only to the official listing for Clipi',async()=>{
  for(const platform of ['android','ios']){
    const request=new Request(url+platform+'?availability=1');
    const lookup=async()=>platform==='android'?new Response('app'):Response.json({results:[{bundleId:'com.walid.clipi',trackId:123}]});
    const destination=platform==='android'?'https://play.google.com/store/apps/details?id=com.walid.clipi&gl=US':'https://apps.apple.com/us/app/id123';
    assert.deepEqual(await (await deviceInstall(request,platform,lookup)).json(),{platform,url:destination});
    assert.equal((await deviceInstall(new Request(url+platform),platform,lookup)).headers.get('location'),destination);
    const absent=async()=>platform==='android'?new Response(null,{status:404}):Response.json({results:[{bundleId:'different.app',trackId:124}]});
    assert.deepEqual(await (await deviceInstall(request,platform,absent)).json(),{platform,url:null});
  }
});
