import test from 'node:test';
import assert from 'node:assert/strict';
import {serveShort} from './short-videos.mjs';
const id='ec39acf4-fc6e-46ad-a2c4-91f32543c36a',url='https://clipi.example/shorts/media/'+id;
const storage={getByName:()=>({fetch:()=>new Response('file',{status:206})})};
const query=()=>({first:async()=>({object_key:'cloud/'+id})});
test('opening a shared video uses the inline player, while file requests and downloads retain media semantics',async()=>{
  for(const [queryString,headers,method,status] of [
    ['',{'Sec-Fetch-Dest':'document'},'GET',302],['',{Accept:'text/html'},'GET',302],
    ['',{'Sec-Fetch-Dest':'video',Accept:'*/*'},'GET',206],
    ['?download=1',{Accept:'text/html'},'GET',206],['',{Range:'bytes=0-1',Accept:'text/html'},'GET',206],
    ['',{Accept:'text/html'},'HEAD',206]]){
    const response=await serveShort(new Request(url+queryString,{method,headers}),null,query,id,Response.json,storage);
    assert.equal(response.status,status);
    if(status===302)assert.equal(response.headers.get('location'),'https://clipi.example/room#short='+id);
  }
});
