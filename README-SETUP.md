# Clipi Integrated — development candidate

This integrates the existing full Clipi screens with Firebase shared room directory and real-time cross-device **text** chat. The Royal audio (eight seats) and video (host camera and guest picture-in-picture) screens remain previews; RTC across devices is **not** connected. Virtual gifts, diamonds, store, Greedy Star, payout drafts are local-only demos and MUST NOT be represented as financial transactions. Login supports Firebase phone; Google and Facebook require provider/OAuth credentials and native configuration.

## Run and deploy
1. Expo project `8b7b92e2-ebd2-48a4-a617-16b83bc83449`, Android package/iOS bundle `com.walid.clipi`; matching Firebase config files already exist in connected GitHub repo.
2. Deploy `firestore.rules` **only after verifying** against existing collections and testing them with Firebase Emulator. The GitHub workflow deployment requires the existing repo secret `FIREBASE_SERVICE_ACCOUNT_CLIPI`. Updating this file in git does not deploy it.
3. Test `npm install && npx expo install --check`, then EAS preview build. iOS requires Apple credentials.
4. Verify two phones can log in, see the same room and exchange chat text. Moderation reports need an operator inbox and removal process. Account deletion needs a backend cascade and legal retention policy before a public store release.
5. Configure native Google/Facebook auth OAuth and app IDs in EAS environment before enabling. The Facebook scheme requires `FACEBOOK_APP_ID` and `FACEBOOK_CLIENT_TOKEN`; Google requires `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
6. Before making audio/video fully functional, integrate an audited RTC provider with server-generated short-lived tokens, actual remote streams, moderator controls and user consent. Never issue RTC tokens from the mobile app.
7. Before enabling payments/payouts or stakes, integrate store-compliant billing and a secure backend ledger, KYC/AML or gambling compliance where applicable, abuse controls and actual processor integrations.

## Intended release policy
This is a DEVELOPMENT CANDIDATE, not a certified finished public product. Build success means compilation only, not functional correctness. Keep the existing `release/clipi-mvp-beta` as the safer small chat-only release.