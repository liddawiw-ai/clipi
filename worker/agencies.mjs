export const agencySchema = [
  `CREATE TABLE IF NOT EXISTS clipi_agency(
     id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, area TEXT NOT NULL DEFAULT '',
     audio TEXT NOT NULL DEFAULT '', live TEXT NOT NULL DEFAULT '', agent TEXT NOT NULL,
     host_pct INTEGER NOT NULL DEFAULT 55 CHECK(host_pct BETWEEN 0 AND 100),
     agent_pct INTEGER NOT NULL DEFAULT 10 CHECK(agent_pct BETWEEN 0 AND 100-host_pct))`,
  'CREATE TABLE IF NOT EXISTS clipi_agency_member(uid TEXT PRIMARY KEY, agency INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS agency_roster ON clipi_agency_member(agency)',
  `CREATE TABLE IF NOT EXISTS clipi_agency_statement(
    sender TEXT NOT NULL, nonce TEXT NOT NULL, agency INTEGER NOT NULL, host TEXT NOT NULL,
    month TEXT NOT NULL, diamonds INTEGER NOT NULL, host_points2 INTEGER NOT NULL,
    agent_points2 INTEGER NOT NULL, platform_points2 INTEGER NOT NULL, PRIMARY KEY(sender,nonce))`,
  'CREATE INDEX IF NOT EXISTS agency_month ON clipi_agency_statement(agency,month,host)',
  // Match the existing gift estimate in functions/index.js; nothing here credits a cash wallet.
  `CREATE TRIGGER IF NOT EXISTS snapshot_agency_support AFTER INSERT ON paid_room_gift
   WHEN NEW.host<>'' AND NEW.room NOT LIKE 'short/%' BEGIN
   INSERT INTO clipi_agency_statement
     SELECT NEW.sender,NEW.nonce,a.id,NEW.host,strftime('%Y-%m','now'),NEW.cost,
      (NEW.cost/10)*a.host_pct/100,(NEW.cost/10)*a.agent_pct/100,
      NEW.cost/10-(NEW.cost/10)*a.host_pct/100-(NEW.cost/10)*a.agent_pct/100
     FROM clipi_agency_member m JOIN clipi_agency a ON a.id=m.agency WHERE m.uid=NEW.host;
   END`
];
const fields=['name','area','audio','live'];
const currentMonth=()=>new Date().toISOString().slice(0,7);
const numberFor='COALESCE((SELECT number FROM selected_number WHERE uid=m.uid),(SELECT number FROM public_numbers WHERE uid=m.uid AND cost=0))';
export async function agencyAccount(q,uid,ownerUid,input,json){
  const owner=Boolean(ownerUid&&uid===ownerUid);
  const fail=(reason,status=400)=>json({error:reason},status);
  const {op}=input;
  if(op==='agencyList'){
    const rows=await q(`SELECT a.id,a.name,a.area,COUNT(m.uid) AS members FROM clipi_agency a
      LEFT JOIN clipi_agency_member m ON m.agency=a.id GROUP BY a.id ORDER BY a.name,a.id`).all();
    return json({agencies:rows.results,canCreate:owner});
  }
  const findUser=async number=>/^\d{1,12}$/.test(String(number||''))?
    (await q('SELECT uid FROM public_numbers WHERE number=?',String(number)).first())?.uid:null;
  if(op==='agencyCreate'){
    if(!owner)return fail('إنشاء الوكالة متاح لمالك التطبيق',403);
    const name=String(input.name||'').trim();
    const agent=input.agentNumber?await findUser(input.agentNumber):uid;
    if(!name||name.length>65||!agent)return fail('تحقق من اسم الوكالة ورقم الوكيل');
    const result=await q('INSERT INTO clipi_agency(name,agent) VALUES(?,?) ON CONFLICT(name) DO NOTHING RETURNING id',name,agent).first();
    if(!result)return fail('اسم الوكالة مستخدم',409);
    return json(result);
  }
  const agency=await q('SELECT * FROM clipi_agency WHERE id=?',Number(input.id)||0).first();
  if(!agency)return fail('الوكالة غير موجودة',404);
  const manage=owner||agency.agent===uid;
  if(op==='agencyDetail'){
    const month=input.month||currentMonth();
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return fail('الشهر غير صالح');
    const member=await q('SELECT 1 AS found FROM clipi_agency_member WHERE uid=? AND agency=?',uid,agency.id).first();
    const info=Object.fromEntries([...fields,'id','host_pct','agent_pct'].map(k=>[k,agency[k]]));
    const roster=manage?await q(`SELECT ${numberFor} AS number FROM clipi_agency_member m WHERE agency=? ORDER BY number`,agency.id).all():null;
    const monthTotals=await q(`SELECT SUM(diamonds) AS diamonds,SUM(host_points2) AS host,
       SUM(agent_points2) AS agent,SUM(platform_points2) AS platform FROM clipi_agency_statement
       WHERE agency=? AND month=? AND (?=1 OR host=?)`,agency.id,month,Number(manage),uid).first();
    const hasReport=manage||member||monthTotals?.diamonds!=null;
    const num=n=>Number(n)||0;
    const totals=hasReport?{diamonds:num(monthTotals.diamonds),host:num(monthTotals.host)/2,
      ...(manage?{agent:num(monthTotals.agent)/2,platform:num(monthTotals.platform)/2}:{})}:null;
    return json({agency:info,canManage:manage,canSetRates:owner,roster:roster?.results,month,totals});
  }
  if(!manage)return fail('إدارة هذه الوكالة تحتاج صلاحية',403);
  if(op==='agencyEdit'){
    const values=fields.map(k=>String(input[k]??agency[k]).trim());
    if(!values[0]||values[0].length>65||values.some(v=>v.length>220))return fail('تحقق من بيانات الوكالة');
    const host=input.host_pct??agency.host_pct,agent=input.agent_pct??agency.agent_pct;
    if(!owner&&(host!==agency.host_pct||agent!==agency.agent_pct))return fail('تعديل النسب متاح للمالك',403);
    if(![host,agent].every(n=>Number.isInteger(n)&&n>=0)||host+agent>100)return fail('مجموع نسبتي المضيف والوكيل يجب ألا يتجاوز ١٠٠٪');
    const changed=await q('UPDATE OR IGNORE clipi_agency SET name=?,area=?,audio=?,live=?,host_pct=?,agent_pct=? WHERE id=?',...values,host,agent,agency.id).run();
    return changed.meta.changes?json({saved:true}):fail('اسم الوكالة مستخدم',409);
  }
  const user=await findUser(input.number);
  if(!user)return fail('رقم حساب كليبي غير موجود',404);
  if(op==='agencyMemberAdd'){
    await q('INSERT INTO clipi_agency_member(uid,agency) VALUES(?,?) ON CONFLICT(uid) DO NOTHING',user,agency.id).run();
    const existing=await q('SELECT agency FROM clipi_agency_member WHERE uid=?',user).first();
    if(existing?.agency!==agency.id)return fail('العضو مسجل في وكالة أخرى',409);
    return json({saved:true});
  }
  if(op==='agencyMemberRemove'){
    await q('DELETE FROM clipi_agency_member WHERE uid=? AND agency=?',user,agency.id).run();
    return json({saved:true});
  }
  return fail('طلب غير معروف');
}
