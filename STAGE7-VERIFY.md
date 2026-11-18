# Clipi — فحص المرحلة السابعة (Android وiOS)

## ما تم في المستودع
- `app.config.js`: Android `versionCode: 3` وiOS `buildNumber: '1'` مع المعرّف `com.walid.clipi`.
- `package.json`: نقطة دخول Expo هي `node_modules/expo/AppEntry.js` لتسجيل المكوّن الرئيسي.
- `eas.json`: ملف `preview` ينتج APK للتثبيت، و`production` ينتج AAB للمتجر.
- `scripts/check-syntax.cjs` و`scripts/check-release.cjs`: فحوص صريحة لأرقام البناء وملفات التعريف.

## ما لم يتم إثباته بعد
- نجاح تشغيل APK الحالي على هاتف Android. بناء EAS ناجح لا يثبت خلو وقت التشغيل من الانهيارات.
- السبب الدقيق لإغلاق النسخة السابقة بعد شاشة البداية. يحتاج `adb logcat` أو Crashlytics بعد إعدادها.
- صلاحية توقيع iOS وملف provisioning، وتثبيت iPhone الحقيقي.
- نجاح CI بعد التعديلات الحالية (يجب مراجعة نتيجة GitHub Actions).

## خطوات اختبار Android عند توفر حصة بناء
1. شغّل `npm run test:ci` ثم `npm run check`، وأصلح أي إخفاق قبل البناء.
2. أنشئ `preview` APK من أحدث commit على الفرع `feature/clipi-stage7-build-fix`.
3. احفظ بيانات النسخة القديمة؛ عند ظهور تعارض توقيع لا تحذفها دون نسخة احتياطية.
4. جرّب فتح التطبيق بعد التثبيت. إن أغلق، اجمع السجلات بواسطة `adb logcat -c`، ثم افتح التطبيق، ثم `adb logcat -d -v time > clipi-startup.log`.
5. راجع `FATAL EXCEPTION` و`ReactNativeJS` و`AndroidRuntime`، مع إخفاء أرقام الهواتف والرموز والمعلومات الشخصية قبل مشاركة السجل.
6. اختبر SMS والغرف والدردشة والحظر بعد نجاح بدء التشغيل.

## خطوات iOS
1. سجّل جهاز الاختبار وأكمل Apple Developer signing / provisioning من EAS.
2. تحقق من `GoogleService-Info.plist` وbundle ID.
3. ابنِ نسخة iOS داخلية واختبرها على الجهاز، ثم راجع سجلات الإغلاق إن حدثت.

**الحالة:** إعدادات واختبارات ثابتة محدثة في GitHub. لا يوجد إثبات نجاح التشغيل على الجهاز بعد.
