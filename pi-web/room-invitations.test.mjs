import test from 'node:test';
import assert from 'node:assert/strict';
import {copyRoomInvitation,roomInvitationId,roomInvitationUrl,shareRoomInvitation} from './room-invitations.mjs';

const origin = 'https://clipi-mainnet.example';
const roomId = 'Room_aB-123';
const url = roomInvitationUrl(origin, roomId);

test('new and previously sent invitations resolve to the same room', () => {
  assert.equal(url, origin + '/room?room=' + roomId);
  assert.equal(roomInvitationId(new URL(url)), roomId);
  assert.equal(roomInvitationId(new URL('/#room=' + roomId, origin)), roomId);
  assert.equal(roomInvitationId(new URL('/room#room=' + roomId, origin)), roomId);
  assert.equal(roomInvitationId(new URL('/room?room=%2Fbad', origin)), null);
});

test('native share succeeds or leaves the invitation available for copying', async () => {
  const invitation = {title:'Room',url};
  assert.equal(await shareRoomInvitation({share:async data => assert.deepEqual(data, invitation)}, invitation), 'shared');
  assert.equal(await shareRoomInvitation({}, invitation), 'unavailable');
  assert.equal(await shareRoomInvitation({canShare:()=>false,share:async()=>assert.fail()}, invitation), 'unavailable');
  assert.equal(await shareRoomInvitation({share:async()=>{throw new DOMException('denied','NotAllowedError')}}, invitation), 'unavailable');
  assert.equal(await shareRoomInvitation({share:async()=>{throw new DOMException('cancelled','AbortError')}}, invitation), 'cancelled');
});

test('clipboard permissions can fall back to copying the visible selection', async () => {
  const actions = [];
  const input = {focus:()=>actions.push('focus'),setSelectionRange:(...range)=>actions.push(range)};
  const doc = {execCommand:command=>{actions.push(command);return true}};
  const denied = {clipboard:{writeText:async()=>{throw new DOMException('denied','NotAllowedError')}}};
  assert.equal(await copyRoomInvitation(denied,doc,input,url), true);
  assert.deepEqual(actions,['focus',[0,url.length],'copy']);
  assert.equal(await copyRoomInvitation({}, {}, input, url), false);
  const clipboard = {writeText:async data=>assert.equal(data,url)};
  assert.equal(await copyRoomInvitation({clipboard}, {}, null, url), true);
});
