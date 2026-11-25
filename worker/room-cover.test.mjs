import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {coverSchema,saveCover,coverResponse} from './room-cover.mjs';
import {roomHistorySchema} from './room-history.mjs';

test('voice and video covers are owned by the host, survive reopening, change independently and can be removed',async()=>{
  const db=new DatabaseSync(':memory:');
  db.exec(coverSchema);db.exec(roomHistorySchema.find(sql=>sql.startsWith('CREATE TABLE IF NOT EXISTS room_continuation(')));
  const q=(sql,...params)=>({first:()=>db.prepare(sql).get(...params),run:()=>db.prepare(sql).run(...params)});
  const json=(body,status=200)=>({...body,status});
  const photo=name=>readFileSync(new URL('../pi-web/assets/shorts/'+name+'.jpg',import.meta.url));
  const pic=name=>'data:image/jpeg;base64,'+photo(name).toString('base64');
  const fields={ownerUid:{stringValue:'alice'},status:{stringValue:'open'}};
  const save=(room,id,image)=>saveCover(q,room,id,fields,image,json);
  const voice=await save('voice','alice',pic('palace')),video=await save('video','alice',pic('dunes'));
  assert.ok(voice.cover&&video.cover);assert.equal((await save('voice','guest',null)).status,403);
  assert.equal((await save('voice','alice','data:text/plain;base64,AAAA')).status,400);
  assert.equal((await saveCover(q,'voice','alice',{...fields,status:{stringValue:'closed'}},null,json)).status,403);
  for(const [room,token,file] of [['voice',voice.cover,'palace'],['video',video.cover,'dunes']]){
    const response=await coverResponse(q,room,token);
    assert.equal(response.headers.get('Content-Type'),'image/jpeg');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),photo(file));
  }
  db.prepare('INSERT INTO room_continuation(previous,session,root,owner) VALUES(?,?,?,?)').run('voice','reopened','voice','alice');
  assert.equal((await coverResponse(q,'reopened',voice.cover)).status,200);
  const changed=await save('reopened','alice',pic('aurora'));
  assert.notEqual(changed.cover,voice.cover);assert.equal((await coverResponse(q,'voice',voice.cover)).status,404);
  assert.equal((await coverResponse(q,'voice',changed.cover)).status,200);
  assert.equal((await save('reopened','alice',null)).cover,null);
  assert.equal((await coverResponse(q,'voice',changed.cover)).status,404);
  assert.equal((await coverResponse(q,'video',video.cover)).status,200);db.close();
});
