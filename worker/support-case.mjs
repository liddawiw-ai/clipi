const kinds=['room','participant','message','purchase','deletion'];
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export async function supportCase(q,uid,owner,input,json){
  const staff=Boolean(owner&&uid===owner);
  if(input.op==='caseQueue'||input.op==='caseReviewed'){
    if(!staff)return json({error:'غير مصرح'},403);
    if(input.op==='caseReviewed'){
      await q("UPDATE support_case SET state='reviewed' WHERE id=? AND kind<>'deletion' AND state='open'",input.id).run();
    }
    const rows=await q("SELECT * FROM support_case WHERE state='open' ORDER BY created,id LIMIT 100").all();
    return json({cases:rows.results,staff});
  }
  if(input.op==='caseList'){
    const rows=await q('SELECT id,kind,created,state FROM support_case WHERE uid=? ORDER BY created DESC,rowid DESC LIMIT 30',uid).all();
    const deletion=await q("SELECT id FROM support_case WHERE uid=? AND kind='deletion' AND state='open'",uid).first();
    return json({cases:rows.results,staff,deletion:deletion?.id||null});
  }
  const {kind,id}=input;
  if(!kinds.includes(kind)||typeof id!=='string'||!uuid.test(id))return json({error:'طلب غير صالح'},400);
  const subject=kind==='deletion'?'':input.subject;
  const detail=kind==='deletion'?'':input.detail;
  if(typeof subject!=='string'||subject.length>512||typeof detail!=='string'||detail.length>400||(!detail.trim()&&kind!=='deletion'))return json({error:'أدخل تفاصيل الطلب'},400);
  const now=Math.floor(Date.now()/1000);
  await q(`INSERT OR IGNORE INTO support_case(id,uid,kind,subject,detail,created)
    SELECT ?,?,?,?,?,? WHERE ?='deletion' OR
    (SELECT COUNT(*) FROM support_case WHERE uid=? AND created>?)<15`,id,uid,kind,subject,detail.trim(),now,kind,uid,now-3600).run();
  const row=kind==='deletion'
    ?await q("SELECT id FROM support_case WHERE uid=? AND kind='deletion' AND state='open'",uid).first()
    :await q('SELECT id FROM support_case WHERE id=? AND uid=? AND kind=? AND subject=? AND detail=?',id,uid,kind,subject,detail.trim()).first();
  return row?json({id:row.id}):json({error:'تعذر تسجيل الطلب الآن. حاول لاحقًا.'},429);
}
