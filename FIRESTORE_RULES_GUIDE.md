# Firestore security rules — Clipi

The repository's `firestore.rules` is a **proposed** ruleset, not proof of deployment to Firebase.

- Signed-in users can get their own `users/{uid}` document, create it with `name`, optional `photoURL`, and `createdAt`, and update only `name` and `photoURL`.
- `createdAt` must be a server timestamp on creation (`serverTimestamp()` in client code).
- Users cannot list other profiles, delete profiles, or access any other collections through the client SDK. The catch-all rule denies all other access.
- No client access is permitted for wallets, diamonds, gifts, games, or rooms until specific authorization and trusted server-side logic are implemented.

## Before deployment

1. Run Firebase Emulator Suite tests for own-user access, cross-user denial, anonymous denial, unexpected fields, and update restrictions.
2. Confirm Firebase CLI targets project `clipi-f67c0`; review rules in a PR before deploying.
3. Keep the current Firebase console deny-all policy until tests pass. A GitHub commit alone does not deploy security rules.
4. Implement verified phone authentication via a correctly configured Expo development build; the current `App.js` login is only a demo.

The Firebase web config is not a service-account secret. Never commit admin credentials, private signing keys, or SMS verification codes.
