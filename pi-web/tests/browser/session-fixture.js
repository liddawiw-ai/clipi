const user = new URLSearchParams(location.search).has('signedOut') ? null : {
  uid: 'layout-fixture',
  displayName: 'Layout test',
  getIdToken: async () => 'fixture'
};
export const auth = () => ({
  currentUser: user,
  onAuthStateChanged(fn) {
    queueMicrotask(() => fn(user));
    return () => {};
  }
});
const query = {
  collection: name => name==='rooms' ? {
    ...query,orderBy(){return this},limit(){return this},onSnapshot(fn){
      const docs=['audio','video'].map(type=>({id:'cover-'+type,data:()=>({type,name:'Cover fixture '+type,ownerUid:'test-'+type,status:'open'})}));
      queueMicrotask(()=>fn({docs}));return ()=>{};
    }
  }:query,
  doc: () => query,
  orderBy: () => query,
  limit: () => query,
  get: async () => ({ exists: false }),
  onSnapshot(fn) {
    queueMicrotask(() => fn({ docs: [] }));
    return () => {};
  }
};
export const firestore = () => query;
export const Alert = { alert() {} };
export const piSdk = () => ({}),
  piLogin = () => {},
  verifyEmailForPi = () => {};

export const functions = () => ({httpsCallable: () => async () => ({data:{}})});
