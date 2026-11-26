import {page} from './discovery.mjs';
export const decisionSchema=[
  'CREATE TABLE IF NOT EXISTS admin_decision(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,kind TEXT NOT NULL,target TEXT NOT NULL,subject TEXT NOT NULL,stamp INTEGER NOT NULL)',
  `CREATE TRIGGER IF NOT EXISTS audit_grant_apply AFTER INSERT ON admin_decision WHEN NEW.kind='grant' BEGIN
    INSERT INTO clipi_app_admin(uid) VALUES(NEW.target); END`,
  `CREATE TRIGGER IF NOT EXISTS audit_revoke_apply AFTER INSERT ON admin_decision WHEN NEW.kind='revoke' BEGIN
    DELETE FROM clipi_app_admin WHERE uid=NEW.target; END`,
  `CREATE TRIGGER IF NOT EXISTS audit_agency_decision AFTER UPDATE OF status ON clipi_agency_request
    WHEN OLD.status='pending' AND NEW.status IN ('approved','rejected') BEGIN
    INSERT INTO admin_decision(actor,kind,target,subject,stamp) VALUES(NEW.reviewer,NEW.status,NEW.applicant,NEW.name,unixepoch()*1000); END`
];
export async function readDecisions(q,input,json){
  const before=input.before??Number.MAX_SAFE_INTEGER;
  if(!Number.isSafeInteger(before)||before<1)return json({error:'طلب غير صالح'},400);
  const {results}=await q(`SELECT d.id AS cursor,d.kind,d.subject,d.stamp,
    COALESCE(NULLIF(a.name,''),an.number,d.actor) AS actorName,an.number AS actorNumber,
    COALESCE(NULLIF(t.name,''),tn.number,d.target) AS targetName,tn.number AS targetNumber
    FROM admin_decision d LEFT JOIN short_profile a ON a.uid=d.actor LEFT JOIN short_profile t ON t.uid=d.target
    LEFT JOIN public_numbers an ON an.uid=d.actor AND an.cost=0 LEFT JOIN public_numbers tn ON tn.uid=d.target AND tn.cost=0
    WHERE d.id<? ORDER BY d.id DESC LIMIT 31`,before).all();
  return page(results,json);
}
