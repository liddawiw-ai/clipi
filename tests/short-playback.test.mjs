import assert from 'node:assert/strict';
import test from 'node:test';
import {createShortPlayback,stopShortPlayback} from '../short-playback.mjs';

test('a swipe or a route change silences the old player before a successor starts',()=>{
  const feed=createShortPlayback(),profile=createShortPlayback(),events=[];
  const player=id=>({start:()=>events.push('play '+id),stop:()=>events.push('stop '+id)});
  const first=player('first'),second=player('second'),third=player('third');
  feed.select('a');feed.focus();
  const detach=feed.attach('a',first);
  feed.attach('b',second);feed.attach('c',third);
  feed.select('b');feed.select('c');
  assert.deepEqual(events,['play first','stop first','play second','stop second','play third']);
  assert.ok(!feed.owns(first)&&!feed.owns(second)&&feed.owns(third));
  stopShortPlayback();
  assert.equal(events.at(-1),'stop third');
  feed.select('a');
  assert.ok(!feed.isSelected('a'));
  profile.select('a');profile.focus();profile.attach('a',player('profile'));
  detach();feed.blur();
  assert.equal(events.at(-1),'play profile');
  profile.blur();
  assert.equal(events.at(-1),'stop profile');
});
