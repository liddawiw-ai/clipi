import {piAccountUid,isErasing} from './account-erasure.mjs';
import {linkStore,linkedEmail} from './pi-account-link.mjs';
import {validPack} from './diamond-wallet.mjs';
import {roomStore} from './room-controls.mjs';
import { gifts } from './gift-catalog.mjs';
const roomPattern = /^[A-Za-z0-9_-]{1,128}$/;
const identifierPattern = /^[A-Za-z0-9_-]{1,128}$/;
export const roseAmount = 0.1;

export async function piGifts(request, env, json) {
  const mainnet = env.PI_GIFTS_NETWORK === 'mainnet';
  const url = new URL(request.url);
  const action = url.pathname.split('/').at(-1);
  if ((!mainnet && env.PI_GIFTS_TESTNET !== '1') || !env.PI_NETWORK_API_KEY || !env.PI_GIFTS_DB) {
    return json({ error: 'Gift payments unavailable' }, 503);
  }
  if (mainnet && action === 'catalog' && request.method === 'GET') return json({gifts:{}, paused:true});
  const authorization = request.headers.get('Authorization') ?? '';
  async function upstream(stage, url, options) {
    let status;
    try {
      const response = await fetch(url, options);
      status = response.status;
      if (!response.ok && stage === 'room') return null;
      if (!response.ok) throw Error('Upstream request failed');
      return await response.json();
    } catch (error) {
      console.error({ message: 'Gift upstream failure', action, stage, status: status ?? null,
        reason: status == null ? 'fetch' : status >= 200 && status < 300 ? 'response_json' : 'http' });
      throw error;
    }
  }
  async function openRoom(roomId) {
    if (!roomPattern.test(roomId ?? '') || !authorization.startsWith('Bearer ')) return false;
    const project = encodeURIComponent(env.FIREBASE_PROJECT_ID ?? '');
    const room = await upstream('room', `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/rooms/${roomId}`, {
      headers: { Authorization: authorization }, signal: AbortSignal.timeout(8000),
    });
    if(room?.fields?.status?.stringValue!=='open')return false;
    if(mainnet){
      const db=await roomStore(env.PI_GIFTS_DB);
      const claims=JSON.parse(atob(authorization.slice(7).split('.')[1].replaceAll('-','+').replaceAll('_','/')));
      const member=await db('SELECT banned,seen,visit FROM room_member WHERE room=? AND uid=?',roomId,claims.sub).first();
      if(member?.banned)return false;
      const policy=await db('SELECT pin FROM room_policy WHERE room=?',roomId).first();
      if(policy?.pin && (member?.visit!==request.headers.get('X-Room-Session')||!member||member.seen<Date.now()/1000-90))return false;
    }
    return true;
  }
  async function pi(path, { token, data, post = false } = {}) {
    const stage = token ? 'pi_identity' : post ? 'pi_' + action : 'pi_payment_lookup';
    return upstream(stage, 'https://api.minepi.com/v2' + path, {
      method: post ? 'POST' : 'GET',
      headers: { Authorization: token ? 'Bearer ' + token : 'Key ' + env.PI_NETWORK_API_KEY,
        'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(8000),
    });
  }
  try {
    if (action === 'events' && request.method === 'GET') {
      const roomId = url.searchParams.get('room');
      if (!await openRoom(roomId)) return json({ error: 'Room unavailable' }, 403);
      const { results } = await env.PI_GIFTS_DB.prepare(
        mainnet ? 'SELECT payment_id AS id, gift, t.name FROM mainnet_gifts g LEFT JOIN room_gift_target t ON t.payment=g.payment_id WHERE room_id = ? ORDER BY g.rowid DESC LIMIT 30' : 'SELECT payment_id AS id FROM gifts WHERE room_id = ? ORDER BY rowid DESC LIMIT 30',
      ).bind(roomId).all();
      return json({ gifts: results.reverse() });
    }
    if (!['approve', 'complete','restore'].includes(action) || request.method !== 'POST') {
      return json({ error: 'Not found' }, 404);
    }
    const body = await request.text();
    if (body.length > 8192) return json({ error: 'Request too large' }, 413);
    let input;
    try { input = JSON.parse(body); } catch { return json({ error: 'Invalid request' }, 400); }
    const { paymentId, accessToken, roomId } = input ?? {};
    let txid=input?.txid;
    const packRequest=mainnet&&input.kind==='diamond_pack';
    if(!packRequest&&action==='approve')return json({error:'Gifts require purchased diamonds'},409);
    if(action==='restore'&&!packRequest)return json({error:'Diamond purchases only'},400);
    if (typeof paymentId !== 'string' || !identifierPattern.test(paymentId) ||
        (!packRequest && (typeof roomId !== 'string' || !roomPattern.test(roomId))) ||
        typeof accessToken !== 'string' || !accessToken ||
        (action === 'complete' && (typeof txid !== 'string' || !/^[a-f0-9]{64}$/i.test(txid)))) {
      return json({ error: 'Invalid payment request' }, 400);
    }
    if (!packRequest && action === 'approve' && !await openRoom(roomId)) return json({ error: 'Room unavailable' }, 403);
    const paymentPath = '/payments/' + paymentId;
    const [identity, payment] = await Promise.all([pi('/me', { token: accessToken }), pi(paymentPath)]);
    const metadata = payment.metadata;
    const product = mainnet && Object.hasOwn(gifts, metadata?.gift) ? gifts[metadata.gift] : null;
    if (!identity.uid || payment.user_uid !== identity.uid || payment.identifier !== paymentId ||
        payment.direction !== 'user_to_app' || payment.network !== (mainnet ? 'Pi Network' : 'Pi Testnet') ||
        (packRequest ? metadata?.kind!=='diamond_pack'||!validPack(metadata,payment.amount,action!=='approve'||payment.status?.developer_approved) :
        metadata?.roomId!==roomId||(mainnet ? !product||payment.amount!==product.amount : payment.amount!==roseAmount||metadata?.gift!=='rose')) ||
        payment.status?.cancelled || payment.status?.user_cancelled) {
      return json({ error: 'Payment does not match the gift' }, 403);
    }
    if (packRequest) {
      // The recipient in the Pi-verified payment remains fixed, including when restoring older receipts.
      const piUid=await piAccountUid(await linkStore(env),'pi:'+identity.uid);
      if(mainnet && (await isErasing(await roomStore(env.PI_GIFTS_DB),piUid) || (typeof metadata.uid==='string' && await isErasing(await roomStore(env.PI_GIFTS_DB),metadata.uid))))return json({error:'Account deletion in progress'},403);
      if(typeof metadata.uid!=='string'||(metadata.uid!==piUid && metadata.uid!==await linkedEmail(await linkStore(env),piUid))){
        return json({error:'Account does not match the payment'},403);
      }
    }
    if (action === 'approve') {
      if(packRequest){
        const q=await roomStore(env.PI_GIFTS_DB);
        await q('INSERT OR IGNORE INTO diamond_checkout(payment,uid) VALUES(?,?)',paymentId,metadata.uid).run();
      }
      if (!payment.status?.developer_approved) await pi(paymentPath + '/approve', { post: true });
      return json({ approved: true });
    }
    if (!payment.status?.developer_approved) return json({ error: 'Payment not approved' }, 409);
    if(action==='restore'){
      txid=payment.transaction?.txid;
      if(typeof txid!=='string'||!/^[a-f0-9]{64}$/i.test(txid))return json({error:'No confirmed transaction yet'},409);
    }
    let completed = payment;
    if (!payment.status.developer_completed) {
      try {
        completed = await pi(paymentPath + '/complete', { post: true, data: { txid } });
      } catch {
        completed = await pi(paymentPath);
      }
    }
    if (!completed.status?.developer_completed || !completed.status.transaction_verified ||
        completed.transaction?.txid !== txid) return json({ error: 'Transaction not confirmed' }, 409);
    if(packRequest){
      const q=await roomStore(env.PI_GIFTS_DB);
      await q('INSERT INTO diamond_purchase(payment,uid,diamonds,txid) VALUES(?,?,?,?) ON CONFLICT(payment) DO NOTHING',paymentId,metadata.uid,metadata.diamonds,txid).run();
      return json({completed:true,diamonds:metadata.diamonds});
    }
    if (mainnet) {
      await env.PI_GIFTS_DB.prepare('INSERT INTO mainnet_gifts(payment_id,room_id,gift) VALUES(?,?,?) ON CONFLICT(payment_id) DO NOTHING').bind(paymentId,roomId,metadata.gift).run();
    } else await env.PI_GIFTS_DB.prepare(
      'INSERT INTO gifts (payment_id, room_id) VALUES (?, ?) ON CONFLICT(payment_id) DO NOTHING',
    ).bind(paymentId, roomId).run();
    return json({ completed: true });
  } catch {
    return json({ error: 'Gift service temporarily unavailable' }, 502);
  }
}
