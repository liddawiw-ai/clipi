import {manageAppAdmin} from './app-admins.mjs';
import {account} from './identity.mjs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {roomStore} from './room-controls.mjs';
import {agencyAccount} from './agencies.mjs';
import {supportCase} from './support-case.mjs';
import {readWallet} from './diamond-wallet.mjs';

test('the two verified accounts share management access by UID', async () => {
  const db = new DatabaseSync(':memory:');
  const adapter = {
    prepare(query) {
      return {query, bind(...params) {
        const statement = db.prepare(query);
        return {
          run: () => ({meta: statement.run(...params)}),
          first: () => statement.get(...params),
          all: () => ({results: statement.all(...params)}),
        };
      }};
    },
    batch(statements) { for (const {query} of statements) db.exec(query); },
  };
  const q = await roomStore(adapter);
  const register = db.prepare('INSERT INTO clipi_app_owner(uid) VALUES(?)');
  register.run('google-test-user');
  register.run('pi-test-user');
  db.prepare('INSERT INTO public_numbers(number,uid,cost) VALUES(?,?,?)')
    .run('1000001', 'google-test-user', 0);

  const reply = (data, status = 200) => ({data, status});
  for (const uid of ['google-test-user', 'pi-test-user', 'existing-owner', 'regular-user', '1000001']) {
    const expected = ['google-test-user', 'pi-test-user', 'existing-owner'].includes(uid);
    const agency = await agencyAccount(q, uid, 'existing-owner', {op:'agencyList'}, reply);
    const cases = await supportCase(q, uid, 'existing-owner', {op:'caseQueue'}, reply);
    const wallet = await readWallet(q, uid, 'existing-owner');
    assert.equal((await account(q,uid,{op:'read'},100,reply,'existing-owner')).data.canManageAppAdmins,expected);
    assert.equal(agency.data.canCreate, expected);
    assert.equal(cases.status, expected ? 200 : 403);
    assert.equal(Boolean(wallet.ownerBox), expected);
    assert.equal(wallet.diamonds, 0);
  }
  const actor='google-test-user', target='ordinary-target';
  db.prepare('INSERT INTO public_numbers VALUES(?,?,0)').run('2000011',target);
  db.prepare('INSERT INTO room_admin VALUES(?,?)').run('room','room-staff');
  const api=(who,input)=>manageAppAdmin(q,who,'existing-owner',input,reply);
  const lookup={op:'lookupAppAdmin',number:'2000011'};
  const grant={op:'setAppAdmin',number:lookup.number,targetUid:target,enabled:true};
  for(const who of ['regular-user','room-staff',target]){
    assert.equal((await api(who,{...lookup,owner:true})).status,403);
    assert.equal((await api(who,{...grant,owner:true})).status,403);
  }
  assert.equal((await api(actor,{...lookup,number:'9999999'})).status,404);
  assert.equal((await api(actor,{...grant,targetUid:'another-target'})).status,400);
  assert.equal((await api(actor,{...grant,number:'1000001',targetUid:actor})).status,409);
  assert.equal((await api(actor,lookup)).data.admin,false);
  for(const owner of [actor,'pi-test-user','existing-owner']){
    assert.equal((await api(owner,grant)).data.admin,true);
  }
  assert.equal((await api(target,grant)).status,403);
  assert.equal((await supportCase(q,target,'existing-owner',{op:'caseQueue'},reply)).status,200);
  assert.equal((await api(actor,{...grant,enabled:false})).data.admin,false);
  assert.equal((await supportCase(q,target,'existing-owner',{op:'caseQueue'},reply)).status,403);
  assert.equal(db.prepare('SELECT uid FROM room_admin WHERE room=?').get('room').uid,'room-staff');
  db.close();
});
