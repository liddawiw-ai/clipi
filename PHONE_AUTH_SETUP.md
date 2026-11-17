# Clipi — Firebase phone sign-in setup

The code in this branch now requests real SMS verification using `@react-native-firebase/auth` and stores `users/{uid}` in Firestore with the native Firestore SDK.

## Required steps before a successful build

1. Firebase Console → Authentication → Sign-in method → enable **Phone**. Configure SMS regions, quotas, and test phone numbers. Real SMS may incur charges.
2. Download the **iOS** app's `GoogleService-Info.plist` and the **Android** app's `google-services.json` for Firebase project `clipi-f67c0`. Add them to the repository root under those exact filenames. Check that their registered bundle/package identifiers match `com.walid.clipi`. These config files are not service-account keys.
3. Set up the Firebase iOS phone-auth verification prerequisites (APNs, push capabilities, and reCAPTCHA fallback / URL scheme as required by Firebase) and Android SHA-1/SHA-256 fingerprints for the actual signing keys. Phone verification cannot be assumed to work without these steps.
4. Run `npm install` and `npx expo prebuild --clean` in a development environment, then build with EAS or Xcode/Android Studio. **Expo Go is insufficient** for native React Native Firebase modules. Use a development build.
5. Test Firestore security rules in the emulator, review them, and deploy them explicitly. The rules in this branch allow a signed-in user to create and update their own profile, but deny access to other collections.
6. Test first-time SMS login, returning-user login, incorrect codes, denied Firestore writes, and sign-out on physical iOS and Android devices.

## Current limitations

- Google/Facebook login remains intentionally disabled.
- Diamond balances, gifts, and game payouts in `App.js` are **demo-only local state**, not a secure backend wallet.
- The code changes have not been compiled or tested on a physical device and the Firebase Console configuration has not been changed by this commit.
- Firebase project settings, actual SMS delivery, APNs, and billing require the project owner to configure and verify them.

## Review

The entire `App.js` is updated in the branch. Review it as one file; do not copy partial snippets into the previous version.
