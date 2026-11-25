import {hostEarnings} from './host-earnings.mjs';
import {saveCover,saveHelpCover,coverResponse} from './room-cover.mjs';
import {liveProgram,tagRoom} from './live-program.mjs';
import {deviceInstall} from './device-install.mjs';
import {interfaceCopy} from './interface-copy.mjs';
import {invitationInbox} from './broadcast-access.mjs';
import {reserveBroadcast,rootFor} from './room-history.mjs';
export {ClipiVideo} from './video-storage.mjs';
import {starterVideo} from './video-storage.mjs';
import {profileTables} from './profile-tables.mjs';
import {trialAccount} from './trial-diamonds.mjs';
import {agencyAccount} from './agencies.mjs';
import {shortAccount,receiveShort,serveShort,deleteShort} from './short-videos.mjs';
import {supportCase} from './support-case.mjs';
import {accountCheckout,externalPayment} from './external-checkout.mjs';
import {linkHostWallet,readWallet} from './diamond-wallet.mjs';
import {account} from './identity.mjs';
import {roomStore,roomControls,helpRoomId,helpRoomName} from './room-controls.mjs';
import { piLogin } from './pi-login.mjs';
import {linkStore,linkedPi,linkedEmail} from './pi-account-link.mjs';
import { piGifts } from './pi-gifts.mjs';

