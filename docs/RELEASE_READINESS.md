# Clipi — release readiness and ten-stage execution plan

Status: NOT READY FOR GOOGLE PLAY. No Android build should be triggered until every release gate is satisfied.

## Non-negotiable release gates
1. Android target API >= 36 (Google Play requirement effective 2026-08-31). Expo SDK 53 currently used; upgrade Expo/React Native and native plugins together, verify Gradle compile/target SDK.
2. Fix native LiveKit/WebRTC crashes on real Android devices. Current RTC_NATIVE_ENABLED is opt-in and must remain off until native integration and backend are verified.
3. Audio rooms: real multi-device audio, seat authorization, reconnect, mute, mic permissions, host removal, background lifecycle.
4. Video rooms: live host camera and one approved guest, no unauthorized publish, camera/mic permission handling.
5. PK: real second host connection, authenticated invitation/acceptance/cancel/timeout, validated server-side score accounting, authoritative outcome. Existing UI is a preview ONLY.
6. Gifts: server-authoritative diamond debits and gift receipts, rate limits, idempotency, ledger integrity, no fabricated balances.
7. Greedy Star: demo-only until a reviewed compliant server-authoritative game and legal/payment assessment. Do not enable real-money or cash-equivalent wagering by default.
8. Auth and security: account deletion, moderation/reporting/blocking, abuse controls, Firestore rules and App Check tests.
9. Wallet, Pi, payouts: disabled until genuine compliant payment provider, fraud controls, financial compliance and platform policy review. Never represent demo purchases as real.
10. Play listing: AAB, versionCode greater than all previously published versions, signed bundle, privacy policy URL, data safety, content rating, screenshots, icon, reviewer credentials where needed, closed testing eligibility.

## Current findings
- app.config.js uses Android versionCode 3; a newer Play submission must use a unique, higher value, but do not change blindly before checking Play Console.
- package.json uses Expo ~53.0.0 / React Native 0.79.2. This does not establish Android API 36 compatibility.
- RTC integration is guarded by EXPO_PUBLIC_ENABLE_LIVEKIT_MEDIA, currently false by default.
- Video PK is a UI preview with zero score and share-only invitation; it is NOT a real PK connection.
- Purchases and payouts are explicitly disabled.
- Existing EAS production profile generates an AAB; do not trigger it before release gates pass.
- Firebase Cloud Functions deployment is not established for the Spark plan. Server-side media/gift/payment functionality requires independently verified backend infrastructure.

## Validation procedure (without building Android)
- Run npm ci, npm run test:ci, npm run test:firestore:emulator in a trusted CI environment with dependencies.
- Run node scripts/check-play-readiness.cjs. It must FAIL while release gates are incomplete.
- Verify all production endpoints, permissions, App Check, error handling, moderation and account deletion.
- Confirm real-device testing and Play Console eligibility before the one final Android build.
- Do not delete existing app data, cloud services, or branches as part of cleanup without verified migrations and backups.

This document is a technical audit and plan, not proof that all stages have been completed.
