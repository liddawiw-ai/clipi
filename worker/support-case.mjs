import {isAppOwner} from './app-owners.mjs';
const kinds=['video','comment','room','participant','message','purchase','deletion','help'];
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export async function supportCase(q,uid,owner,input,json){
  const ownerAccess=await isAppOwner(q,uid,owner);
  const staff=ownerAccess||Boolean(await q('SELECT 1 FROM clipi_app_admin WHERE uid=?',uid).first());
  if(input.op==='caseReply'){
    if(!staff)return json({error:'غير مصرح'},403);
    const body=typeof input.body==='string'?input.body.trim():'';
    if(!uuid.test(input.id)||!body||body.length>800)return json({error:'أدخل نص الرد'},400);
    const result=await q(`INSERT INTO support_reply(case_id,staff,body,created)
      SELECT id,?,?,? FROM support_case WHERE id=? AND (kind='help' OR (kind='withdrawal-review' AND ?=1))
      ON CONFLICT(case_id) DO NOTHING`,uid,body,Math.floor(Date.now()/1000),input.id,Number(ownerAccess)).run();
    if(!result.meta.changes){
      const saved=await q('SELECT staff,body FROM support_reply WHERE case_id=?',input.id).first();
      if(saved?.staff!==uid||saved?.body!==body)return json({error:'الطلب غير متاح للرد'},409);
    }
    return json({sent:true});
  }
  if(input.op==='caseQueue'||input.op==='caseReviewed'){
    if(!staff)return json({error:'غير مصرح'},403);
    if(input.op==='caseReviewed'){
      if(!ownerAccess)return json({error:'غير مصرح'},403);
      await q("UPDATE support_case SET state='reviewed' WHERE id=? AND kind NOT IN ('deletion','help','withdrawal-review') AND state='open'",input.id).run();
    }
    const rows=await q(`SELECT c.* FROM support_case c WHERE state='open' AND (?=1 OR kind='help')
      AND NOT EXISTS(SELECT 1 FROM support_reply WHERE case_id=c.id) ORDER BY created,id LIMIT 100`,Number(ownerAccess)).all();
    return json({cases:rows.results,staff});
  }
  if(input.op==='caseList'){
    const rows=await q(`SELECT c.id,c.kind,c.created,c.state,r.body AS reply,CASE WHEN c.kind IN ('help','withdrawal-review') THEN c.detail END AS question FROM support_case c LEFT JOIN support_reply r ON r.case_id=c.id WHERE c.uid=? ORDER BY COALESCE(r.created,c.created) DESC,c.rowid DESC LIMIT 30`,uid).all();
    const deletion=await q("SELECT id FROM support_case WHERE uid=? AND kind='deletion' AND state='open'",uid).first();
    return json({cases:rows.results,staff,deletion:deletion?.id||null});
  }
  const {kind,id}=input;
  if(!kinds.includes(kind)||typeof id!=='string'||!uuid.test(id))return json({error:'طلب غير صالح'},400);
  let subject=kind==='deletion'?'':input.subject;
  const detail=kind==='deletion'?'':input.detail;
  if(typeof subject!=='string'||subject.length>512||typeof detail!=='string'||detail.length>400||(!detail.trim()&&kind!=='deletion'))return json({error:'أدخل تفاصيل الطلب'},400);
  if(kind==='comment'){
    if(!Number.isSafeInteger(input.commentId)||input.commentId<1)return json({error:'التعليق غير متاح'},400);
    const retry=await q('SELECT subject,detail FROM support_case WHERE uid=? AND kind=? AND id=?',uid,kind,id).first();
    if(retry){
      const saved=JSON.parse(retry.subject);
      return saved.clip===subject&&saved.id===input.commentId&&retry.detail===detail.trim()?json({id}):json({error:'طلب غير صالح'},409);
    }
    const row=await q('SELECT rowid AS id,clip,uid,body FROM short_comment WHERE rowid=? AND clip=?',input.commentId,subject).first();
    if(!row)return json({error:'التعليق غير متاح'},404);
    subject=JSON.stringify(row);
  }
  const now=Math.floor(Date.now()/1000);
  await q(`INSERT OR IGNORE INTO support_case(id,uid,kind,subject,detail,created)
    SELECT ?,?,?,?,?,? WHERE ?='deletion' OR
    (SELECT COUNT(*) FROM support_case WHERE uid=? AND created>?)<15`,id,uid,kind,subject,detail.trim(),now,kind,uid,now-3600).run();
  const row=kind==='deletion'
    ?await q("SELECT id FROM support_case WHERE uid=? AND kind='deletion' AND state='open'",uid).first()
    :await q('SELECT id FROM support_case WHERE id=? AND uid=? AND kind=? AND subject=? AND detail=?',id,uid,kind,subject,detail.trim()).first();
  return row?json({id:row.id}):json({error:'تعذر تسجيل الطلب الآن. حاول لاحقًا.'},429);
}
