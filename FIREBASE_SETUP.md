# Firebase integration status

Firebase project `clipi-f67c0` is initialized in `firebase.js` and the Firebase SDK is declared in `package.json`.

**Not yet complete:** Firebase phone sign-in, persistent users and rooms, trusted wallet transactions, or backend authorization. `App.js` still uses simulated login and local diamonds.

## Next steps

1. Configure native iOS/Android phone verification with an Expo development build and test on real devices.
2. Connect verified Firebase user IDs to Firestore and test least-privilege Security Rules. Keep default deny-all rules until specific rules are ready.
3. Handle gifts, purchases, and game settlement on a trusted backend. Never allow the client to set its own diamond balance.
4. Configure App Check, abuse protection, and payment/game compliance before production.

Firebase web config is not a server secret; never commit service-account keys or signing credentials.
