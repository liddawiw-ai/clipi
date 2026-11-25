import {isAppOwner} from './app-owners.mjs';

export async function manageAppAdmin(q, actor, ownerUid, input, json) {
  if (!await isAppOwner(q, actor, ownerUid)) return json({error:'غير مصرح'},403);
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
    if (input.enabled) await q('INSERT OR IGNORE INTO clipi_app_admin(uid) VALUES(?)',person.uid).run();
    else await q('DELETE FROM clipi_app_admin WHERE uid=?',person.uid).run();
    person.admin=input.enabled;
  }
  return json({uid:person.uid,number:person.number,name:person.name||'',admin:Boolean(person.admin),owner});
}
