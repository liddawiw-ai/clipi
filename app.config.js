// Native Facebook plugin configuration must match the values visible to App.js.
const fbId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
const fbToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN;
const plugins = [
  '@livekit/react-native-expo-plugin',
  '@config-plugins/react-native-webrtc',
  '@react-native-firebase/app',
  '@react-native-firebase/auth',
  ['expo-local-authentication', {faceIDPermission: 'السماح لـ Clipi باستخدام Face ID لفتح محفظة النقاط والأرباح بأمان'}],
  '@react-native-google-signin/google-signin',
  ['expo-camera', {
    cameraPermission: 'السماح لـ Clipi باستخدام الكاميرا للبث المباشر',
    microphonePermission: 'السماح لـ Clipi باستخدام الميكروفون في البث المباشر'
  }],
  ['expo-build-properties', {ios: {useFrameworks: 'static'}}]
];
if (fbId && fbToken) {
  plugins.push(['react-native-fbsdk-next', {
    appID: fbId,
    clientToken: fbToken,
    displayName: 'Clipi',
    scheme: `fb${fbId}`,
    advertiserIDCollectionEnabled: false,
    autoLogAppEventsEnabled: false,
    isAutoInitEnabled: true
  }]);
}
module.exports = {
  expo: {
    name: 'Clipi', slug: 'clipi2', version: '1.1.0',
    orientation: 'portrait', scheme: 'clipi',
    userInterfaceStyle: 'automatic', newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {ITSAppUsesNonExemptEncryption: false},
      bundleIdentifier: 'com.walid.clipi',
      buildNumber: '1',
      googleServicesFile: './GoogleService-Info.plist'
    },
    android: {
      package: 'com.walid.clipi',
      versionCode: 5,
      googleServicesFile: './google-services.json',
      permissions: ['CAMERA', 'RECORD_AUDIO']
    },
    extra: {eas: {projectId:'8b7b92e2-ebd2-48a4-a617-16b83bc83449'}},
    plugins
  }
};