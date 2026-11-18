# Clipi — المرحلة السابعة: تجهيز نسخ الاختبار والتثبيت

تاريخ المراجعة: 2026-11-18.

## تقرير البناءين اللذين بدأا في المرحلة السادسة

- **Android EAS preview**: `37fc0f67-9d6d-4708-a9d3-c02bdcf7de8b` — **ERRORED**؛ لم يُنشأ APK.
- **iOS EAS preview**: `ff882dc3-c666-443a-9923-d65c08229cc5` — **ERRORED**؛ لم يُنشأ IPA.
- بُنيا من النسخة `0dac32d29e4410c4329079e3720c34403f294103`، وتم استهلاك الحد المصرح به لبناءين.
- السبب المؤكد من السجلين: `universal-analytics@0.5.4` متطلب عبر `firebase-tools` ويتطلب Node >= 22، بينما Expo نفّذ `yarn install` باستخدام Node `20.19.2`.

## الإصلاح المُضاف في فرع stage7

- أزيل `firebase-tools` من `package.json` الخاص ببناء التطبيق، وأصبح تشغيل محاكي القواعد يستدعي CLI خارجيًا عند الاختبار عبر `npx --yes firebase-tools@14.2.1`.
- الملف `.github/workflows/clipi-stage7-node20.yml` يختبر تثبيت حزم التطبيق بـ **Node 20.19.2 + Yarn Classic**، بنفس شرط البيئة الذي فشل داخل Expo.
- الفحص الآخر `.github/workflows/clipi-static-check.yml` يشغّل اختبارات JSX والتكوين ومحاكي Firestore على فرع الإصلاح.
- **لم نبدأ بناء EAS جديدًا أو ننشر التطبيق على متاجر Apple أو Google.** لا تعتبر الإصلاح صالحًا حتى يُظهر فحص Node20 نجاح تثبيت المكتبات.

## سياسة قبول ملفات البناء

1. نجاح اختبار Node20 ونجاح فحوص Firebase في GitHub.
2. عند توفر ميزانية بناء جديدة بعد موافقة صاحب المشروع، بناء Android APK وiOS بإصدار **متطابق من Git** من الفرع المختبر فقط.
3. تحقق من `gitCommitHash` و`platform` و`status=FINISHED` و`distribution=INTERNAL` وامتداد ملف البناء.
4. لا توزّع أبدًا APK سابقًا باعتباره كود المرحلة السادسة؛ ملف APK القديم من إصدار مختلف.
5. اختبر تثبيت APK على Android بحساب Firebase تجريبي، ثم iOS بعد التوقيع المناسب.
6. اختبار iOS الداخلي يتطلب توقيعًا يسمح للجهاز بالتثبيت (EAS ad hoc وأجهزة مُسجَّلة أو توزيع TestFlight بعد إعداد حساب Apple). نجاح البناء وحده لا يمنح iPhone حق التثبيت.
7. اختبر تسجيل SMS والغرف والرسائل على هاتفين، ثم اختبر إغلاق الغرفة، حذف رسالة، الإبلاغ، وتسجيل الخروج.
8. النجاح البرمجي أو نجاح البناء لا يعني إطلاقًا عامًّا، ولا يعني تفعيل RTC أو المدفوعات.

## روابط التحقق

- بناء Android السابق: https://expo.dev/accounts/walidliddawi98s-team/projects/clipi2/builds/37fc0f67-9d6d-4708-a9d3-c02bdcf7de8b
- بناء iOS السابق: https://expo.dev/accounts/walidliddawi98s-team/projects/clipi2/builds/ff882dc3-c666-443a-9923-d65c08229cc5
- فرع الإصلاح: https://github.com/liddawiw-ai/clipi/tree/feature/clipi-stage7-build-fix

**مهم:** لا تُنسخ بيانات اعتماد EAS أو Firebase الخاصة إلى GitHub أو الملفات النصية أو تقارير الاختبار.
