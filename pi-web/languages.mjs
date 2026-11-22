const keys = ['intro','wait','pi','emailLogin','email','password','signIn','create','back','privacy','terms','change','error'];
const rows = {
  ar: ['العربية','غرف صوتية وبث مباشر|جارٍ تسجيل الدخول…|الدخول بحساب Pi|الدخول بالبريد الإلكتروني|البريد الإلكتروني|كلمة المرور|دخول|إنشاء حساب|رجوع إلى حساب Pi|سياسة الخصوصية|شروط الخدمة|تغيير اللغة|تعذّر تسجيل الدخول. حاول مجددًا.'],
  en: ['English','Voice rooms and live streams|Signing in…|Sign in with Pi|Sign in with email|Email address|Password|Sign in|Create account|Back to Pi sign-in|Privacy Policy|Terms of Service|Change language|Could not sign in. Please try again.'],
  es: ['Español','Salas de voz y transmisiones en vivo|Iniciando sesión…|Iniciar sesión con Pi|Iniciar sesión con correo|Correo electrónico|Contraseña|Entrar|Crear cuenta|Volver al acceso con Pi|Política de privacidad|Términos del servicio|Cambiar idioma|No se pudo iniciar sesión. Inténtalo de nuevo.'],
  fr: ['Français','Salons vocaux et diffusions en direct|Connexion…|Se connecter avec Pi|Se connecter par e-mail|Adresse e-mail|Mot de passe|Se connecter|Créer un compte|Revenir à la connexion Pi|Politique de confidentialité|Conditions d’utilisation|Changer de langue|Connexion impossible. Réessayez.'],
  de: ['Deutsch','Sprachräume und Livestreams|Anmeldung läuft…|Mit Pi anmelden|Mit E-Mail anmelden|E-Mail-Adresse|Passwort|Anmelden|Konto erstellen|Zurück zur Pi-Anmeldung|Datenschutzrichtlinie|Nutzungsbedingungen|Sprache ändern|Anmeldung fehlgeschlagen. Bitte erneut versuchen.'],
  pt: ['Português','Salas de voz e transmissões ao vivo|A entrar…|Entrar com Pi|Entrar com e-mail|E-mail|Senha|Entrar|Criar conta|Voltar ao acesso com Pi|Política de privacidade|Termos de serviço|Alterar idioma|Não foi possível entrar. Tente novamente.'],
  it: ['Italiano','Stanze vocali e dirette|Accesso in corso…|Accedi con Pi|Accedi via email|Indirizzo email|Password|Accedi|Crea account|Torna all’accesso con Pi|Informativa sulla privacy|Termini di servizio|Cambia lingua|Accesso non riuscito. Riprova.'],
  tr: ['Türkçe','Sesli odalar ve canlı yayınlar|Giriş yapılıyor…|Pi ile giriş yap|E-postayla giriş yap|E-posta|Şifre|Giriş yap|Hesap oluştur|Pi girişine dön|Gizlilik politikası|Hizmet şartları|Dili değiştir|Giriş yapılamadı. Tekrar deneyin.'],
  ru: ['Русский','Голосовые комнаты и прямые эфиры|Выполняется вход…|Войти через Pi|Войти по почте|Электронная почта|Пароль|Войти|Создать аккаунт|Назад ко входу через Pi|Политика конфиденциальности|Условия использования|Изменить язык|Не удалось войти. Попробуйте ещё раз.'],
  uk: ['Українська','Голосові кімнати та прямі ефіри|Виконується вхід…|Увійти через Pi|Увійти за поштою|Електронна пошта|Пароль|Увійти|Створити акаунт|Назад до входу через Pi|Політика конфіденційності|Умови користування|Змінити мову|Не вдалося увійти. Спробуйте ще раз.'],
  pl: ['Polski','Pokoje głosowe i transmisje na żywo|Logowanie…|Zaloguj się przez Pi|Zaloguj się e-mailem|Adres e-mail|Hasło|Zaloguj się|Utwórz konto|Wróć do logowania Pi|Polityka prywatności|Warunki korzystania|Zmień język|Nie udało się zalogować. Spróbuj ponownie.'],
  nl: ['Nederlands','Spraakruimtes en livestreams|Bezig met aanmelden…|Inloggen met Pi|Inloggen met e-mail|E-mailadres|Wachtwoord|Inloggen|Account maken|Terug naar Pi-inlog|Privacybeleid|Servicevoorwaarden|Taal wijzigen|Inloggen mislukt. Probeer het opnieuw.'],
  fa: ['فارسی','اتاق‌های صوتی و پخش زنده|در حال ورود…|ورود با Pi|ورود با ایمیل|ایمیل|گذرواژه|ورود|ساخت حساب|بازگشت به ورود با Pi|سیاست حریم خصوصی|شرایط استفاده|تغییر زبان|ورود ناموفق بود. دوباره تلاش کنید.'],
  ur: ['اردو','آڈیو روم اور براہ راست نشریات|سائن اِن ہو رہا ہے…|Pi کے ساتھ سائن اِن کریں|ای میل سے سائن اِن کریں|ای میل|پاس ورڈ|سائن اِن|اکاؤنٹ بنائیں|Pi سائن اِن پر واپس جائیں|رازداری کی پالیسی|سروس کی شرائط|زبان بدلیں|سائن اِن نہیں ہو سکا۔ دوبارہ کوشش کریں۔'],
  he: ['עברית','חדרי קול ושידורים חיים|מתבצעת התחברות…|כניסה עם Pi|כניסה בדוא״ל|כתובת דוא״ל|סיסמה|כניסה|יצירת חשבון|חזרה לכניסה עם Pi|מדיניות פרטיות|תנאי שימוש|שינוי שפה|הכניסה נכשלה. נסו שוב.'],
  hi: ['हिन्दी','वॉइस रूम और लाइव स्ट्रीम|साइन इन हो रहा है…|Pi से साइन इन करें|ईमेल से साइन इन करें|ईमेल पता|पासवर्ड|साइन इन करें|खाता बनाएँ|Pi साइन इन पर लौटें|गोपनीयता नीति|सेवा की शर्तें|भाषा बदलें|साइन इन नहीं हुआ। फिर कोशिश करें।'],
  bn: ['বাংলা','ভয়েস রুম ও লাইভ স্ট্রিম|সাইন ইন হচ্ছে…|Pi দিয়ে সাইন ইন করুন|ইমেইল দিয়ে সাইন ইন করুন|ইমেইল ঠিকানা|পাসওয়ার্ড|সাইন ইন|অ্যাকাউন্ট তৈরি করুন|Pi সাইন ইনে ফিরুন|গোপনীয়তা নীতি|সেবার শর্তাবলি|ভাষা বদলান|সাইন ইন করা যায়নি। আবার চেষ্টা করুন।'],
  ta: ['தமிழ்','குரல் அறைகள் மற்றும் நேரலை|உள்நுழைகிறது…|Pi மூலம் உள்நுழை|மின்னஞ்சல் மூலம் உள்நுழை|மின்னஞ்சல்|கடவுச்சொல்|உள்நுழை|கணக்கை உருவாக்கு|Pi உள்நுழைவுக்குத் திரும்பு|தனியுரிமைக் கொள்கை|சேவை விதிமுறைகள்|மொழியை மாற்று|உள்நுழைய முடியவில்லை. மீண்டும் முயலவும்.'],
  id: ['Bahasa Indonesia','Ruang suara dan siaran langsung|Sedang masuk…|Masuk dengan Pi|Masuk dengan email|Alamat email|Kata sandi|Masuk|Buat akun|Kembali ke login Pi|Kebijakan Privasi|Ketentuan Layanan|Ganti bahasa|Tidak bisa masuk. Coba lagi.'],
  ms: ['Bahasa Melayu','Bilik suara dan siaran langsung|Sedang log masuk…|Log masuk dengan Pi|Log masuk dengan e-mel|Alamat e-mel|Kata laluan|Log masuk|Cipta akaun|Kembali ke log masuk Pi|Dasar Privasi|Terma Perkhidmatan|Tukar bahasa|Tidak dapat log masuk. Cuba lagi.'],
  fil: ['Filipino','Mga voice room at live stream|Nagsa-sign in…|Mag-sign in gamit ang Pi|Mag-sign in gamit ang email|Email address|Password|Mag-sign in|Gumawa ng account|Bumalik sa Pi sign-in|Patakaran sa Privacy|Mga Tuntunin ng Serbisyo|Palitan ang wika|Hindi makapag-sign in. Subukan muli.'],
  vi: ['Tiếng Việt','Phòng thoại và phát trực tiếp|Đang đăng nhập…|Đăng nhập bằng Pi|Đăng nhập bằng email|Địa chỉ email|Mật khẩu|Đăng nhập|Tạo tài khoản|Quay lại đăng nhập bằng Pi|Chính sách quyền riêng tư|Điều khoản dịch vụ|Đổi ngôn ngữ|Không thể đăng nhập. Vui lòng thử lại.'],
  th: ['ไทย','ห้องเสียงและไลฟ์สด|กำลังเข้าสู่ระบบ…|เข้าสู่ระบบด้วย Pi|เข้าสู่ระบบด้วยอีเมล|อีเมล|รหัสผ่าน|เข้าสู่ระบบ|สร้างบัญชี|กลับไปเข้าสู่ระบบด้วย Pi|นโยบายความเป็นส่วนตัว|ข้อกำหนดการให้บริการ|เปลี่ยนภาษา|เข้าสู่ระบบไม่ได้ โปรดลองอีกครั้ง'],
  'zh-Hans': ['简体中文','语音房间与直播|正在登录…|使用 Pi 登录|使用邮箱登录|电子邮箱|密码|登录|创建账号|返回 Pi 登录|隐私政策|服务条款|切换语言|无法登录，请重试。'],
  'zh-Hant': ['繁體中文','語音聊天室與直播|登入中…|使用 Pi 登入|使用電子郵件登入|電子郵件|密碼|登入|建立帳號|返回 Pi 登入|隱私權政策|服務條款|切換語言|無法登入，請再試一次。'],
  ja: ['日本語','ボイスルームとライブ配信|ログイン中…|Pi でログイン|メールでログイン|メールアドレス|パスワード|ログイン|アカウントを作成|Pi ログインに戻る|プライバシーポリシー|利用規約|言語を変更|ログインできませんでした。もう一度お試しください。'],
  ko: ['한국어','음성 채팅방 및 라이브 방송|로그인 중…|Pi로 로그인|이메일로 로그인|이메일 주소|비밀번호|로그인|계정 만들기|Pi 로그인으로 돌아가기|개인정보 처리방침|서비스 이용약관|언어 변경|로그인할 수 없습니다. 다시 시도해 주세요.'],
  sw: ['Kiswahili','Vyumba vya sauti na matangazo ya moja kwa moja|Inaingia…|Ingia kwa Pi|Ingia kwa barua pepe|Barua pepe|Nenosiri|Ingia|Fungua akaunti|Rudi kwenye kuingia kwa Pi|Sera ya Faragha|Masharti ya Huduma|Badili lugha|Imeshindwa kuingia. Jaribu tena.'],
  el: ['Ελληνικά','Φωνητικά δωμάτια και ζωντανές μεταδόσεις|Σύνδεση…|Σύνδεση με Pi|Σύνδεση με email|Διεύθυνση email|Κωδικός πρόσβασης|Σύνδεση|Δημιουργία λογαριασμού|Επιστροφή στη σύνδεση Pi|Πολιτική απορρήτου|Όροι χρήσης|Αλλαγή γλώσσας|Η σύνδεση απέτυχε. Δοκιμάστε ξανά.'],
  ro: ['Română','Camere vocale și transmisiuni live|Conectare…|Conectare cu Pi|Conectare prin e-mail|Adresă de e-mail|Parolă|Conectare|Creează cont|Înapoi la conectarea cu Pi|Politica de confidențialitate|Condiții de utilizare|Schimbă limba|Conectarea a eșuat. Încearcă din nou.']
};

const rtl = new Set(['ar', 'fa', 'ur', 'he']);
export const languages = Object.fromEntries(Object.entries(rows).map(([code, [name, text]]) => [
  code, {name, direction:rtl.has(code) ? 'rtl' : 'ltr', ...Object.fromEntries(text.split('|').map((value, i) => [keys[i], value]))}
]));
export const localeStorageKey = 'clipi.language.v2';

export function readLocale(storage) {
  try {
    const saved = storage().getItem(localeStorageKey);
    return Object.hasOwn(languages, saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveLocale(storage, code) {
  if (!Object.hasOwn(languages, code)) return;
  try { storage().setItem(localeStorageKey, code); } catch {}
}
