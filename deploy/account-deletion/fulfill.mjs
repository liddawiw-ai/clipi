import {FieldPath, FieldValue} from 'firebase-admin/firestore';

async function eachPage(query, visit) {
  let cursor;
  for (;;) {
    let page = query.orderBy(FieldPath.documentId()).limit(100);
    if (cursor) page = page.startAfter(cursor);
    const result = await page.get();
    for (const doc of result.docs) await visit(doc);
    if (result.size < 100) return;
    cursor = result.docs.at(-1);
  }
}

async function eraseDocuments(db, uid, request) {
  const remove = FieldValue.delete();
  await eachPage(db.collectionGroup('messages').where('userUid','==',uid), doc => doc.ref.delete());
  await eachPage(db.collectionGroup('audioSeats').where('uid','==',uid), doc => doc.ref.delete());

  // The document ID is the target of a block or an invitation, independent of who created it.
  for (const collection of ['stageRequests','blocked']) {
    await eachPage(db.collectionGroup(collection), async doc => {
      if(doc.id === uid) await doc.ref.delete();
    });
  }
  await eachPage(db.collection('rooms'), async room => {
    const fields = room.data(), patch = {};
    if(fields.ownerUid === uid) {
      await request('room', {room:room.id});
      Object.assign(patch,{status:'closed',ownerUid:remove,ownerName:remove,name:'Closed room'});
    }
    if(fields.guestUid === uid) Object.assign(patch,{guestUid:remove,guestName:remove});
    if(fields.guestRequestUid === uid) Object.assign(patch,{guestRequestUid:remove,guestRequestAt:remove});
    const updates=Object.entries(patch).flat();
    if(Object.hasOwn(fields.stageGuests||{},uid)) updates.push(new FieldPath('stageGuests',uid),remove);
    if(updates.length) await room.ref.update(...updates,{lastUpdateTime:room.updateTime});
  });
  for(const field of ['reporterUid','reportedUid','reviewedBy']) {
    await eachPage(db.collection('reports').where(field,'==',uid), doc=>doc.ref.update({[field]:remove}));
  }
  await db.recursiveDelete(db.collection('users').doc(uid));
  await db.recursiveDelete(db.collection('virtualWallets').doc(uid));
  const earnings=db.collection('earningsWallets').doc(uid);
  const record=await earnings.get();
  if(record.exists){
    const data=record.data();
    const orders=await earnings.collection('withdrawals').limit(1).get();
    if(data.availablePoints || data.pendingPoints || data.activeWithdrawal || data.lastPayoutRequestAt || !orders.empty) {
      await earnings.update({pinSalt:remove,pinHash:remove,pinLockedUntil:remove,pinFailedAttempts:remove,
        pinUpdatedAt:remove,accountDeletedAt:FieldValue.serverTimestamp()});
    }else await db.recursiveDelete(earnings);
  }
}

async function ifIdentityExists(operation) {
  try{return await operation()}
  catch(error){if(error.code!=='auth/user-not-found')throw error}
}

export async function fulfill({db,auth,request,ticket,now=Date.now}) {
  const info=await request('inspect');
  if(info.state==='completed') {
    await db.collection('_clipiDeletionJobs').doc(ticket).delete();
    return {state:'completed'};
  }
  const uid=info.uid;
  await request('start');
  const job=db.collection('_clipiDeletionJobs').doc(ticket);
  let started=(await job.get()).get('disabledAt');
  if(!Number.isFinite(started)){
    await ifIdentityExists(()=>auth.updateUser(uid,{disabled:true}));
    await ifIdentityExists(()=>auth.revokeRefreshTokens(uid));
    started=await db.runTransaction(async tx=>{
      const previous=(await tx.get(job)).get('disabledAt');
      if(Number.isFinite(previous))return previous;
      const at=now();
      tx.set(job,{disabledAt:at});
      return at;
    });
  }
  // Firestore clients can write with an already-issued ID token for up to an hour.
  // Wait from the actual revocation, including clock skew, then sweep Firestore.
  const resumeAt=started+65*60*1000;
  if(now()<resumeAt)return {state:'waiting',resumeAt};
  await eraseDocuments(db,uid,request);
  let result;
  do{result=await request('content')}while(!result.cleaned);
  await ifIdentityExists(()=>auth.deleteUser(uid));
  await request('finish');
  await job.delete();
  return {state:'completed'};
}