async function approvalKey(secret) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return 'w:' + Array.from(new Uint8Array(digest).slice(0,16), n => n.toString(16).padStart(2,'0')).join('');
}
const encoder = new TextEncoder();
const firebaseWebApiKey='AIzaSyAjP8dTGO_XdWrtmNRZQS4fifNalGzI2wI';

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
    if(request.method==='GET'&&(path==='/device-install/android'||path==='/device-install/ios'))return deviceInstall(request,path.split('/').pop());
    if(path.startsWith('/interface-copy/')&&request.method==='GET')return interfaceCopy(path,env);
    if((path==='/external-checkout/'||path==='/external-checkout.html')&&request.method==='GET'&&env.CLIPI_APP){
      const canonical=new URL(request.url);
      canonical.pathname='/external-checkout';
      return Response.redirect(canonical.href,308);
    }
    if(path.startsWith('/external-checkout/'))return externalPayment(request,env);
    if(path==='/external-checkout'&&request.method==='GET'&&env.CLIPI_APP)return env.CLIPI_APP.fetch(request);
    if(request.method==='GET'&&path.startsWith('/room-covers/')){
      const match=/^\/room-covers\/([A-Za-z0-9_-]{1,128})\/([a-f0-9-]{36})\.jpg$/.exec(path);
      if(!match)return new Response(null,{status:404});
      return coverResponse(await roomStore(env.PI_GIFTS_DB),match[1],match[2]);
    }
    if(path==='/active-rooms'&&request.method==='GET'){
      const q=await roomStore(env.PI_GIFTS_DB);
      const rows=await q('SELECT h.room,l.language,l.topic,c.revision AS cover FROM room_host h LEFT JOIN room_continuation chain ON chain.session=h.room LEFT JOIN room_cover c ON c.root=COALESCE(chain.root,h.room) LEFT JOIN room_listing l ON l.room=h.room JOIN room_member m ON m.room=h.room AND m.uid=h.uid WHERE m.seen>=? ORDER BY m.seen DESC LIMIT 200',Math.floor(Date.now()/1000)-90).all();
      const rooms=rows.results.map(row=>row.room).filter(id=>id!==helpRoomId);
      const supportRoom=env.PI_GIFTS_NETWORK==='mainnet'?{
        id:helpRoomId,type:'audio',name:helpRoomName,status:'open',
        cover:(await q('SELECT revision FROM room_cover WHERE root=?',helpRoomId).first())?.revision??null
      }:null;
      return json({rooms,tags:Object.fromEntries(rows.results.filter(r=>r.language||r.cover).map(r=>[r.room,{language:r.language,topic:r.topic,cover:r.cover}])), ...(supportRoom?{supportRoom}:{})});
    }
    if(request.method==='GET'&&path.startsWith('/themes/')){
      if(/^\/themes\/(palace|aurora|dunes)\.jpg$/.test(path))return env.CLIPI_APP.fetch(request);
      const parts=/^\/themes\/([A-Za-z0-9_-]{1,128})\/([a-f0-9-]{36})$/.exec(path);
      if(!parts)return json({error:'Not found'},404);
      const q=await roomStore(env.PI_GIFTS_DB);
      const row=await q('SELECT image FROM room_theme WHERE room=? AND theme=?',parts[1],parts[2]).first();
      if(!row?.image)return json({error:'Not found'},404);
      return new Response(Uint8Array.from(atob(row.image.split(',')[1]),v=>v.charCodeAt(0)),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private,max-age=3600'}});
    }
    if (/^\/shorts\/starter\/(palace|aurora|dunes)\.(mp4|jpg)$/.test(path) && ['GET','HEAD'].includes(request.method) && env.CLIPI_APP) {
      if (path.endsWith('.mp4') && env.CLIP_MEDIA) return starterVideo(env.CLIPI_APP, env.CLIP_MEDIA, request);
      return env.CLIPI_APP.fetch(request);
    }
    const shortFile=/^\/shorts\/media\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/.exec(path);
    if (shortFile && ['GET','HEAD'].includes(request.method)) {
      // A published clip already has a catalog row. Cold playback does not need room migrations.
      const query = (sql,...args) => env.PI_GIFTS_DB.prepare(sql).bind(...args);
      try {
        return await serveShort(request,env.SHORT_VIDEOS,query,shortFile[1],json,env.CLIP_MEDIA);
      } catch (error) {
        if (/no such table: (?:main\.)?short_clip\b/i.test(error.message))
          return json({error:'الفيديو غير موجود'},404);
        throw error;
      }
    }
    if((path==='/account-number'&&request.method==='POST')||(shortFile&&request.method==='PUT')){
      const token=(request.headers.get('Authorization')||'').match(/^Bearer ([^ ]{1,8192})$/)?.[1];
      if(!token)return json({error:'سجل الدخول'},401);
      const check=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+firebaseWebApiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})});
      if(!check.ok)return json({error:'تعذّر التحقق من الحساب'},check.status===400?401:502);
      const identity=(await check.json()).users?.[0];
      const uid=identity?.localId;
      if(!uid)return json({error:'سجل الدخول'},401);
      if(shortFile)return receiveShort(request,env.SHORT_VIDEOS,await roomStore(env.PI_GIFTS_DB),uid,shortFile[1],json,env.CLIP_MEDIA);
      const input=await request.json().catch(()=>null);
      if(['eventCreate','eventCancel','eventList','eventRemind','eventSeen'].includes(input?.op))return liveProgram(await roomStore(env.PI_GIFTS_DB),uid,input,json);
      if(input?.op==='roomNumber'||input?.op==='findRoomNumber'){
        if(input.op==='findRoomNumber'&&(typeof input.number!=='string'||!/^\d{7,15}$/.test(input.number)))return json({error:'معرّف غير صالح'},400);
        const q=await roomStore(env.PI_GIFTS_DB);
        const numberBase=1000000;
        const room=input.op==='roomNumber'?input.room:
          (await q('SELECT room FROM room_public_number WHERE number=?',Number(input.number)-numberBase).first())?.room;
        if(typeof room!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(room))return json({error:'الغرفة غير متاحة'},404);
        if(room!==helpRoomId){
          const target='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/databases/(default)/documents/rooms/'+room;
          const doc=await fetch(target,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});
          if(!doc.ok||(await doc.json()).fields?.status?.stringValue!=='open')return json({error:'الغرفة غير متاحة'},404);
        }
        if(input.op==='findRoomNumber')return json({room});
        let entry=await q('SELECT number FROM room_public_number WHERE room=?',room).first();
        if(!entry){
          await q('INSERT INTO room_public_number(room) VALUES(?) ON CONFLICT(room) DO NOTHING',room).run();
          entry=await q('SELECT number FROM room_public_number WHERE room=?',room).first();
        }
        return json({number:String(numberBase+entry.number)});
      }
      if(input?.op==='roomCover'&&input.room===helpRoomId){
        if(env.PI_GIFTS_NETWORK!=='mainnet')return json({error:'الغرفة غير متاحة'},404);
        return saveHelpCover(await roomStore(env.PI_GIFTS_DB),helpRoomId,uid,env.CLIPI_OWNER_UID,input.image,json);
      }
      if(input?.op==='roomTag'||input?.op==='roomCover'){
        if(typeof input.room!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input.room))return json({error:'طلب غير صالح'},400);
        const target='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/databases/(default)/documents/rooms/'+input.room;
        const doc=await fetch(target,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});
        if(!doc.ok)return json({error:'الغرفة غير متاحة'},doc.status===404?404:403);
        const fields=(await doc.json()).fields;
        if(fields?.ownerUid?.stringValue!==uid||fields.status?.stringValue!=='open')return json({error:'غير مصرح'},403);
        const q=await roomStore(env.PI_GIFTS_DB);
        if(input.op==='roomCover')return saveCover(q,input.room,uid,fields,input.image,json);
        return tagRoom(q,uid,input.room,input,json);
      }
      if(['roomInviteInbox','dismissRoomInvite'].includes(input?.op))
        return invitationInbox(await roomStore(env.PI_GIFTS_DB),uid,input,json);
      if(input?.op==='hostLevels'){
        const owner=input.owner??uid;
        if(typeof owner!=='string'||!owner||owner.length>128)return json({error:'الحساب غير صالح'},400);
        const q=await roomStore(env.PI_GIFTS_DB);
        return json(await q(`SELECT
          (SELECT COALESCE(SUM(cost),0) FROM room_level_gifts WHERE recipient=?) AS received,
          (SELECT COALESCE(SUM(cost),0) FROM room_level_gifts WHERE sender=?) AS sent`,owner,owner).first());
      }
      if(input?.op==='myRoomContinuations'){
        const q=await roomStore(env.PI_GIFTS_DB);
        return json({links:(await q('SELECT previous,session FROM room_continuation WHERE owner=?',uid).all()).results});
      }
      if(typeof input?.op==='string'&&input.op.startsWith('table'))return profileTables(await roomStore(env.PI_GIFTS_DB),uid,input,json);
      if(typeof input?.op==='string'&&input.op.startsWith('trial'))return trialAccount(await roomStore(env.PI_GIFTS_DB),uid,env.CLIPI_OWNER_UID,input,json);
      if(typeof input?.op==='string'&&input.op.startsWith('agency'))return agencyAccount(await roomStore(env.PI_GIFTS_DB),uid,env.CLIPI_OWNER_UID,input,json);
      if(input?.op==='shortDelete')return deleteShort(await roomStore(env.PI_GIFTS_DB),uid,input.clip,json,env.SHORT_VIDEOS,env.CLIP_MEDIA);
      if(typeof input?.op==='string'&&input.op.startsWith('short'))return shortAccount(await roomStore(env.PI_GIFTS_DB),uid,input,json,Boolean(env.CLIP_MEDIA || env.SHORT_VIDEOS));
      if(['externalCreate','externalOrders','externalStoreAccount'].includes(input?.op))return accountCheckout(env,uid,input,new URL(request.url).origin);
      if(['caseCreate','caseList','caseQueue','caseReviewed','caseReply'].includes(input?.op)){
        return supportCase(await roomStore(env.PI_GIFTS_DB),uid,env.CLIPI_OWNER_UID,input,json);
      }
      if(['hostEarnings','saveReceivingMethod','linkReceivingContact'].includes(input?.op))
        return hostEarnings(await roomStore(env.PI_GIFTS_DB),uid,input,json,env,identity);
      if(input?.op==='wallet'||input?.op==='linkHostWallet'){
        const q=await roomStore(env.PI_GIFTS_DB);
        const linkedPiUid=uid.startsWith('pi:')?null:await linkedPi(await linkStore(env),uid);
        if(input.op==='linkHostWallet')
          return linkHostWallet(q,uid,uid.startsWith('pi:')?uid:linkedPiUid,input.accessToken,json);
        const wallet=await readWallet(q,uid,env.CLIPI_OWNER_UID);
        return json({...wallet,linkedPiUid});
      }
      if(!input||!['read','buy','equip'].includes(input.op))return json({error:'طلب غير صالح'},400);
      const q=await roomStore(env.PI_GIFTS_DB);
      const result=await account(q,uid,input,100+(env.CLIPI_OWNER_UID===uid?100000000:0),json);
      if(input.op!=='read'||!result.ok||env.PI_GIFTS_NETWORK!=='mainnet')return result;
      const owner=await q('SELECT 1 FROM clipi_app_owner WHERE uid=?',uid).first();
      if(!owner)return result;
      const db=await linkStore(env);
      const destination=uid.startsWith('pi:')?await linkedEmail(db,uid):await linkedPi(db,uid);
      return json({...await result.json(),piLoginLink:destination?'linked':'available'});
    }
    if (env.CLIPI_APP && request.method === 'GET') {
      const legacyTestRooms=env.PI_GIFTS_TESTNET==='1'&&env.PI_GIFTS_NETWORK!=='mainnet';
      if (path==='/delete-account'||(legacyTestRooms?['/clipi','/clipi/']:['/','/room','/room/']).includes(path))
        return env.CLIPI_APP.fetch(new URL('/index.html', request.url));
      if (['/privacy','/terms'].includes(path)) return env.CLIPI_APP.fetch(new URL(path+'.html',request.url));
      if (['/clipi-app.js','/clipi-app.css','/clipi-policy-links.js'].includes(path))return env.CLIPI_APP.fetch(request);
    }
    if (['/auth/pi','/auth/pi/original','/auth/pi/link-preview','/auth/pi/link-confirm'].includes(path)) return piLogin(request,env,json,firebaseWebApiKey);
    if (path.startsWith('/pi-gifts/')) return piGifts(request, env, json);
    if (path === '/validation-key.txt' && ['GET', 'HEAD'].includes(request.method)) {
      const key = env.PI_DOMAIN_VALIDATION_KEY?.trim();
      if (!key) return json({ error: 'Not found' }, 404);
      return new Response(request.method === 'HEAD' ? null : key, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    if (request.method === 'GET' && (path === '/room' || path === '/room/' || (path === '/' && env.CLIPI_WEB_ENTRY === 'room'))) {
      const page = env.PI_ROOM_LOGIN === '1' ? roomPage.replace('<main>', '<body data-pi-login="1"><main>').replace('<script type="module">', piSdk + '<script type="module">') : roomPage;
      return new Response(page.replace('<p>الدفع التجريبي قيد الإعداد.</p>',
        '<p><a style="color:#ffe39a" href="https://clipi-mainnet.liddawiw.workers.dev/">افتح كليبي على الشبكة الرئيسية لإرسال هدايا بالماس المشترى</a></p>'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
      });
    }
    if (path === '/' && request.method === 'GET') return json({ service: 'clipi-livekit' });
    if (!['/room-control','/token', '/remove-guest', '/close-room'].includes(path) || request.method !== 'POST') return json({ error: 'Not found' }, 404);
    if (!env.FIREBASE_PROJECT_ID || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET ||
        !/^wss:\/\/[^/]+\/?$/.test(env.LIVEKIT_URL ?? '')) {
      return json({ error: 'Service configuration incomplete' }, 503);
    }

    const authorization = request.headers.get('Authorization');
    const match = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/.exec(authorization ?? '');
    if (!match || authorization.length > 8192) return json({ error: 'Unauthorized' }, 401);

    let roomId, uid, visit, input;
    try {
      const body = await request.text();
      if (body.length > (path==='/room-control'?625000:4096)) return json({ error: 'Request too large' }, 413);
      input=JSON.parse(body);
      ({ roomId, uid, visit } = input);
    } catch {
      return json({ error: 'Invalid request' }, 400);
    }
    if (typeof roomId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(roomId)) {
      return json({ error: 'Invalid room' }, 400);
    }

    try {
      const project = env.FIREBASE_PROJECT_ID;
      const official=roomId===helpRoomId;
      let fields, verifiedUid;
      if(official){
        if(env.PI_GIFTS_NETWORK!=='mainnet')return json({error:'Room unavailable'},404);
        if(!['/token','/room-control'].includes(path))return json({error:'غرفة المساعدة دائمة'},403);
        if(!input.session)return json({error:'جلسة غير صالحة'},403);
        const lookup=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+firebaseWebApiKey,{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:match[1]}),signal:AbortSignal.timeout(8000)
        });
        if(!lookup.ok)return json({error:'تعذّر التحقق من الحساب'},[400,401,403].includes(lookup.status)?401:502);
        verifiedUid=(await lookup.json()).users?.[0]?.localId;
        if(!verifiedUid)return json({error:'Unauthorized'},401);
        fields={type:{stringValue:'audio'},status:{stringValue:'open'},ownerUid:{stringValue:''},name:{stringValue:helpRoomName}};
      }else{
        const roomResponse = await fetch(
          `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/rooms/${roomId}`,
          { headers: { Authorization: authorization }, signal: AbortSignal.timeout(8000) },
        );
        if ([401, 403].includes(roomResponse.status)) return json({ error: 'Unauthorized' }, 401);
        if (roomResponse.status === 404) return json({ error: 'Room unavailable' }, 404);
        if (!roomResponse.ok) return json({ error: 'Room lookup failed' }, 502);
        fields=(await roomResponse.json()).fields;
      }
      // Both paths validate this Firebase ID token before trusting any of its claims.
      const part = match[1].split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
      const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part), c => c.charCodeAt(0))));
      if ((official && verifiedUid!==claims.sub) || claims.aud !== project || claims.iss !== `https://securetoken.google.com/${project}` ||
          typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) {
        return json({ error: 'Unauthorized' }, 401);
      }
      const type = fields?.type?.stringValue;
      const status = fields?.status?.stringValue;
      if(path==='/room-control'&&env.PI_GIFTS_NETWORK==='mainnet'&&['resumeBroadcast','currentBroadcast'].includes(input.op)){
        if(!['audio','video'].includes(type)||status!=='closed')return json({error:'الغرفة ليست مغلقة'},409);
        const q=await roomStore(env.PI_GIFTS_DB);
        const owner=fields.ownerUid?.stringValue;
        if(input.op==='resumeBroadcast'){
          if(!owner||owner!==claims.sub)return json({error:'لصاحب الغرفة فقط'},403);
          return json({session:await reserveBroadcast(q,roomId,owner)});
        }
        const root=await rootFor(q,roomId);
        const next=await q('SELECT c.session FROM room_continuation c JOIN room_host h ON h.room=c.session AND h.uid=c.owner WHERE c.owner=? AND c.root=? ORDER BY c.rowid DESC LIMIT 1',owner,root).first();
        return json({session:next?.session||null});
      }
      if (!['audio', 'video'].includes(type) || status !== (path === '/close-room' ? 'closed' : 'open')) {
        return json({ error: 'Room unavailable' }, 404);
      }

      const host = fields.ownerUid?.stringValue === claims.sub;
      const guests = fields.stageGuests?.mapValue?.fields ?? {};
      const enhanced = env.PI_GIFTS_NETWORK==='mainnet' && Boolean(input.session);
      const liveRoom = enhanced ? 'clipi:web:'+roomId : 'clipi-'+roomId;
      const now = Math.floor(Date.now()/1000);
      async function mediaToken(publisher,micAllowed=true){
        const video={roomJoin:true,room:liveRoom,canSubscribe:true,canPublish:publisher,canPublishData:false};
        if(publisher)video.canPublishSources=type==='audio'?['microphone']:(micAllowed?['microphone','camera']:['camera']);
        const token=await signToken(env,{iss:env.LIVEKIT_API_KEY,sub:claims.sub,nbf:now-5,exp:now+120,video});
        return {serverUrl:env.LIVEKIT_URL,token,canPublish:publisher};
      }
      let admission;
      if (env.PI_GIFTS_NETWORK==='mainnet' && (path==='/token'||path==='/room-control')){
        const disconnect=async identity=>{
          const admin=await signToken(env,{iss:env.LIVEKIT_API_KEY,sub:claims.sub,nbf:now-5,exp:now+30,video:{roomAdmin:true,room:liveRoom}});
          const origin=new URL(env.LIVEKIT_URL.replace('wss:','https:')).origin;
          const result=await fetch(origin+'/twirp/livekit.RoomService/RemoveParticipant',{method:'POST',headers:{Authorization:'Bearer '+admin,'Content-Type':'application/json'},body:JSON.stringify({room:liveRoom,identity}),signal:AbortSignal.timeout(8000)});
          if(!result.ok&&result.status!==404)throw Error('Removal failed');
        };
        admission=await roomControls({env,input,room:roomId,user:claims.sub,host,ownerUid:fields.ownerUid?.stringValue,type,path,json,disconnect,mediaToken,roomTitle:fields.name?.stringValue||''});
        if(admission instanceof Response)return admission;
      }
      if (path !== '/token') {
        if (!host) return json({ error: 'Forbidden' }, 403);
        const closing = path === '/close-room';
        if(closing&&env.PI_GIFTS_NETWORK==='mainnet'){
          const q=await roomStore(env.PI_GIFTS_DB);
          await q('UPDATE broadcast_invite SET dismissed=1 WHERE room=? AND dismissed=0',roomId).run();
        }
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
      const grant = guests[claims.sub]?.stringValue;
      const webVisit = visit !== undefined;
      const approved = webVisit
        ? typeof visit === 'string' && /^[a-f0-9-]{36}$/.test(visit) && grant === await approvalKey(visit)
        : typeof grant === 'string' && !grant.startsWith('w:');
      const publisher = admission?.publisher ?? (host || approved);
      return json(await mediaToken(publisher,admission?.micAllowed!==false));
    } catch {
      return json({ error: 'Media service temporarily unavailable' }, 502);
    }
  },
};

