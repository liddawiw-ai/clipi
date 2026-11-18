#!/usr/bin/env node
const fs=require('fs'),assert=require('assert');
const source=fs.readFileSync('App.js','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8'));
const eas=JSON.parse(fs.readFileSync('eas.json','utf8'));
assert(source.includes("collection('rooms')")&&source.includes("collection('messages')"), 'Shared rooms/messages missing');
assert(source.includes('isHost')&&source.includes('حذف الرسالة'), 'Host moderation missing');
assert(source.includes('closeMyRoom'), 'Close room action missing');
assert(!source.includes('setRole('), 'Unsecured fake moderator role toggle remains');
assert(source.includes('SHOW_UNRELEASED_DEMOS=__DEV__'), 'Unreleased demos are not hidden');
assert(rules.includes("resource.data.status == 'open'"), 'Closed room protections missing');
assert(rules.includes('reporterUid == request.auth.uid'), 'Report identity constraint missing');
assert(pkg.dependencies['@react-native-firebase/auth']&&pkg.dependencies['@react-native-firebase/firestore']);
assert(pkg.main==='node_modules/expo/AppEntry.js', 'Expo entry must call registerRootComponent; direct App.js main causes launch crash');
assert(/export default function App\s*\(/.test(source), 'Expo AppEntry needs App.js default component export');
assert(eas.build.preview.android.buildType==='apk');
assert(eas.build.production.android.buildType==='app-bundle', 'Play Store production requires AAB');
const configured=require('../app.config.js').expo;
assert(configured.android.versionCode===3, 'Android versionCode must be incremented for new release');
assert(configured.ios.buildNumber==='1', 'iOS buildNumber must be explicit');
assert(configured.android.package===configured.ios.bundleIdentifier, 'App identifiers must match the intended package');
assert(source.includes('blockedUsers.map(uid=>')&&source.includes('unblockUser'), 'Blocked-user management missing');
assert(source.includes('roomSearch')&&source.includes('blockedUsers.includes(r.ownerUid)'), 'Room discovery safety missing');
assert(source.includes('FACEBOOK_CONFIGURED')&&source.includes('busy||!FACEBOOK_CONFIGURED'), 'Disabled OAuth guard missing');
assert(source.includes('isHost&&cameraOn&&cameraPermission?.granted'), 'Viewer camera guard missing');
assert(source.includes('displayName,avatar,updatedAt:'), 'Profile avatar save missing');
assert(!source.includes('roomPass')&&!source.includes('joinPass')&&!source.includes("page==='password'"), 'Unsupported password-room UI remains');
assert(source.includes('الغرفة عامة للمستخدمين المسجلين'), 'Public-room disclosure missing');
assert(source.includes('const sendingRef=useRef(false)'), 'Synchronous message send guard missing');
assert(source.includes('sendingRef.current=true')&&source.includes('sendingRef.current=false'), 'Duplicate message send locking missing');
assert(source.includes("setMessage(current=>current.trim()===text?'':current)"), 'Chat draft race protection missing');
assert(source.includes('maxLength={500}'), 'Chat composer length guard missing');
assert(source.includes(String.raw`!/^\d{6}$/.test(smsCode.trim())`), 'SMS code validation missing');
assert(source.includes('auth().currentUser?.uid!==u.uid'), 'Session-switch safety missing');
assert(source.includes("displayName.length>35"), 'Profile name length validation missing');
assert(source.includes("setRooms([]);setRoomError('')"), 'Room-list stale error reset missing');

// Stage 15: prevent regressions in wallet authentication and financial safety.
const walletScreen=fs.readFileSync('EarningsWalletScreen.js','utf8');
const backend=fs.readFileSync('functions/index.js','utf8');
const legacyStore=fs.readFileSync('components/Store.js','utf8');
assert(walletScreen.includes('LocalAuthentication.authenticateAsync('),'Wallet biometric authentication missing');
assert(walletScreen.includes('requestEpochRef.current+=1'),'Wallet stale-request protection missing');
assert(walletScreen.includes("state==='background'"),'Wallet background lock missing');
assert(backend.includes(String.raw`/^\d{6}$/`),'Server PIN must accept exactly six numeric digits');
assert(!backend.includes(String.raw`/^\\d{6}$/`),'Server PIN incorrectly matches literal backslash');
assert(backend.includes('PIN_MAX_FAILURES=5')&&backend.includes('PIN_LOCK_MS='),'PIN lockout missing');
assert(backend.includes('minConversionPoints:2000')&&backend.includes('POINTS_MIN=2000'),'Wallet minimum must be 2000 points');
assert(backend.includes('REAL_PAYOUTS_ENABLED=false'),'Real cash payouts must remain disabled');
assert(!source.includes("'الطاووس الملكي',30000,'peacock'"),'Unrequested peacock gift must be removed');
assert(source.includes("const GIFT_CATEGORIES=")&&source.includes("giftCategory==='الكل'"),'Gift bag category filtering missing');
assert(source.includes("giftQuantity,setGiftQuantity")&&source.includes("[1,7,17,37,77]"),'Gift bag quantity selector missing');
assert(source.includes('const GIFTS='),'Gift catalog missing');
assert(source.includes('مركبة فضائية')&&source.includes('رولز رويس الماسية')&&source.includes('وردة حمراء'),'Reference-inspired gift groups missing');
assert(source.includes("kind==='dragon'")&&source.includes("['plane','helicopter','spaceship','space']"),'Distinct gift animations missing');

assert(source.includes('kind===\'dragon\'')&&source.includes('const beams=Array.from({length:12}'),'Existing gifts must retain animations and full-screen lighting');
assert(source.includes('setMinimized(true)')&&source.includes('setMinimized(false)'),'Room minimize/restore controls missing');
assert(!legacyStore.includes('setDiamonds('),'Legacy store must not mint diamonds from the client');
assert(legacyStore.includes('الشراء غير مفعّل'),'Legacy store must clearly mark purchases disabled');

assert(source.includes('const hostSettings=<Modal')&&source.includes('hostSettingsOpen&&isHost'),'Host-only settings sheet missing');
assert(source.includes("update({status:'closed'})")&&source.includes('confirmCloseHostedRoom'),'Host room closure must update Firestore');
assert(source.includes('setMinimized(true)')&&source.includes('setCameraFacing'),'Host settings controls missing');
assert(source.includes('const exitHandledRef=useRef(false)')&&source.includes('function exitRoomOnce()'),'Room exit must be idempotent');
assert(source.includes('✕ مغادرة الغرفة')&&source.includes('✕ خروج'),'Leaving must not be labeled as closing for everyone');
assert(source.includes('إغلاق الغرفة للجميع')&&source.includes("update({status:'closed'})"),'Only confirmed host closure may close shared room');

// The display catalog is larger than the server-authorized gift catalog.
// Never mistake a client-side preview for a funded transaction.
const clientCatalog=source.match(/const GIFTS=(\[[^;]+\]);/);
const serverCatalog=backend.match(/const GIFT_PRICES=Object\.freeze\((\{[^;]+\})\);/);
assert(clientCatalog&&serverCatalog,'Gift catalogs missing');
const giftEntries=JSON.parse(clientCatalog[1]);
const serverGiftIds=Object.keys(new Function('return ('+serverCatalog[1]+')')());
const unsupportedGiftIds=[...new Set(giftEntries.map(g=>g[3]))].filter(id=>!serverGiftIds.includes(id));
assert(source.includes('SHOW_UNRELEASED_DEMOS=__DEV__'),'Unsupported gift previews must remain hidden from release builds');
assert(source.includes('onSendGift([gift[0],gift[1],gift[2]*giftQuantity,gift[3]],room)'),
 'Gift send preview changed; audit payment ledger and server receipt before release');
console.warn('AUDIT: '+giftEntries.length+' UI gifts; '+unsupportedGiftIds.length+' distinct effect IDs unsupported by server. Gifts remain preview-only.');
assert(source.includes('closingByHostRef.current=true')&&source.includes('if(closingByHostRef.current){exitRoomOnce();return;}'),'Host must not receive remote-closure alert for own action');
assert(source.includes('if(exitHandledRef.current)return;')&&source.includes('function exitRoomOnce()'),'Closed-room listener must suppress duplicate alerts');
assert(source.includes("if(roomClosedRef.current)return Alert.alert('الغرفة مغلقة'"),'Gift sending must reject closed rooms');
assert(source.includes('Self-gifts never mint cash-eligible earnings or support points'),'Self-gift safety disclosure missing');
assert(source.includes("if(!Number.isSafeInteger(cost)||cost<=0)return null;"),'Preview wallet must reject invalid spending amounts');
assert(source.includes("if(![next.welcome,next.purchased,next.owner].every"),'Preview wallet must reject corrupted balances');
assert(source.includes("if(!Number.isSafeInteger(gift[2]*giftQuantity)||giftQuantity<1)"),'Gift total must be a safe integer');
const sendStart=source.indexOf('function send(gift)');
const sendLuck=source.indexOf("if(gift[4]==='الحظ')",sendStart);
assert(sendStart>=0&&sendLuck>sendStart,'Luck gifts must remain a development preview');
assert(!source.slice(sendStart,sendLuck).includes("if(isHost)return"),'Host should be able to gift own room in preview');
assert(source.includes('selfGift:(room.ownerUid||room.owner)===user?.uid,eligibleSupportPoints:0'),'Self-gifts must be marked as ineligible for support points');
console.log('Clipi release guards passed (static assertions only).');