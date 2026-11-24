export const appOwnerSchema =
  'CREATE TABLE IF NOT EXISTS clipi_app_owner(uid TEXT PRIMARY KEY NOT NULL)';

// Call only with the stable UID obtained from the verified sign-in token.
export async function isAppOwner(q, uid, configuredOwnerUid) {
  if (!uid) return false;
  if (uid === configuredOwnerUid) return true;
  return Boolean(await q('SELECT 1 FROM clipi_app_owner WHERE uid=?', uid).first());
}
