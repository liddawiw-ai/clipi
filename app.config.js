// Native Facebook plugin configuration must match the values visible to App.js.
const fbId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
const fbToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN;
const androidPackage = 'com.walid.clipi';
const firebase = require('./google-services.json');
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
  firebase.client.find(client => client.client_info.android_client_info.package_name === androidPackage)
    ?.oauth_client?.find(client => client.client_type === 3)?.client_id || '';
const googleIosScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
const plugins = [
  '@livekit/react-native-expo-plugin',
  '@config-plugins/react-native-webrtc',
  '@react-native-firebase/app',
  '@react-native-firebase/auth',
  '@react-native-firebase/app-check',
  ['expo-local-authentication', {faceIDPermission: 'السماح لـ Clipi باستخدام Face ID لفتح محفظة النقاط والأرباح بأمان'}],
  googleIosScheme ? ['@react-native-google-signin/google-signin', {iosUrlScheme: googleIosScheme}] : '@react-native-google-signin/google-signin',
  ['expo-image-picker', {photosPermission: 'السماح لكليبي باختيار صورة الحساب أو خلفية الغرفة'}],
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
    orientation: 'portrait', scheme: 'clipi', icon: './assets/clipi-icon.png',
    userInterfaceStyle: 'light', newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {ITSAppUsesNonExemptEncryption: false},
      bundleIdentifier: 'com.walid.clipi',
      buildNumber: '1',
      googleServicesFile: './GoogleService-Info.plist'
    },
    android: {
      package: androidPackage,
      versionCode: 40,
      googleServicesFile: './google-services.json',
      permissions: ['CAMERA', 'RECORD_AUDIO']
    },
    extra: {internalIosCheckout: ['development','preview'].includes(process.env.EAS_BUILD_PROFILE) || process.env.CLIPI_DISTRIBUTION === 'internal', directCheckout: process.env.EAS_BUILD_PROFILE !== 'production' && process.env.CLIPI_DISTRIBUTION !== 'store', googleWebClientId, eas: {projectId:'8b7b92e2-ebd2-48a4-a617-16b83bc83449'}},
    plugins
  }
};