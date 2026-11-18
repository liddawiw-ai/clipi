# Clipi — المرحلة الحادية عشرة: Google وFacebook Login

## التعديلات المكتملة في الكود
- Google Sign-In وFacebook Login مرتبطان بمسار Firebase Authentication في `App.js`.
- منع الضغط المتكرر أثناء محاولة الدخول، وإظهار الخطأ للمستخدم.
- نجاح Firebase Authentication لم يعد يُعرض كفشل لمجرد تعذر مزامنة الملف الشخصي في Firestore.
- يستخدم `app.config.js` و`App.js` أسماء `EXPO_PUBLIC_FACEBOOK_APP_ID` و`EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN` نفسها.

## إعدادات الحسابات التي لا يمكن إكمالها من GitHub وحده
1. Firebase Authentication > Sign-in method: تفعيل Google وFacebook.
2. Google Cloud/Firebase: Web OAuth client ID الصحيح، وبصمات SHA-1/SHA-256 لتوقيع Android، وضبط إعداد iOS.
3. Meta Developers: App ID وClient Token وإعداد Facebook Login وربط عنوان إعادة التوجيه الذي يعرضه Firebase، وإدخال App Secret **في Firebase فقط** لا في GitHub.
4. EAS environment: ضبط `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` و`EXPO_PUBLIC_FACEBOOK_APP_ID` و`EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN`. المتغيرات العامة ليست مكانًا للأسرار.
5. بعد تفعيل المزودين، إنشاء بناء أصلي جديد لأن إضافات التكوين لا تُضاف إلى APK قديم.
6. اختبار Google وFacebook على Android وiOS بحسابات اختبار مسموحة في Meta، واختبار إلغاء الدخول وفشل الشبكة وإعادة فتح التطبيق.

## تنبيه iOS
يجب التحقق من مسار Facebook Limited Login وnonce مقابل إصدارات Firebase SDK وMeta SDK الفعلية قبل الإطلاق. لا يمكن الجزم بنجاحه من مراجعة المصدر فقط.

**الحالة:** تحسينات الكود محفوظة، لكن تفعيل المزودين في لوحات التحكم واختبارات الأجهزة لم يكتمل.
