# Clipi — Release candidate / first tester build

This branch intentionally ships **Firebase phone login + cross-device shared text rooms** only. It does **not** claim to offer working RTC video/audio. Store purchases, Pi, virtual betting, gifting and payouts are not enabled. Later code remains on `feature/firebase-phone-auth`.

## Steps
1. Ensure `GoogleService-Info.plist` and `google-services.json` match bundle ID `com.walid.clipi` and package `com.walid.clipi`. Enable Firebase Phone provider, configure iOS/APNs and Android SHA-1/SHA-256 as appropriate.
2. Deploy **this branch's** `firestore.rules` to project `clipi-f67c0` before testing shared rooms. Check rules using Firebase emulator first. Firestore may ask for the index for the rooms query; create if prompted.
3. Install dependencies: `npm install` and verify Expo dependencies with `npx expo install --check` (the existing repo Expo SDK 53 package set may require correction before build).
4. Sign in to your own Expo/EAS account: `npx eas-cli login`; run `npx eas-cli build --platform android --profile preview` to produce an APK. This requires the account owner and build signing credentials.
5. Test with two real Android devices: verified SMS login, create room, other device sees room, send/receive messages, block, report, logout and delete account.
6. iPhone requires Apple Developer credentials and a device registration for ad hoc preview, or an App Store Connect/TestFlight release flow.
7. Before public store submission: moderation team and review process, published privacy policy and contact, account deletion of all personal data and content according to documented retention, abuse rate limits, legal compliance, and successful device/build tests.

**Warning:** This is not yet published to Play Store/App Store; a commit does not start an EAS build or deploy Firestore rules. Reports are written for admin review, but no admin review system is included yet. Client-side local blocking is not platform-wide enforcement.