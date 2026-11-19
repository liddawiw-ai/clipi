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
    if (path === '/room' && request.method === 'GET') return new Response(roomPage, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
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

const roomPage = "<!doctype html><html lang=\"ar\" dir=\"rtl\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"referrer\" content=\"no-referrer\"><title>غرفة كليبي</title>\n<style>*{box-sizing:border-box}body{margin:0;background:#071934;color:#fff;font:18px system-ui}main{max-width:680px;margin:auto;padding:24px}video{width:100%;max-height:38vh;background:#102b52;border-radius:18px}button,input{padding:12px;margin:6px 0;border:0;border-radius:10px;font:inherit}button{background:#a8e6ff;color:#092947}button:disabled{opacity:.5}#status{min-height:2em}#controls{display:flex;flex-wrap:wrap;gap:8px}</style>\n<main><h1>غرفة كليبي</h1><p id=\"status\" role=\"status\">جارٍ تحميل أدوات الاتصال…</p><button id=\"join\" disabled>دخول الغرفة</button> <button id=\"google\" hidden>الدخول بحساب Google</button><div id=\"controls\"><button id=\"invite\" hidden>نسخ رابط الدعوة</button><button id=\"mic\" disabled>تشغيل الميكروفون</button><button id=\"cam\" disabled>تشغيل الكاميرا</button><button id=\"sound\" disabled>سماع الصوت</button><button id=\"leave\" disabled>مغادرة</button></div><div id=\"requests\"></div><div id=\"media\"></div></main>\n<script type=\"module\">\nconst el=id=>document.getElementById(id), status=t=>el('status').textContent=t;\ntry {\nconst [app,au,db,lk]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'),import('https://cdn.jsdelivr.net/npm/livekit-client@2.15.4/dist/livekit-client.esm.mjs')]);\nconst firebase=app.initializeApp({apiKey:'AIzaSyAjP8dTGO_XdWrtmNRZQS4fifNalGzI2wI',authDomain:'clipi-f67c0.firebaseapp.com',projectId:'clipi-f67c0'}), auth=au.getAuth(firebase), fs=db.getFirestore(firebase);\nlet room,ref,user,host=false,publishing=false,stops=[],busy=false;const incoming=new URLSearchParams(location.hash.slice(1)).get('room');\nasync function token(path){const res=await fetch('/'+path,{method:'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},body:JSON.stringify({roomId:ref.id})});if(!res.ok)throw Error('خادم الغرفة أعاد '+res.status);return res.json()}\nfunction attach(track,local=false){const item=track.attach();if(local)item.muted=true;item.playsInline=true;item.autoplay=true;el('media').append(item)}\nfunction teardown(){stops.splice(0).forEach(stop=>stop());room?.disconnect();room=null;el('media').replaceChildren();el('requests').replaceChildren();for(const id of ['mic','cam','sound','leave'])el(id).disabled=true;el('invite').hidden=true;el('join').disabled=false}\nasync function connect(){const data=await token('token');room=new lk.Room();room.on(lk.RoomEvent.TrackSubscribed,t=>attach(t));room.on(lk.RoomEvent.TrackUnsubscribed,t=>t.detach().forEach(n=>n.remove()));room.on(lk.RoomEvent.LocalTrackPublished,p=>{if(p.track?.kind==='video')attach(p.track,true)});room.on(lk.RoomEvent.LocalTrackUnpublished,p=>p.track?.detach().forEach(n=>n.remove()));await room.connect(data.serverUrl,data.token);el('sound').disabled=false;el('leave').disabled=false;el('mic').disabled=el('cam').disabled=!publishing;status(publishing?'متصل. شغّل الميكروفون والكاميرا.':'متصل. بانتظار موافقة المضيف على مشاركتك.')}\nfunction fail(e){status('تعذّر إكمال الخطوة: '+(e.code||e.message))}\nasync function join(){if(busy)return;busy=true;el('join').disabled=true;try{await auth.authStateReady();user=auth.currentUser||(await au.signInAnonymously(auth)).user;\nref=incoming?db.doc(fs,'rooms',incoming):db.doc(db.collection(fs,'rooms'));host=!incoming;publishing=host;\nif(host)await db.setDoc(ref,{name:'غرفة تجربة كليبي',ownerName:'المضيف',ownerUid:user.uid,type:'video',status:'open',createdAt:db.serverTimestamp()});\nelse{const snap=await db.getDoc(ref);if(snap.data()?.status!=='open')throw Error('الغرفة مغلقة');host=snap.data().ownerUid===user.uid;publishing=host||!!snap.data().stageGuests?.[user.uid]}\nawait connect();\nif(host){el('invite').hidden=false;stops.push(db.onSnapshot(db.collection(ref,'stageRequests'),snap=>{el('requests').replaceChildren();for(const request of snap.docs){const b=document.createElement('button');b.textContent='قبول الضيف '+request.id.slice(-5);b.onclick=async()=>{try{await db.runTransaction(fs,async tx=>{const data=(await tx.get(ref)).data();if(Object.keys(data.stageGuests||{}).some(uid=>uid!==request.id))throw Error(\"مقعد الضيف مشغول\");tx.update(ref,{stageGuests:{[request.id]:\"ضيف\"}})});await db.deleteDoc(request.ref)}catch(e){fail(e)}};el('requests').append(b)}},fail))}\nelse {if(!publishing){const rq=db.doc(ref,'stageRequests',user.uid);if(!(await db.getDoc(rq)).exists())await db.setDoc(rq,{name:'ضيف',createdAt:db.serverTimestamp()})}\nstops.push(db.onSnapshot(ref,async snap=>{try{if(snap.data()?.status!=='open'){teardown();status('أغلق المضيف الغرفة');return}const granted=!!snap.data()?.stageGuests?.[user.uid];if(granted!==publishing){publishing=granted;await room.disconnect();await connect()}}catch(e){fail(e)}},fail))}\n}catch(e){teardown();if(e.code?.startsWith('auth/'))el('google').hidden=false;fail(e)}finally{busy=false}}\nel('google').onclick=async()=>{try{await au.signInWithPopup(auth,new au.GoogleAuthProvider());await join()}catch(e){fail(e)}};\nel('invite').onclick=async()=>{const u=new URL(location.href);u.hash='room='+ref.id;try{await navigator.clipboard.writeText(u.href);status('تم نسخ رابط الضيف')}catch{prompt('رابط الضيف',u.href)}};\nfor(const [id,kind,label] of [['mic','Microphone','الميكروفون'],['cam','Camera','الكاميرا']])el(id).onclick=async()=>{const b=el(id);b.disabled=true;try{const p=room.localParticipant;const on=!p['is'+kind+'Enabled'];await p['set'+kind+'Enabled'](on);b.textContent=(on?'إيقاف ':'تشغيل ')+label}catch(e){fail(e)}finally{b.disabled=!publishing}};\nel('sound').onclick=()=>room.startAudio().catch(fail);\nel('leave').onclick=async()=>{try{if(host){await db.updateDoc(ref,{status:'closed'});await token('close-room')}status('غادرت الغرفة')}catch(e){fail(e)}finally{teardown()}};\nel('join').textContent=incoming?'دخول كضيف':'إنشاء غرفة';el('join').onclick=join;el('join').disabled=false;status(incoming?'ادخل ثم انتظر موافقة المضيف.':'أنشئ الغرفة ثم شارك رابط الدعوة مع الجهاز الثاني.');\n}catch(e){status('تعذّر تحميل أدوات الغرفة. حدّث الصفحة وتأكد من الاتصال.')}\n</script></html>";
