// Native Firebase phone authentication for Clipi.
// Requires an Expo development build with @react-native-firebase/app and /auth,
// plus the platform Firebase configuration files. Not supported in Expo Go.
import auth from '@react-native-firebase/auth';

export function normalizePhone(countryCode, localNumber) {
  const digits = String(localNumber || '').replace(/\D/g, '');
  const prefix = String(countryCode || '').replace(/\D/g, '');
  if (!prefix || digits.length < 7 || digits.length > 15) {
    throw new Error('أدخل رقم هاتف صحيحاً مع رمز الدولة');
  }
  const national = digits.startsWith(prefix) ? digits.slice(prefix.length) : digits.replace(/^0+/, '');
  const e164 = '+' + prefix + national;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    throw new Error('صيغة رقم الهاتف غير صحيحة');
  }
  return e164;
}

export async function requestPhoneCode(e164Phone) {
  if (!/^\+[1-9]\d{7,14}$/.test(e164Phone)) {
    throw new Error('رقم الهاتف يجب أن يكون بالصيغة الدولية');
  }
  // Firebase sends a real SMS and returns a confirmation object.
  return auth().signInWithPhoneNumber(e164Phone);
}

export async function confirmPhoneCode(confirmation, code) {
  if (!confirmation || typeof confirmation.confirm !== 'function') {
    throw new Error('اطلب رمز تحقق جديداً');
  }
  if (!/^\d{6}$/.test(String(code || '').trim())) {
    throw new Error('أدخل رمز التحقق المكون من 6 أرقام');
  }
  const credential = await confirmation.confirm(String(code).trim());
  if (!credential?.user?.uid) throw new Error('تعذر تأكيد تسجيل الدخول');
  return credential.user;
}

export function onAuthStateChanged(callback) {
  return auth().onAuthStateChanged(callback);
}

export async function signOut() {
  return auth().signOut();
}
