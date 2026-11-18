# Clipi Release Readiness / قائمة الجاهزية

## Completed in this development branch
- Firebase phone authentication source and shared Firestore room directory/chat source.
- Room owners can **close** rooms; Firestore rules forbid new messages when closed.
- Room owners and message authors can delete messages; other users can block and report messages.
- Send buttons block duplicate submissions while a Firestore write is in progress.
- Fake host-role switching and fake remote-guest call requests removed from the production-facing room UI.
- Non-working gifts, diamonds, payouts and Greedy Star are **hidden** in non-development builds, but retained for development.
- Versioned Firestore rules and fast static regression checks (`npm run test:release`).

## Not done (needs verification / providers / authorized operators)
1. **Firebase rules deployment**: Rules in GitHub are not deployed automatically. Test with Firebase Emulator, review other live collections/clients, then use an authorized deploy. The `FIREBASE_SERVICE_ACCOUNT_CLIPI` GitHub secret is not confirmed.
2. **Live audio/video**: No RTC provider, token minting service, relay/SFU infrastructure, moderation or cross-device media transports are integrated. Only the local camera preview is functional by design.
3. **Google/Facebook login**: Requires configured and tested provider/native OAuth values and app review settings. SMS sign-in requires enabled phone auth and correct platform verification settings.
4. **Payments / Pi / diamonds / payouts / games of chance**: Need store-approved billing and secured server-side ledger, payment providers, regulatory and platform review; intentionally unavailable in release build.
5. **Account deletion**: Current app deletes sign-in credentials and a user profile document but not all associated content/subcollections; requires complete backend deletion/retention workflow and documented privacy process before launch.
6. **Moderation operations**: Reports can be submitted, but no staffed moderation inbox, real-world enforcement, anti-abuse rate limiting, or appeals process exists.
7. **Store readiness**: Published privacy policy, terms, support contact, review procedures, user testing on two phones, iOS/Android device tests, accessibility, permission audits, and actual successful build from THIS commit are pending.
8. **Cloud costs and credentials**: A new EAS build may consume plan resources; owner approval for a new usage budget might be necessary.

## Do not claim
- Do not call the camera preview a live video broadcast.
- Do not imply the gifts or balance are cash or redeemable.
- Do not claim public store approval or support for real money, or fully compliant account deletion.