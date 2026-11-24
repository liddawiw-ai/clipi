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
    assert.equal(agency.data.canCreate, expected);
    assert.equal(cases.status, expected ? 200 : 403);
    assert.equal(Boolean(wallet.ownerBox), expected);
    assert.equal(wallet.diamonds, 0);
  }
  db.close();
});
