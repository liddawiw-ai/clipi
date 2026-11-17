# Clipi — Firebase phone authentication integration

## Status
This branch introduces a native Firebase phone authentication service. **It is not wired to App.js yet and is not a working login flow.** The current in-memory login in App.js must not be represented as verified authentication.

## Firebase project
- Firebase project ID: `clipi-f67c0`
- Expo iOS bundle identifier: `com.walid.clipi`
- Expo Android package: `com.walid.clipi`

The existing Firebase web app configuration does **not** replace native Firebase app registrations.

## Required setup before integrating App.js
1. In Firebase Console, register **iOS** and **Android** apps using the identifiers above.
2. Download `GoogleService-Info.plist` (iOS) and `google-services.json` (Android). Keep them out of public commits; configure secure EAS handling for native config.
3. Install compatible native packages with `npx expo install @react-native-firebase/app @react-native-firebase/auth`, then add the official RNFirebase Expo config plugins and native config file paths to `app.json`.
4. For iOS phone verification, configure the required APNs/silent push and fallback verification setup. For Android, configure SHA-1/SHA-256 app fingerprints and Play Integrity / verification requirements.
5. Build an **Expo development client** with EAS. Native phone auth is **not supported in Expo Go**.
6. Configure Firebase Authentication phone provider, SMS region policy, test numbers, and billing/quota as appropriate.
7. Only then integrate `src/auth/phoneAuth.js` into `App.js` with SMS request, code entry, verification, loading/errors, persistent auth state, and sign-out.
8. Protect Firestore/Cloud Functions data with server-enforced Firebase Auth security rules. Never trust local diamond balances for transactions.

## Safety
Never paste private service account keys, signing credentials, APNs keys, or real SMS verification codes into GitHub or chat. Firebase web `apiKey` is an app identifier, not a server-side secret, but must still be restricted appropriately.

## Known limitations
No live SMS or native device build has been tested in this branch. No changes to the Clipi UI, game, or wallet logic are included.
