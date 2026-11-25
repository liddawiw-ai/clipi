import {fastStartLayout, mediaSpans} from './mp4-fast-start.mjs';
import {withKnownLength} from './video-storage.mjs';

// Metadata only. Every request still checks the published row and bucket object,
// including after a deletion. ETags keep versions of a key separate.
const layouts = new Map();
async function layoutFor(bucket, key, head) {
  const cacheKey = head.etag ? key + ':' + head.etag : null;
  if (cacheKey && layouts.has(cacheKey)) return layouts.get(cacheKey);
  let start = 0, window = new Uint8Array();
  const layout = await fastStartLayout(head.size, async (offset, length) => {
    if (offset < start || offset + length > start + window.length) {
      start = offset;
      const count = Math.min(head.size-offset, Math.max(length,16384));
      const object = await bucket.get(key, {range:{offset,length:count}});
      if (!object) throw Error('Missing video object');
      window = new Uint8Array(await new Response(object.body).arrayBuffer());
    }
    return window.subarray(offset-start,offset-start+length);
  });
  if (cacheKey) {
    if (layouts.size >= 8) layouts.delete(layouts.keys().next().value);
    layouts.set(cacheKey,layout);
  }
  return layout;
}

export async function bucketPlayback(request, bucket, key, head, spec) {
  const {status, headers, offset, length} = spec;
  if (request.method === 'HEAD') return new Response(null, {status,headers});
  const layout = offset+length <= 8 ? null : await layoutFor(bucket,key,head);
  if (!layout) {
    const options = status === 206 ? {range:{offset,length}} : {};
    const object = await bucket.get(key,options);
    if (!object) return null;
    return new Response(object.body,{status,headers});
  }
  const spans = mediaSpans(layout,head.size,offset,length);
  let reader = null, cancelled = false;
  const body = new ReadableStream({
    async pull(controller) {
      while (!cancelled) {
        if (reader) {
          const part = await reader.read();
          if (cancelled) return;
          if (!part.done) {controller.enqueue(part.value); return;}
          reader.releaseLock(); reader=null;
        }
        const span = spans.shift();
        if (!span) {controller.close(); return;}
        if (span.index) {
          controller.enqueue(span.index.subarray(span.offset,span.offset+span.length));
          return;
        }
        const object = await bucket.get(key,{range:{offset:span.offset,length:span.length}});
        if (!object) throw Error('Missing video object');
        reader = new Response(object.body).body.getReader();
        if (cancelled) await reader.cancel();
      }
    },
    cancel(reason) {cancelled=true;return reader?.cancel(reason);}
  });
  return new Response(withKnownLength(body,length), {status,headers});
}
