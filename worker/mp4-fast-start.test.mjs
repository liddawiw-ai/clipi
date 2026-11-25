import assert from 'node:assert/strict';
import test from 'node:test';
import {fastStartLayout, mediaSpans} from './mp4-fast-start.mjs';

function atom(type,...parts) {
  const payload = Buffer.concat(parts);
  const head = Buffer.alloc(8);
  head.writeUInt32BE(8 + payload.length);
  head.write(type,4,'ascii');
  return Buffer.concat([head,payload]);
}

for (const type of ['stco','co64']) {
  test('relocate a trailing index including '+type+' offsets and ranged reads',async () => {
    const ftyp = atom('ftyp',Buffer.from('isom'));
    const mdat = atom('mdat',Buffer.from('abcdefghijklmnopqrstuv'));
    const entry = Buffer.alloc(type === 'stco' ? 12 : 16);
    entry.writeUInt32BE(1,4);
    const offset = ftyp.length + 10;
    if (type === 'co64') entry.writeBigUInt64BE(BigInt(offset),8);
    else entry.writeUInt32BE(offset,8);
    const moov = atom('moov',atom('trak',atom('mdia',atom('minf',atom('stbl',atom(type,entry))))));
    const file = Buffer.concat([ftyp,mdat,atom('free'),moov,atom('free')]);
    const layout = await fastStartLayout(file.length,(s,n)=>file.subarray(s,s+n));
    const mapped = (s,n) => Buffer.concat(mediaSpans(layout,file.length,s,n).map(span=>
      (span.index || file).subarray(span.offset,span.offset+span.length)));
    const result = mapped(0,file.length);
    assert.equal(result.subarray(ftyp.length+4,ftyp.length+8).toString(),'moov');
    const field = result.indexOf(type,'ascii')+12;
    assert.equal(type==='co64'?Number(result.readBigUInt64BE(field)):result.readUInt32BE(field),offset+moov.length);
    assert.deepEqual(result.subarray(ftyp.length+moov.length,ftyp.length+moov.length+mdat.length),mdat);
    for (let s=0;s<result.length;s++) assert.deepEqual(mapped(s,11),result.subarray(s,s+11));
    assert.equal(await fastStartLayout(result.length,(s,n)=>result.subarray(s,s+n)),null);
    const fragmented=Buffer.concat([ftyp,atom('moof'),mdat,moov]);
    assert.equal(await fastStartLayout(fragmented.length,(s,n)=>fragmented.subarray(s,s+n)),null);
  });
}
