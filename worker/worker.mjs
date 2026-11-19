const encoder = new TextEncoder();

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/' && request.method === 'GET') return json({ service: 'clipi-livekit' });
    if (path !== '/token' || request.method !== 'POST') return json({ error: 'Not found' }, 404);
    if (!env.FIREBASE_PROJECT_ID || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET ||
        !/^wss:\/\/[^/]+\/?$/.test(env.LIVEKIT_URL ?? '')) {
      return json({ error: 'Service configuration incomplete' }, 503);
    }

    const authorization = request.headers.get('Authorization');
    const match = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/.exec(authorization ?? '');
    if (!match || authorization.length > 8192) return json({ error: 'Unauthorized' }, 401);

    let roomId;
    try {
      const body = await request.text();
      if (body.length > 1024) return json({ error: 'Request too large' }, 413);
      ({ roomId } = JSON.parse(body));
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
      if (fields?.status?.stringValue !== 'open' || !['audio', 'video'].includes(type)) {
        return json({ error: 'Room unavailable' }, 404);
      }

      const host = fields.ownerUid?.stringValue === claims.sub;
      const now = Math.floor(Date.now() / 1000);
      const video = {
        roomJoin: true,
        room: `clipi-${roomId}`,
        canSubscribe: true,
        canPublish: host,
        canPublishData: false,
      };
      if (host) video.canPublishSources = type === 'audio' ? ['microphone'] : ['microphone', 'camera'];
      const payload = { iss: env.LIVEKIT_API_KEY, sub: claims.sub, nbf: now - 5, exp: now + 120, video };
      const unsigned = [{ alg: 'HS256', typ: 'JWT' }, payload].map(value => base64url(encoder.encode(JSON.stringify(value)))).join('.');
      const key = await crypto.subtle.importKey(
        'raw', encoder.encode(env.LIVEKIT_API_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
      );
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(unsigned));
      return json({ serverUrl: env.LIVEKIT_URL, token: `${unsigned}.${base64url(new Uint8Array(signature))}` });
    } catch {
      return json({ error: 'Media service temporarily unavailable' }, 502);
    }
  },
};
