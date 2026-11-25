import {fastStartLayout, mediaSpans} from './mp4-fast-start.mjs';
import {checkShortVideo, maxShortBytes, sizeError} from '../pi-web/short-upload-limits.mjs';

const chunkBytes = 256 * 1024;
const internalUrl = 'https://video.internal/file';
const failure = (error, status) => Response.json({error}, {status, headers: {'Cache-Control': 'no-store'}});

export async function readMp4(request) {
  const declared = request.headers.get('content-length');
  const size = declared === null ? null : Number(declared);
  const tooLarge = () => failure(sizeError, 413);
  if (size !== null && (!Number.isSafeInteger(size) || size < 12 || size > maxShortBytes)) return tooLarge();
  if (!request.body) return tooLarge();

  const reader = request.body.getReader();
  const buffer = new Uint8Array(size ?? maxShortBytes);
  let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    if (value.byteLength > buffer.length - length) {
      await reader.cancel();
      return tooLarge();
    }
    buffer.set(value, length);
    length += value.byteLength;
  }
  if (length < 12 || (size !== null && length !== size)) return tooLarge();
  const bytes = buffer.subarray(0, length);
  if (String.fromCharCode(...bytes.subarray(4, 8)) !== 'ftyp') return failure('اختر فيديو بصيغة MP4', 415);
  const problem = await checkShortVideo(bytes);
  return problem ? failure(problem.error, problem.status) : bytes;
}

export function playback(request, size) {
  const headers = new Headers({'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400', 'Content-Length': String(size)});
  const value = request.headers.get('Range');
  if (!value) return {headers, status: 200, offset: 0, length: size};
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  const start = match?.[1] ? Number(match[1]) : Math.max(size - Number(match?.[2]), 0);
  const end = match?.[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!match || !(match[1] || match[2]) || !(start >= 0 && start <= end && start < size)) {
    return new Response(null, {status: 416, headers: {'Content-Range': 'bytes */' + size}});
  }
  headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
  headers.set('Content-Length', String(end - start + 1));
  return {headers, status: 206, offset: start, length: end - start + 1};
}

// workerd derives Content-Length from the stream type, even for HTTP 206.
export function withKnownLength(body, length) {
  if (!body || typeof FixedLengthStream === 'undefined') return body;
  const fixed = new FixedLengthStream(length);
  body.pipeTo(fixed.writable).catch(() => {}); // Client cancellation also cancels the source.
  return fixed.readable;
}

// A clip has one private object. The first complete upload wins, including on concurrent retries.
export class ClipiVideo {
  constructor(ctx) {
    this.storage = ctx.storage;
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS deletion (id INTEGER PRIMARY KEY)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS parts(part INTEGER PRIMARY KEY, bytes BLOB NOT NULL)');
  }

  size() {
    const [tail] = this.sql.exec('SELECT part, length(bytes) AS length FROM parts ORDER BY part DESC LIMIT 1');
    return tail ? tail.part * chunkBytes + tail.length : 0;
  }

  // SQLite substr uses one-based offsets. A small metadata/range probe reads only
  // those bytes, including when the requested range crosses a stored part.
  readBytes(offset, length) {
    const bytes = new Uint8Array(length);
    let written = 0;
    while (written < length) {
      const from = offset % chunkBytes;
      const take = Math.min(chunkBytes - from, length - written);
      const row = this.sql.exec('SELECT substr(bytes, ?, ?) AS bytes FROM parts WHERE part = ?',
        from + 1, take, Math.floor(offset / chunkBytes)).one();
      const piece = new Uint8Array(row.bytes);
      if (piece.length !== take) throw Error('Incomplete video part');
      bytes.set(piece, written);
      written += take;
      offset += take;
    }
    return bytes;
  }

  async readLayout(size) {
    if (!this.layout) {
      this.layout = fastStartLayout(size, (offset, length) => this.readBytes(offset, length))
        .catch(error => { this.layout = null; throw error; });
    }
    return this.layout;
  }

  async fetch(request) {
    if (request.method === 'DELETE') {
      this.layout = null;
      this.storage.transactionSync(() => {
        this.sql.exec('INSERT OR IGNORE INTO deletion(id) VALUES(1)');
        this.sql.exec('DELETE FROM parts');
      });
      return new Response(null, {status: 204});
    }
    if (request.method === 'PUT') {
      if (!this.size()) {
        const bytes = await readMp4(request);
        if (bytes instanceof Response) return bytes;
        // Recheck after the body arrived so a late upload cannot restore a removed clip.
        const retired = this.storage.transactionSync(() => {
          if (this.sql.exec('SELECT id FROM deletion').toArray().length) return true;
          if (this.size()) return false;
          for (let offset = 0; offset < bytes.length; offset += chunkBytes) {
            this.sql.exec('INSERT INTO parts(part, bytes) VALUES(?, ?)', offset / chunkBytes,
              bytes.slice(offset, offset + chunkBytes).buffer);
          }
          return false;
        });
        if (retired) return failure('الفيديو غير موجود', 404);
      }
      return new Response(null, {status: 204});
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return failure('Method not allowed', 405);
    const size = this.size();
    if (!size) return failure('الفيديو غير موجود', 404);
    const spec = playback(request, size);
    if (spec instanceof Response) return spec;
    const {headers, status, offset, length} = spec;
    if (request.method === 'HEAD') return new Response(null, {status, headers});
    const layout = offset + length <= 8 ? null : await this.readLayout(size);
    const spans = mediaSpans(layout, size, offset, length);
    let spanIndex = 0, used = 0;
    const body = new ReadableStream({
      pull: controller => {
        const span = spans[spanIndex], from = span.offset + used;
        const take = Math.min(span.length - used, chunkBytes - from % chunkBytes);
        const bytes = span.index ? span.index.subarray(from, from+take) : this.readBytes(from,take);
        controller.enqueue(bytes);
        used += bytes.length;
        if (used === span.length) {spanIndex++; used=0;}
        if (spanIndex === spans.length) controller.close();
      }
    });
    return new Response(withKnownLength(body,length), {status, headers});
  }
}

export function putVideo(namespace, key, request) {
  const headers = new Headers({'Content-Type': 'video/mp4'});
  if (request.headers.has('Content-Length')) headers.set('Content-Length', request.headers.get('Content-Length'));
  return namespace.getByName(key).fetch(internalUrl, {method: 'PUT', headers, body: request.body});
}

export function removeVideo(namespace, key) {
  return namespace.getByName(key).fetch(internalUrl, {method: 'DELETE'});
}

export function getVideo(namespace, key, request) {
  const headers = new Headers();
  if (request.headers.has('Range')) headers.set('Range', request.headers.get('Range'));
  return namespace.getByName(key).fetch(internalUrl, {method: request.method, headers});
}

export async function starterVideo(assets, namespace, request) {
  const url = new URL(request.url);
  url.search = '';
  const meta = await assets.fetch(new Request(url, {method: 'HEAD'}));
  const version = meta.headers.get('ETag');
  if (!meta.ok || !version) return assets.fetch(request);
  const key = url.pathname + '/' + version;
  const existing = await getVideo(namespace, key, request);
  if (existing.status !== 404) return existing;
  const original = await assets.fetch(new Request(url));
  if (!original.ok) return original;
  const stored = await putVideo(namespace, key, original);
  if (!stored.ok) return stored;
  return getVideo(namespace, key, request);
}
