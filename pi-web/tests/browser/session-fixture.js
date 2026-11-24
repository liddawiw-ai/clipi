const user = {
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
  collection: () => query,
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
