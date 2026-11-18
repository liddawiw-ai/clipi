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
1. **Firebase rules deployment**: Rules were previously deployed to Firebase `clipi-f67c0` and verified in the project's recorded CI run. Any future rule edits still require a separate authorized deployment and regression tests; server Functions are NOT deployed.
2. **Live audio/video**: No RTC provider, token minting service, relay/SFU infrastructure, moderation or cross-device media transports are integrated. Only the local camera preview is functional by design.
3. **Google/Facebook login**: Requires configured and tested provider/native OAuth values and app review settings. SMS sign-in requires enabled phone auth and correct platform verification settings.
4. **Payments / Pi / diamonds / payouts / games of chance**: Need store-approved billing and secured server-side ledger, payment providers, regulatory and platform review; intentionally unavailable in release build.
5. **Account deletion**: The app currently directs users to support; a more complete Firebase Function draft exists for deleting Auth, profile, messages and virtual wallet data, but has not been deployed or tested for failure recovery and retention obligations.
6. **Moderation operations**: Reports can be submitted, but no staffed moderation inbox, real-world enforcement, anti-abuse rate limiting, or appeals process exists.
7. **Store readiness**: Published privacy policy, terms, support contact, review procedures, user testing on two phones, iOS/Android device tests, accessibility, permission audits, and actual successful build from THIS commit are pending.
8. **Cloud costs and credentials**: A new EAS build may consume plan resources; owner approval for a new usage budget might be necessary.

## Do not claim
- Do not call the camera preview a live video broadcast.
- Do not imply the gifts or balance are cash or redeemable.
- Do not claim public store approval or support for real money, or fully compliant account deletion.

## Incremental code completion (18 Nov 2026)
- Profile screen lists blocked account IDs and allows unblock via Firestore (current user only).
- Shared room discovery supports name search and hides rooms owned by blocked accounts.
- Profile display name is validated (1–35 characters), and avatar selection is saved to Firestore.
- Google and Facebook login buttons are disabled when required public/native configuration is missing.
- Viewer cannot activate a misleading local host-camera preview; only the signed-in room owner can preview their own camera. Remote media remains disabled.
- `npm run test:release` and local JSX parse tests pass; **no device/RTC/payment integration test is implied**.
## Stage 15 source audit (2026-11-18)
- Fixed a backend six-digit wallet PIN regex that erroneously matched a literal backslash, blocking all valid PINs.
- Added a server-side five-attempt PIN lockout (15 minutes), and safe handling of malformed stored PIN hashes.
- Hardened wallet biometric screen against background-state races and stale wallet responses.
- Disabled the archived `components/Store.js` purchase flow that previously minted diamonds locally without payment verification.
- Added account-deletion cleanup for virtual wallets and PIN secrets while retaining unsettled financial records for review.
- Prevented the same account from occupying multiple audio seats on the server.
- Added `tests/wallet-safety.test.cjs` to `npm run test:ci`; source checks do not substitute for emulator and device tests.
- Latest Android EAS build was from older code. No build or device test of these changes has been completed.
