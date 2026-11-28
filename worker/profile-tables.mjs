import {games,seatsFor,match,move,viewFor} from '../pi-web/TableRules.mjs';
import {paidBalance} from './diamond-wallet.mjs';
const cosmetics={royal:{cost:500,label:'ذهبي ملكي',color:'#b58a39'},sapphire:{cost:800,label:'ياقوت أزرق',color:'#355ca5'},emerald:{cost:1000,label:'زمرد فاخر',color:'#21745d'}};
async function cosmeticState(q,uid,kind){
  const owned=await q('SELECT item FROM game_cosmetic_purchase WHERE uid=?',uid).all();
  const equipped=await q('SELECT item FROM game_cosmetic_equipped WHERE uid=? AND kind=?',uid,kind).first();
  const balance=await q('SELECT '+paidBalance+' AS diamonds',uid,uid).first();
  return {catalog:Object.entries(cosmetics).map(([id,v])=>({id,...v})),owned:owned.results.map(v=>v.item),equipped:equipped?.item||'classic',diamonds:balance.diamonds};
}


export const tableSchema=[
  'CREATE TABLE IF NOT EXISTS game_tables(code TEXT PRIMARY KEY,kind TEXT,rev INTEGER,changed INTEGER,phase TEXT,data TEXT)',
  'CREATE INDEX IF NOT EXISTS game_lobbies ON game_tables(kind,phase,changed)',
  'CREATE TABLE IF NOT EXISTS game_members(uid TEXT,kind TEXT,code TEXT,PRIMARY KEY(uid,kind))',
  'CREATE INDEX IF NOT EXISTS game_members_by_code ON game_members(code)',
  'CREATE TABLE IF NOT EXISTS game_results(code TEXT,kind TEXT,uid TEXT,name TEXT,won INTEGER NOT NULL,PRIMARY KEY(code,uid))',
  'CREATE INDEX IF NOT EXISTS game_results_kind ON game_results(kind,uid)',
  `CREATE TRIGGER IF NOT EXISTS game_record_result AFTER UPDATE ON game_tables
    WHEN NEW.phase='finished' AND OLD.phase='playing' BEGIN
    INSERT OR IGNORE INTO game_results
    SELECT NEW.code,NEW.kind,json_extract(value,'$.uid'),json_extract(value,'$.name'),
    CASE WHEN NEW.kind='jackaroo' THEN CAST(key AS INTEGER)%2=json_extract(NEW.data,'$.game.winner')
    ELSE CAST(key AS INTEGER)=json_extract(NEW.data,'$.game.winner') END
    FROM json_each(NEW.data,'$.players');
    END`,
  ...['INSERT','UPDATE'].map(action=>`CREATE TRIGGER IF NOT EXISTS game_seats_${action} AFTER ${action} ON game_tables BEGIN
    DELETE FROM game_members WHERE code=NEW.code;
    INSERT INTO game_members SELECT json_extract(value,'$.uid'),NEW.kind,NEW.code FROM json_each(NEW.data,'$.players');
    END`),
  'CREATE TRIGGER IF NOT EXISTS game_remove_members AFTER DELETE ON game_tables BEGIN DELETE FROM game_members WHERE code=OLD.code; END'
];
function present(row,uid){
  if(!row)return null;
  const {players,game}=JSON.parse(row.data),me=players.findIndex(p=>p.uid===uid);
  return {code:row.code,kind:row.kind,rev:row.rev,phase:row.phase,me,players:players.map(p=>p.name),game:viewFor(game,me)};
}
export async function profileTables(q,uid,input,json){
  const {op,kind}=input;
  if(typeof kind!=='string'||!Object.hasOwn(games,kind))return json({error:'لعبة غير متاحة'},400);
  const now=Date.now(),expiry=now-86400000;
  if(op==='tableCosmetics')return json(await cosmeticState(q,uid,kind));
  if(op==='tableBuyCosmetic'||op==='tableEquipCosmetic'){
    const item=input.item;
    if(typeof item!=='string'||(item!=='classic'&&!Object.hasOwn(cosmetics,item)))return json({error:'ترقية غير متاحة'},400);
    if(op==='tableBuyCosmetic'){
      if(item==='classic')return json({error:'ترقية غير متاحة'},400);
      await q(`INSERT OR IGNORE INTO game_cosmetic_purchase(uid,item,cost) SELECT ?,?,? WHERE (${paidBalance})>=?`,uid,item,cosmetics[item].cost,uid,uid,cosmetics[item].cost).run();
    }
    if(item!=='classic'&&!await q('SELECT item FROM game_cosmetic_purchase WHERE uid=? AND item=?',uid,item).first())return json({error:'الرصيد غير كافٍ أو الترقية غير مملوكة'},409);
    await q('INSERT INTO game_cosmetic_equipped VALUES(?,?,?) ON CONFLICT(uid,kind) DO UPDATE SET item=excluded.item',uid,kind,item).run();
    return json(await cosmeticState(q,uid,kind));
  }

  if(op==='tableRanking'){
    const {results}=await q('SELECT uid,MAX(name) AS name,COUNT(*) AS played,SUM(won) AS wins FROM game_results WHERE kind=? GROUP BY uid ORDER BY SUM(won)*3+COUNT(*) DESC,uid LIMIT 50',kind).all();
    const personal=await q('SELECT COUNT(*) AS played,COALESCE(SUM(won),0) AS wins FROM game_results WHERE kind=? AND uid=?',kind,uid).first();
    return json({ranking:results.map(({uid:player,...row})=>({...row,me:player===uid,xp:row.played*10+row.wins*30})),personal:{...personal,xp:personal.played*10+personal.wins*30}});
  }
  const active=await q('SELECT t.* FROM game_tables t JOIN game_members m ON m.code=t.code WHERE m.uid=? AND m.kind=?',uid,kind).first();
  if(active&&active.changed<expiry){
    await q('DELETE FROM game_tables WHERE code=? AND rev=? AND changed<?',active.code,active.rev,expiry).run();
    return profileTables(q,uid,input,json);
  }
  if(op==='tableList'){
    const {results}=await q(`SELECT code,json_array_length(data,'$.players') AS seats,json_extract(data,'$.players[0].name') AS host
      FROM game_tables WHERE kind=? AND phase='lobby' AND changed>=? AND json_array_length(data,'$.players')<? ORDER BY changed DESC LIMIT 24`,kind,expiry,Math.max(...seatsFor(kind))).all();
    return json({table:present(active,uid),lobbies:results});
  }
  const name=String(input.name||'لاعب').trim().slice(0,30)||'لاعب';
  const player={uid,name};
  if(op==='tableMatch'){
    if(active)return json({table:present(active,uid)});
    const {results}=await q("SELECT code FROM game_tables WHERE kind=? AND phase='lobby' AND changed>=? AND json_array_length(data,'$.players')<? ORDER BY changed ASC LIMIT 12",kind,now-300000,Math.max(...seatsFor(kind))).all();
    for(const lobby of results){
      const joined=await profileTables(q,uid,{...input,op:'tableJoin',code:lobby.code},(body,status=200)=>({body,status}));
      if(joined.status===200)return json(joined.body);
      if(joined.status!==409&&joined.status!==404)return json(joined.body,joined.status);
    }
    return profileTables(q,uid,{...input,op:'tableCreate'},json);
  }
  if(op==='tableCreate'){
    if(active)return json({table:present(active,uid)});
    const code=crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase();
    try{
      const row=await q('INSERT INTO game_tables VALUES(?,?,1,?,?,?) RETURNING *',code,kind,now,'lobby',JSON.stringify({players:[player],game:null})).first();
      return json({table:present(row,uid)});
    }catch(e){if(!String(e).includes('UNIQUE'))throw e;return json({error:'حدّث قائمة الطاولات'},409);}
  }
  const code=typeof input.code==='string'?input.code.trim().toUpperCase():'';
  if(!/^[A-F0-9]{10}$/.test(code))return json({error:'تحقق من رمز الطاولة'},400);
  const row=active?.code===code?active:await q('SELECT * FROM game_tables WHERE code=? AND kind=? AND changed>=?',code,kind,expiry).first();
  if(!row)return json({error:'انتهت الطاولة'},404);
  const data=JSON.parse(row.data),seat=data.players.findIndex(p=>p.uid===uid);
  let phase=row.phase;
  if(op==='tableJoin'){
    if(seat!==-1)return json({table:present(row,uid)});
    if(active||phase!=='lobby'||data.players.length>=Math.max(...seatsFor(kind)))return json({error:'المقعد غير متاح أو لديك طاولة مفتوحة'},409);
    data.players.push(player);
  }else{
    if(seat===-1)return json({error:'انضم إلى الطاولة أولًا'},403);
    if(op==='tableRead')return json({table:present(row,uid)});
    if(input.rev!==row.rev)return json({error:'تغيّرت الطاولة، حدّث الدور'},409);
    if(op==='tableStart'){
      if(phase!=='lobby'||seat!==0||!seatsFor(kind).includes(data.players.length))return json({error:'انتظر اكتمال اللاعبين وبدء المضيف'},409);
      data.game=match(kind,data.players.length);phase='playing';
    }else if(op==='tableMove'){
      if(phase!=='playing'||data.game.turn!==seat)return json({error:'انتظر دورك'},409);
      try{data.game=move(data.game,input.action);}catch(e){return json({error:e.message},400);}
      if(data.game.winner!==null)phase='finished';
    }else if(op==='tableLeave'){
      if(phase!=='lobby'||data.players.length===1){
        const r=await q('DELETE FROM game_tables WHERE code=? AND rev=?',code,row.rev).run();
        return r.meta.changes?json({table:null}):json({error:'حدّث الطاولة ثم أعد المحاولة'},409);
      }
      data.players.splice(seat,1);
    }else return json({error:'طلب غير صالح'},400);
  }
  let updated;
  try{
    updated=await q('UPDATE game_tables SET data=?,phase=?,rev=rev+1,changed=? WHERE code=? AND rev=? RETURNING *',JSON.stringify(data),phase,now,code,row.rev).first();
  }catch(e){if(!String(e).includes('UNIQUE'))throw e;return json({error:'لديك طاولة مفتوحة، حدّث القائمة'},409);}
  if(!updated)return json({error:'تغيّرت الطاولة، أعد المحاولة بعد التحديث'},409);
  return json({table:op==='tableLeave'?null:present(updated,uid)});
}
