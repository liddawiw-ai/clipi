# Clipi voice phase 1

The app currently has a royal 8-seat audio-room UI. This change adds an isolated LiveKit transport and a Firebase callable token endpoint without activating unsafe fake voice controls.

## Before real voice works

1. Create a LiveKit project, configure LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET **only in the backend**.
2. Install compatible `@livekit/react-native`, `@livekit/react-native-webrtc`, `livekit-client` in the Expo app; configure the native Expo plugins and iOS microphone permission, then build a **development build**. Expo Snack/Expo Go cannot run this native WebRTC transport.
3. Deploy `issueVoiceToken` from `functions/voiceToken.js` through your existing Firebase Functions index and install `livekit-server-sdk` server-side.
4. Connect `connectVoiceRoom` to the Room component lifecycle after the development build is available.
5. Implement a server-authoritative seat lease / publish permission system before turning on microphone publishing. This endpoint intentionally issues **listen-only** tokens until that security step is complete.
6. Test two real devices: join, leave, reconnect, host close, permission denial, and background/foreground.

This is a **foundation**, not a claim that live audio is already functional. Do not expose the LiveKit secret in the app.