const piSdk = '<script src="https://sdk.minepi.com/pi-sdk.js"></script>';

const roomPage = "<!doctype html><html lang=\"ar\" dir=\"rtl\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"referrer\" content=\"no-referrer\"><title>غرفة كليبي</title>\n<style>*{box-sizing:border-box}body{margin:0;background:#071934;color:#fff;font:18px system-ui}main{max-width:680px;margin:auto;padding:24px}video{width:100%;max-height:38vh;background:#102b52;border-radius:18px}button,input{padding:12px;margin:6px 0;border:0;border-radius:10px;font:inherit}button{background:#a8e6ff;color:#092947}button:disabled{opacity:.5}button{touch-action:manipulation}#status{min-height:2em}#controls{display:flex;flex-wrap:wrap;gap:8px}\n#gift-toggle{background:#e0b0ff;color:#2c124a}#gift-panel{padding:16px;margin-block:14px;background:#102b52;border-radius:16px}\n#gift-panel h2{margin:0;font-size:1.15em}#gift-panel p{margin-block:8px}\n[hidden]{display:none!important}\n</style>\n<main><h1>غرفة كليبي</h1><p id=\"status\" role=\"status\">جارٍ تحميل أدوات الاتصال…</p><button id=\"join\" disabled>دخول الغرفة</button> <button id=\"google\" hidden>الدخول بحساب Google</button><div id=\"controls\"><button id=\"invite\" hidden>نسخ رابط الدعوة</button><button id=\"mic\" disabled>تشغيل الميكروفون</button><button id=\"cam\" disabled>تشغيل الكاميرا</button><button id=\"sound\" disabled>سماع الصوت</button><button id=\"gift-toggle\" type=\"button\" hidden aria-expanded=\"false\" aria-controls=\"gift-panel\">🎁 الهدايا</button><button id=\"leave\" disabled>مغادرة</button></div><section aria-live=\"polite\"><strong id=\"role\"></strong><div id=\"requests\"></div></section><p id=\"audioState\" role=\"status\"></p><section id=\"gift-panel\" hidden aria-labelledby=\"gift-title\">\n  <h2 id=\"gift-title\">هدايا المضيف</h2>\n  <p>🌹 وردة</p>\n  <p>الدفع التجريبي قيد الإعداد.</p>\n</section><div id=\"media\"></div></main>\n<script type=\"module\">\nconst el=id=>document.getElementById(id), status=t=>el('status').textContent=t;\nconst giftToggle=el('gift-toggle'), giftPanel=el('gift-panel');\nfunction showGiftPanel(open){\n  giftPanel.hidden=!open;\n  giftToggle.setAttribute('aria-expanded',String(open));\n}\n\nconst sendRose = el('send-rose');\nconst giftStatus = el('gift-status');\nconst paymentStatus = el('gift-payment-status');\nlet piToken, giftTimer, giftBusy = false, piReady = false;\nfunction waitForPi(promise) {\n  let timer;\n  return Promise.race([\n    promise,\n    new Promise((_, reject) => {\n      timer = setTimeout(() => reject(Error('Pi ما ردّ على تسجيل الدخول. افتح رابط التطبيق الموثّق من Develop داخل Pi Browser وحاول مرة ثانية.')), 15000);\n    }),\n  ]).finally(() => clearTimeout(timer));\n}\nconst seenGifts = new Set();\nasync function giftRequest(action, payload) {\n  const headers = { Authorization: 'Bearer ' + await user.getIdToken() };\n  if (payload) headers['Content-Type'] = 'application/json';\n  const response = await fetch('/pi-gifts/' + action + (payload ? '' : '?room=' + encodeURIComponent(ref.id)), {\n    method: payload ? 'POST' : 'GET', headers, body: payload ? JSON.stringify(payload) : undefined,\n  });\n  if (!response.ok) throw Error('تعذّر تأكيد حالة الهدية');\n  return response.json();\n}\nasync function refreshGifts() {\n  const currentRoom = room;\n  const { gifts } = await giftRequest('events');\n  if (room !== currentRoom || !room) return;\n  for (const gift of gifts) {\n    if (!seenGifts.has(gift.id)) {\n      const entry = document.createElement('div');\n      entry.textContent = 'وصلت هدية وردة 🌹';\n      giftStatus.append(entry);\n    }\n    seenGifts.add(gift.id);\n  }\n}\nfunction startGiftUpdates() {\n  clearInterval(giftTimer);\n  if (!sendRose) return;\n  refreshGifts().catch(() => {});\n  giftTimer = setInterval(() => refreshGifts().catch(() => {}), 2500);\n}\nif (sendRose) {\n  sendRose.onclick = async () => {\n    if (giftBusy || !room || host) return;\n    const roomId = ref.id;\n    giftBusy = sendRose.disabled = true;\n    const done = (message) => {\n      giftBusy = sendRose.disabled = false;\n      paymentStatus.textContent = message;\n    };\n    const complete = (paymentId, txid, targetRoom) =>\n      giftRequest('complete', { paymentId, txid, roomId: targetRoom, accessToken: piToken });\n    try {\n      if (!window.Pi) throw Error('افتح الغرفة داخل Pi Browser');\n      paymentStatus.textContent = 'جارٍ الاتصال بـ Pi لفتح الدفع…';\n      if (!piReady) {\n        Pi.init({ version: '2.0', sandbox: false });\n        piReady = true;\n      }\n      const incomplete = [];\n      const session = await waitForPi(Pi.authenticate(['payments'], payment => incomplete.push(payment)));\n      piToken = session.accessToken;\n      for (const payment of incomplete) {\n        if (payment.transaction?.txid && payment.metadata?.gift === 'rose') {\n          await complete(payment.identifier, payment.transaction.txid, payment.metadata.roomId);\n        }\n      }\n      if (incomplete.length) {\n        done('تمت مراجعة الدفع السابق. اضغط إرسال إذا أردت هدية جديدة.');\n        return;\n      }\n      if (!room || ref.id !== roomId) throw Error('أعد الدخول إلى الغرفة');\n      paymentStatus.textContent = 'راجع نافذة Pi لتأكيد الهدية التجريبية.';\n      Pi.createPayment({ amount: Number(sendRose.dataset.amount), memo: 'Clipi rose', metadata: { roomId, gift: 'rose' } }, {\n        onReadyForServerApproval: (paymentId) =>\n          giftRequest('approve', { paymentId, roomId, accessToken: piToken }).catch(error => done(error.message)),\n        onReadyForServerCompletion: (paymentId, txid) =>\n          complete(paymentId, txid, roomId).then(() => done('تأكد إرسال الوردة 🌹')).catch(() => done('أعد فتح الدفع لاستكمال التحقق من العملية السابقة.')),\n        onCancel: () => done('أُلغي الدفع'),\n        onError: () => done('تعذّر إكمال الدفع عبر Pi'),\n      });\n    } catch (error) {\n      done(error.message);\n    }\n  };\n}\n\ngiftToggle.onclick=()=>showGiftPanel(giftPanel.hidden);\ntry {\nconst [app,au,db,lk]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'),import('https://cdn.jsdelivr.net/npm/livekit-client@2.15.4/dist/livekit-client.esm.mjs')]);\nconst firebase=app.initializeApp({apiKey:'AIzaSyAjP8dTGO_XdWrtmNRZQS4fifNalGzI2wI',authDomain:'clipi-f67c0.firebaseapp.com',projectId:'clipi-f67c0'}), auth=au.getAuth(firebase), fs=db.getFirestore(firebase);\nasync function approvalKey(secret) {\n  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));\n  return 'w:' + Array.from(new Uint8Array(digest).slice(0,16), n => n.toString(16).padStart(2,'0')).join('');\n}\nlet visit,expectedGrant,requested=false;let room,ref,user,host=false,publishing=false,stops=[],busy=false;const incoming=new URLSearchParams(location.hash.slice(1)).get('room');\nasync function token(path){const res=await fetch('/'+path,{method:'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},signal:AbortSignal.timeout(12000),body:JSON.stringify({roomId:ref.id,visit})});if(!res.ok)throw Error('خادم الغرفة أعاد '+res.status);return res.json()}\nfunction audioState(){\n  if(!room)return;\n  const pubs=Array.from(room.remoteParticipants.values()).map(p=>p.getTrackPublication(lk.Track.Source.Microphone)).filter(Boolean);\n  const remote=!pubs.length?'بانتظار ميكروفون الطرف الثاني':pubs.every(p=>p.isMuted)?'ميكروفون الطرف الثاني مكتوم':pubs.some(p=>p.track&&!p.isMuted)?'وصل مسار صوت الطرف الثاني':'جارٍ استقبال الصوت';\n  el('audioState').textContent=(room.localParticipant.isMicrophoneEnabled?'ميكروفونك مفتوح':'ميكروفونك مغلق')+' · '+remote;\n}\nfunction attach(track,local=false){const item=track.attach();if(local)item.muted=true;item.playsInline=true;item.autoplay=true;if(!local&&track.kind==='audio'){item.controls=true;item.muted=false;item.setAttribute('aria-label','صوت الطرف الثاني')}el('media').append(item)}\nfunction teardown(){clearInterval(giftTimer);seenGifts.clear();giftStatus?.replaceChildren();showGiftPanel(false);giftToggle.hidden=true;stops.splice(0).forEach(stop=>stop());room?.disconnect();room=null;el('audioState').textContent='';el('role').textContent='';el('media').replaceChildren();el('requests').replaceChildren();for(const id of ['mic','cam','sound','leave'])el(id).disabled=true;el('invite').hidden=true;el('join').disabled=false}\nasync function connect(data){\n  if (!data) {\n    status('جارٍ تجهيز اتصال الغرفة…');\n    data = await token('token');\n  }\n  status('جارٍ الاتصال بالبث…');\n  room=new lk.Room();for(const event of [lk.RoomEvent.TrackSubscribed,lk.RoomEvent.TrackUnsubscribed,lk.RoomEvent.TrackMuted,lk.RoomEvent.TrackUnmuted,lk.RoomEvent.ParticipantDisconnected,lk.RoomEvent.LocalTrackPublished,lk.RoomEvent.LocalTrackUnpublished])room.on(event,audioState);room.on(lk.RoomEvent.TrackSubscribed,t=>attach(t));room.on(lk.RoomEvent.TrackUnsubscribed,t=>t.detach().forEach(n=>n.remove()));room.on(lk.RoomEvent.LocalTrackPublished,p=>{if(p.track?.kind==='video')attach(p.track,true)});room.on(lk.RoomEvent.LocalTrackUnpublished,p=>p.track?.detach().forEach(n=>n.remove()));await room.connect(data.serverUrl,data.token,{maxRetries:1});audioState();giftToggle.hidden=host;startGiftUpdates();el('sound').disabled=false;el('leave').disabled=false;el('mic').disabled=el('cam').disabled=!publishing;status(publishing?'متصل. شغّل الميكروفون والكاميرا.':'متصل كمشاهد. اضغط طلب جيست للمشاركة.')}\nfunction fail(e){status('تعذّر إكمال الخطوة: '+(e.code||e.message))}\nlet piName='';\nasync function piRoomUser(){\n  if(!window.Pi) throw Error('افتح كليبي داخل Pi Browser');\n  if(!piReady){Pi.init({version:'2.0',sandbox:false});piReady=true}\n  const session=await waitForPi(Pi.authenticate(['username'],()=>{}));\n  const response=await fetch('/auth/pi',{method:'POST',headers:{Authorization:'Bearer '+session.accessToken}});\n  const data=await response.json();\n  if(!response.ok)throw Error(data.error||'تعذر تسجيل الدخول');\n  const credential=await au.signInWithCustomToken(auth,data.token);\n  piName=data.username;\n  return credential.user;\n}\nasync function join(){if(busy)return;busy=true;el('join').disabled=true;status('جارٍ تسجيل الدخول…');try{await auth.authStateReady();user=document.body.dataset.piLogin?await piRoomUser():auth.currentUser||(await au.signInAnonymously(auth)).user;\nref=incoming?db.doc(fs,'rooms',incoming):db.doc(db.collection(fs,'rooms'));host=!incoming;publishing=host;\nif(host){status('جارٍ إنشاء الغرفة…');await db.setDoc(ref,{name:'غرفة تجربة كليبي',ownerName:piName||'المضيف',ownerUid:user.uid,type:'video',status:'open',createdAt:db.serverTimestamp()});}\nelse{const snap=await db.getDoc(ref);if(snap.data()?.status!=='open')throw Error('الغرفة مغلقة');host=snap.data().ownerUid===user.uid;publishing=host}\nel('role').textContent=host?'أنت المضيف · طلبات الانضمام':'أنت الضيف';\nif(host)history.replaceState(null,'','#room='+ref.id);\nvisit=crypto.randomUUID();requested=false;\n[expectedGrant] = await Promise.all([approvalKey(visit), connect()]);\nif(!host){\n  const button=document.createElement('button');button.textContent='طلب جيست';el('requests').replaceChildren(button);\n  button.onclick=async()=>{button.disabled=true;button.textContent='جارٍ إرسال الطلب…';try{\n    const rq=db.doc(ref,'stageRequests',user.uid);\n    if((await db.getDoc(rq)).exists())await db.deleteDoc(rq);\n    requested=true;await db.setDoc(rq,{name:expectedGrant,createdAt:db.serverTimestamp()});\n    button.textContent='تم إرسال الطلب إلى المضيف'\n  }catch(e){requested=false;button.disabled=false;button.textContent='طلب جيست';fail(e)}};\n}\nif(host){el('invite').hidden=false;stops.push(db.onSnapshot(db.collection(ref,'stageRequests'),snap=>{el('requests').textContent=snap.empty?'لا توجد طلبات انضمام حاليًا':'';for(const request of snap.docs){const b=document.createElement('button');b.textContent='قبول الضيف '+request.id.slice(-5);b.onclick=async()=>{b.disabled=true;b.textContent='جارٍ إرسال الموافقة…';try{await db.runTransaction(fs,async tx=>{const current=await tx.get(request.ref);if(!current.exists()||current.data().name!==request.data().name)throw Error('تغيّر الطلب');const data=(await tx.get(ref)).data();if(Object.keys(data.stageGuests||{}).some(uid=>uid!==request.id))throw Error(\"مقعد الضيف مشغول\");tx.update(ref,{stageGuests:{[request.id]:current.data().name}});tx.delete(request.ref)})}catch(e){b.disabled=false;b.textContent='قبول الضيف '+request.id.slice(-5);fail(e)}};el('requests').append(b)}},fail))}\nelse {\nstops.push(db.onSnapshot(ref,async snap=>{try{if(snap.data()?.status!=='open'){teardown();status('أغلق المضيف الغرفة');return}const granted=requested&&snap.data()?.stageGuests?.[user.uid]===expectedGrant;if(granted)el('requests').textContent='وافق المضيف على انضمامك';if(granted!==publishing){\n  publishing=granted;\n  status(granted?'وصلت الموافقة. جارٍ تجهيز الميكروفون والكاميرا…':'جارٍ الرجوع لوضع المشاهدة…');\n  el('mic').disabled=el('cam').disabled=true;\n  try {\n    const data = await token('token');\n    if (!room || publishing!==granted) return;\n    await room.disconnect();\n    await connect(data);\n  } catch (error) {\n    teardown();\n    fail(error);\n  }\n}}catch(e){fail(e)}},fail))}\n}catch(e){teardown();if(!document.body.dataset.piLogin&&e.code?.startsWith('auth/'))el('google').hidden=false;fail(e)}finally{busy=false}}\nconst pendingKey='clipi-google-room:'+location.hash;\nfunction resumeLogin(user){if(user&&!user.isAnonymous&&sessionStorage.getItem(pendingKey)&&!busy&&!room){sessionStorage.removeItem(pendingKey);el('google').hidden=true;join()}}\nau.onAuthStateChanged(auth,resumeLogin);\nwindow.addEventListener('pageshow',()=>resumeLogin(auth.currentUser));\nel('google').onclick=async()=>{sessionStorage.setItem(pendingKey,'1');status('اختر حساب Google ثم ارجع إلى تبويب غرفة كليبي.');try{const result=await au.signInWithPopup(auth,new au.GoogleAuthProvider());resumeLogin(result.user)}catch(e){if(!busy&&!room){sessionStorage.removeItem(pendingKey);fail(e)}}};\nel('invite').onclick=async()=>{const u=new URL(location.href);u.hash='room='+ref.id;try{await navigator.clipboard.writeText(u.href);status('تم نسخ رابط الضيف')}catch{prompt('رابط الضيف',u.href)}};\nfor(const [id,kind,label] of [['mic','Microphone','الميكروفون'],['cam','Camera','الكاميرا']])el(id).onclick=async()=>{const b=el(id);b.disabled=true;try{const p=room.localParticipant;const on=!p['is'+kind+'Enabled'];b.textContent=on?'جارٍ تشغيل '+label+'…':'جارٍ إيقاف '+label+'…';if(on)status('إذا ظهر طلب إذن، اسمح باستخدام '+label+'.');await p['set'+kind+'Enabled'](on);status(on?'تم تشغيل '+label+'.':'تم إيقاف '+label+'.');audioState()}catch(e){fail(e)}finally{b.textContent=(room?.localParticipant['is'+kind+'Enabled']?'إيقاف ':'تشغيل ')+label;b.disabled=!room||!publishing}};\nel('sound').onclick=async()=>{\n  const players=Array.from(el('media').querySelectorAll('audio'));\n  try{\n    const attempts=players.map(player=>{player.muted=false;return player.play()});\n    const results=await Promise.allSettled([...attempts,room.startAudio()]);\n    audioState();\n    if(!players.length){status('شغّل الميكروفون على الجهاز الذي يتحدث.');return}\n    if(players.every(player=>player.paused)){const error=results.find(r=>r.status==='rejected')?.reason;status('تعذّر تشغيل السماعة. اضغط ▶ على مشغّل صوت الطرف الثاني. '+(error?.name||''));return}\n    status('مشغّل صوت الطرف الثاني يعمل.');\n  }catch(e){fail(e)}\n};\nel('leave').onclick=async()=>{try{if(host){await db.updateDoc(ref,{status:'closed'});await token('close-room')}status('غادرت الغرفة')}catch(e){fail(e)}finally{teardown()}};\nel('join').textContent=document.body.dataset.piLogin?'الدخول بحساب Pi':incoming?'دخول كضيف':'إنشاء غرفة';el('join').onclick=join;el('join').disabled=false;status(incoming?'ادخل ثم انتظر موافقة المضيف.':'أنشئ الغرفة ثم شارك رابط الدعوة مع الجهاز الثاني.');\n}catch(e){status('تعذّر تحميل أدوات الغرفة. حدّث الصفحة وتأكد من الاتصال.')}\n</script></html>";
