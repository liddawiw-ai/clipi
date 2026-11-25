// Expose ordinary, single-mdat MP4s as fast-start files without rewriting the original.
// Unknown layouts and fragmented movies keep their original byte representation.
const maxIndexBytes = 1024 * 1024;
const containers = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'dinf']);
const unsupported = new Set(['cmov', 'mvex', 'saio', 'saiz', 'senc', 'iloc', 'rmra']);
const ordinaryTopLevel = new Set(['ftyp', 'mdat', 'moov', 'free', 'skip', 'wide']);

function box(bytes, offset, available) {
  if (available < 8 || offset + 8 > bytes.length) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let size = view.getUint32(offset) || available;
  let header = 8;
  if (size === 1) {
    if (offset + 16 > bytes.length) return null;
    size = Number(view.getBigUint64(offset + 8));
    header = 16;
  }
  if (!Number.isSafeInteger(size) || size < header || size > available) return null;
  return {type:String.fromCharCode(...bytes.subarray(offset + 4, offset + 8)), size, header};
}

function movieIndex(bytes, mdat) {
  const output = Uint8Array.from(bytes);
  const view = new DataView(output.buffer);
  let tables = 0;
  function walk(start, end, depth) {
    if (depth > 8) return false;
    for (let pos = start; pos < end;) {
      const b = box(output, pos, end - pos);
      if (!b || unsupported.has(b.type)) return false;
      const body = pos + b.header, next = pos + b.size;
      if (containers.has(b.type)) {
        if (!walk(body, next, depth + 1)) return false;
      } else if (b.type === 'stco' || b.type === 'co64') {
        const width = b.type === 'co64' ? 8 : 4;
        if (body + 8 > next || view.getUint32(body) !== 0) return false;
        const count = view.getUint32(body + 4);
        if (body + 8 + count * width !== next) return false;
        for (let p = body + 8; p < next; p += width) {
          const old = width === 8 ? Number(view.getBigUint64(p)) : view.getUint32(p);
          if (old < mdat.start + mdat.header || old >= mdat.start + mdat.size) return false;
          const updated = old + output.length;
          if (width === 8) view.setBigUint64(p, BigInt(updated));
          else if (updated <= 0xffffffff) view.setUint32(p, updated);
          else return false;
        }
        if (count) tables++;
      } else if (b.type === 'meta') {
        // QuickTime metadata may start with a child box; ISO metadata has version/flags first.
        let child = body;
        if (child + 4 <= next && view.getUint32(child) === 0) child += 4;
        for (; child < next;) {
          const item = box(output, child, next-child);
          if (!item || !['hdlr','keys','ilst','free'].includes(item.type)) return false;
          child += item.size;
        }
      }
      pos = next;
    }
    return true;
  }
  return walk(0, output.length, 0) && tables ? output : null;
}

export async function fastStartLayout(size, read) {
  let mdat, movie, count = 0;
  for (let start = 0; start < size;) {
    if (++count > 32) return null;
    const bytes = await read(start, Math.min(16, size - start));
    const b = box(bytes, 0, size - start);
    if (!b || !ordinaryTopLevel.has(b.type)) return null;
    if (b.type === 'mdat') {
      if (mdat) return null;
      mdat = {...b, start};
    }
    if (b.type === 'moov') {
      if (!mdat || movie || b.size > maxIndexBytes || new DataView(bytes.buffer, bytes.byteOffset).getUint32(0) === 0) return null;
      movie = {...b, start};
    }
    start += b.size;
  }
  if (!movie) return null;
  const bytes = await read(movie.start, movie.size);
  if (bytes.length !== movie.size) throw Error('Incomplete MP4 index');
  const index = movieIndex(bytes, mdat);
  return index ? {insert:mdat.start, original:movie.start, index} : null;
}

// Map a browser byte range to source spans or a slice of the relocated index.
export function mediaSpans(layout, size, offset, length) {
  if (!layout) return [{offset, length}];
  const {insert, original, index} = layout;
  const sections = [
    {offset:0, length:insert},
    {offset:0, length:index.length, index},
    {offset:insert, length:original-insert},
    {offset:original+index.length, length:size-original-index.length}
  ];
  const result = [];
  let pos = 0;
  for (const section of sections) {
    const start = Math.max(pos, offset), end = Math.min(pos+section.length, offset+length);
    if (end > start) result.push({...section, offset:section.offset+start-pos, length:end-start});
    pos += section.length;
  }
  return result;
}
