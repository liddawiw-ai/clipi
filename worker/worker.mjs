const encoder = new TextEncoder();

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function signToken(env, payload) {
  const unsigned = [{ alg: 'HS256', typ: 'JWT' }, payload].map(value => base64url(encoder.encode(JSON.stringify(value)))).join('.');
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(env.LIVEKIT_API_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(unsigned));
  return `${unsigned}.${base64url(new Uint8Array(signature))}`;
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/' && request.method === 'GET') return json({ service: 'clipi-livekit' });
    if (!['/token', '/remove-guest', '/close-room'].includes(path) || request.method !== 'POST') return json({ error: 'Not found' }, 404);
    if (!env.FIREBASE_PROJECT_ID || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET ||
        !/^wss:\/\/[^/]+\/?$/.test(env.LIVEKIT_URL ?? '')) {
      return json({ error: 'Service configuration incomplete' }, 503);
    }

    const authorization = request.headers.get('Authorization');
    const match = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/.exec(authorization ?? '');
    if (!match || authorization.length > 8192) return json({ error: 'Unauthorized' }, 401);

    let roomId, uid;
    try {
      const body = await request.text();
      if (body.length > 1024) return json({ error: 'Request too large' }, 413);
      ({ roomId, uid } = JSON.parse(body));
    } catch {
      return json({ error: 'Invalid request' }, 400);
    }
    if (typeof roomId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(roomId)) {
      return json({ error: 'Invalid room' }, 400);
    }

    try {
      const project = env.FIREBASE_PROJECT_ID;
      const roomResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/rooms/${roomId}`,
        { headers: { Authorization: authorization }, signal: AbortSignal.timeout(8000) },
      );
      if ([401, 403].includes(roomResponse.status)) return json({ error: 'Unauthorized' }, 401);
      if (roomResponse.status === 404) return json({ error: 'Room unavailable' }, 404);
      if (!roomResponse.ok) return json({ error: 'Room lookup failed' }, 502);

      // Read claims only after Firestore has validated the same Firebase ID token.
      const part = match[1].split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
      const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part), c => c.charCodeAt(0))));
      if (claims.aud !== project || claims.iss !== `https://securetoken.google.com/${project}` ||
          typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) {
        return json({ error: 'Unauthorized' }, 401);
      }
      const { fields } = await roomResponse.json();
      const type = fields?.type?.stringValue;
      const status = fields?.status?.stringValue;
      if (!['audio', 'video'].includes(type) || status !== (path === '/close-room' ? 'closed' : 'open')) {
        return json({ error: 'Room unavailable' }, 404);
      }

      const host = fields.ownerUid?.stringValue === claims.sub;
      const guests = fields.stageGuests?.mapValue?.fields ?? {};
      const liveRoom = `clipi-${roomId}`;
      const now = Math.floor(Date.now() / 1000);
      if (path !== '/token') {
        if (!host) return json({ error: 'Forbidden' }, 403);
        const closing = path === '/close-room';
        if (!closing && (typeof uid !== 'string' || !uid || uid.length > 128 || uid === claims.sub || Object.hasOwn(guests, uid))) {
          return json({ error: 'Invalid guest' }, 400);
        }
        const admin = await signToken(env, {
          iss: env.LIVEKIT_API_KEY, sub: claims.sub, nbf: now - 5, exp: now + 30,
          video: closing ? { roomCreate: true } : { roomAdmin: true, room: liveRoom },
        });
        const origin = new URL(env.LIVEKIT_URL.replace('wss:', 'https:')).origin;
        const method = closing ? 'DeleteRoom' : 'RemoveParticipant';
        const result = await fetch(origin + '/twirp/livekit.RoomService/' + method, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + admin, 'Content-Type': 'application/json' },
          body: JSON.stringify(closing ? { room: liveRoom } : { room: liveRoom, identity: uid }),
          signal: AbortSignal.timeout(8000),
        });
        return result.ok || result.status === 404 ? json({ removed: true }) : json({ error: 'Removal failed' }, 502);
      }
      const publisher = host || typeof guests[claims.sub]?.stringValue === 'string';
      const video = {
        roomJoin: true,
        room: liveRoom,
        canSubscribe: true,
        canPublish: publisher,
        canPublishData: false,
      };
      if (publisher) video.canPublishSources = type === 'audio' ? ['microphone'] : ['microphone', 'camera'];
      const payload = { iss: env.LIVEKIT_API_KEY, sub: claims.sub, nbf: now - 5, exp: now + 120, video };
      return json({ serverUrl: env.LIVEKIT_URL, token: await signToken(env, payload) });
    } catch {
      return json({ error: 'Media service temporarily unavailable' }, 502);
    }
  },
};
