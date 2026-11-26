import {readDecisions} from './decision-log.mjs';
import {isAppOwner} from './app-owners.mjs';

export async function manageAppAdmin(q, actor, ownerUid, input, json) {
  if (!await isAppOwner(q, actor, ownerUid)) return json({error:'غير مصرح'},403);
  if(input.op==='adminDecisionLog')return readDecisions(q,input,json);
  const {number,op}=input;
  if (typeof number!=='string' || !/^[0-9]{3,7}$/.test(number))
    return json({error:'أدخل رقم حساب كليبي'},400);

  const person=await q(`SELECT n.uid, n.number, p.name,
    EXISTS(SELECT 1 FROM clipi_app_admin a WHERE a.uid=n.uid) AS admin
    FROM public_numbers n LEFT JOIN short_profile p ON p.uid=n.uid WHERE n.number=?`,number).first();
  if (!person) return json({error:'لم نجد حسابًا بهذا الرقم'},404);
  const owner=await isAppOwner(q,person.uid,ownerUid);
  if (op==='setAppAdmin') {
    if (typeof input.enabled!=='boolean' || person.uid!==input.targetUid)
      return json({error:'ابحث عن الحساب مرة أخرى'},400);
    if (owner) return json({error:'هذا الحساب مالك التطبيق'},409);
    await q(`INSERT INTO admin_decision(actor,kind,target,subject,stamp)
      SELECT ?1,?2,?3,?4,?5 WHERE EXISTS(SELECT 1 FROM clipi_app_admin WHERE uid=?3)<>?6
      AND (?1=?7 OR EXISTS(SELECT 1 FROM clipi_app_owner WHERE uid=?1))
      AND ?3 IS NOT ?7 AND NOT EXISTS(SELECT 1 FROM clipi_app_owner WHERE uid=?3)`,
      actor,input.enabled?'grant':'revoke',person.uid,number,Date.now(),Number(input.enabled),ownerUid??null).run();
    person.admin=!!await q('SELECT 1 FROM clipi_app_admin WHERE uid=?',person.uid).first();
    if(person.admin!==input.enabled)return json({error:'تعذّر تحديث الصلاحية'},409);
  }
  return json({uid:person.uid,number:person.number,name:person.name||'',admin:Boolean(person.admin),owner});
}
