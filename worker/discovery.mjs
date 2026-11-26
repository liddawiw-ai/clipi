export const discoverySchema=[
  'CREATE TABLE IF NOT EXISTS short_view_event(viewer TEXT NOT NULL,clip TEXT NOT NULL,visit TEXT NOT NULL,finished INTEGER NOT NULL,seen INTEGER NOT NULL,PRIMARY KEY(viewer,clip,visit))',
  'CREATE INDEX IF NOT EXISTS short_view_by_clip ON short_view_event(clip,viewer,finished)',
  'CREATE TABLE IF NOT EXISTS short_hidden(viewer TEXT NOT NULL,clip TEXT NOT NULL,PRIMARY KEY(viewer,clip))',
  `CREATE TRIGGER IF NOT EXISTS remove_short_discovery AFTER DELETE ON short_clip BEGIN
    DELETE FROM short_view_event WHERE clip=OLD.id; DELETE FROM short_hidden WHERE clip=OLD.id; END`
];
const lastId=value=>value===undefined||Number.isSafeInteger(value)&&value>0;
export async function discoveryQuery(q,uid,input,json){
  if(input.op==='shortHistory'){
    if(!lastId(input.before))return json({error:'طلب غير صالح'},400);
    const rows=await q(`SELECT c.id,c.title,MAX(e.rowid) AS cursor FROM short_view_event e JOIN short_clip c ON c.id=e.clip
      WHERE e.viewer=? AND c.object_key IS NOT NULL GROUP BY c.id HAVING MAX(e.rowid)<? ORDER BY cursor DESC LIMIT 31`,
      uid,input.before??Number.MAX_SAFE_INTEGER).all();
    return page(rows.results,json);
  }
  const text=input.query;
  if(typeof text!=='string'||!text.trim()||text.length>100||!['accounts','videos'].includes(input.kind))return json({error:'طلب غير صالح'},400);
  const query=text.trim(),number=query.replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)&15));
  const offset=input.offset??0;
  if(!Number.isSafeInteger(offset)||offset<0)return json({error:'طلب غير صالح'},400);
  const rows=input.kind==='videos'?await q(`SELECT id,title FROM short_clip WHERE object_key IS NOT NULL
    AND (id=?1 OR instr(lower(title),lower(?1))>0) ORDER BY rowid DESC LIMIT 31 OFFSET ?2`,query,offset).all():
    await q(`WITH accounts(uid) AS (SELECT uid FROM short_profile UNION SELECT uid FROM public_numbers WHERE cost=0)
    SELECT a.uid,p.name,p.avatar,COALESCE(n.number,b.number) AS number FROM accounts a LEFT JOIN short_profile p ON p.uid=a.uid
    LEFT JOIN selected_number n ON n.uid=a.uid LEFT JOIN public_numbers b ON b.uid=a.uid AND b.cost=0
    WHERE instr(lower(p.name),lower(?1))>0 OR EXISTS(SELECT 1 FROM public_numbers x WHERE x.uid=a.uid AND x.number=?2)
    ORDER BY (COALESCE(n.number,b.number)=?2) DESC,p.name,a.uid LIMIT 31 OFFSET ?3`,query,number,offset).all();
  return json({items:rows.results.slice(0,30),next:rows.results.length>30?offset+30:null});
}
export function page(rows,json){
  const items=rows.slice(0,30);
  return json({items,next:rows.length>30?items.at(-1).cursor:null});
}
export async function watchAction(q,uid,owner,input,json){
  const {op,clip}=input;
  if(op==='shortInsights'){
    if(owner!==uid)return json({error:'غير مصرح'},403);
    const totals=await q(`SELECT COUNT(*) AS views,COUNT(DISTINCT viewer) AS viewers,
      COUNT(DISTINCT CASE WHEN finished=1 THEN viewer END) AS completed FROM short_view_event WHERE clip=? AND viewer<>?`,clip,owner).first();
    return json(totals);
  }
  if(op==='shortHide'){
    await q('INSERT OR IGNORE INTO short_hidden SELECT ?,id FROM short_clip WHERE id=? AND object_key IS NOT NULL',uid,clip).run();
  }else{
    if(typeof input.visit!=='string'||!/^[a-f0-9-]{36}$/i.test(input.visit)||typeof input.finished!=='boolean')return json({error:'طلب غير صالح'},400);
    await q(`INSERT INTO short_view_event(viewer,clip,visit,finished,seen)
      SELECT ?,id,?,?,? FROM short_clip WHERE id=? AND object_key IS NOT NULL
      ON CONFLICT(viewer,clip,visit) DO UPDATE SET finished=1 WHERE excluded.finished=1 AND short_view_event.finished=0`,
      uid,input.visit,Number(input.finished),Date.now(),clip).run();
  }
  return json({ok:true});
}
