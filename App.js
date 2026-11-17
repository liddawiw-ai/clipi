
import React, { useState, useEffect, useRef } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
  Share,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

const FOODS = [
  { icon: '🥕', name: 'جزر', multi: 5 },
  { icon: '🦐', name: 'جمبري', multi: 10 },
  { icon: '🥦', name: 'بروكلي', multi: 5 },
  { icon: '🥩', name: 'لحم', multi: 15 },
  { icon: '🥬', name: 'خضار ورقية', multi: 5 },
  { icon: '🍗', name: 'ستيك', multi: 25 },
  { icon: '🌽', name: 'ذرة', multi: 5 },
  { icon: '🐟', name: 'سمك', multi: 45 }
];

const COUNTRIES = [
  ['🇯🇴 الأردن', '+962'],
  ['🇸🇦 السعودية', '+966'],
  ['🇦🇪 الإمارات', '+971'],
  ['🇪🇬 مصر', '+20'],
  ['🇱🇧 لبنان', '+961'],
  ['🇸🇾 سوريا', '+963'],
  ['🇮🇶 العراق', '+964'],
  ['🇵🇸 فلسطين', '+970']
];

const AMOUNTS = [10, 100, 500, 1000, 10000];

const PACKAGES = [
  { diamonds: 100, price: '0.99' },
  { diamonds: 500, price: '4.99' },
  { diamonds: 1200, price: '9.99' },
  { diamonds: 6500, price: '49.99' },
  { diamonds: 14000, price: '99.99' }
];

const GIFTS = [
  { icon: '🌹', name: 'وردة', cost: 10 },
  { icon: '❤️', name: 'قلب', cost: 50 },
  { icon: '🎂', name: 'كيكة', cost: 100 },
  { icon: '💍', name: 'خاتم', cost: 500 },
  { icon: '🚗', name: 'سيارة', cost: 1000 },
  { icon: '👑', name: 'تاج', cost: 5000 }
];

const WHEEL_SIZE = 296;
const SLOT_SIZE = 70;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = 104;

const WHEEL_POS = FOODS.map((_, i) => {
  const angle = (i * 45 - 90) * Math.PI / 180;

  return {
    left: CENTER + Math.cos(angle) * RADIUS - SLOT_SIZE / 2,
    top: CENTER + Math.sin(angle) * RADIUS - SLOT_SIZE / 2
  };
});

function Btn({
  title,
  onPress,
  color = '#ff3267',
  disabled = false
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: disabled ? '#777' : color }
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

function Header({ title, back, diamonds, openStore }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={back}>
        <Text style={styles.headerBack}>❮ رجوع</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>{title}</Text>

      <TouchableOpacity onPress={openStore}>
        <Text style={styles.balance}>💎 {diamonds}</Text>
      </TouchableOpacity>
    </View>
  );
}

function BottomNav({ navigate }) {
  return (
    <View style={styles.nav}>
      <TouchableOpacity onPress={() => navigate('home')}>
        <Text style={styles.navText}>🏠 الرئيسية</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigate('games')}>
        <Text style={styles.navText}>🎮 الألعاب</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigate('store')}>
        <Text style={styles.navText}>💎 المتجر</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigate('profile')}>
        <Text style={styles.navText}>👤 حسابي</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [name, setName] = useState('Walid');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(0);
  const [showCountries, setShowCountries] = useState(false);
  const [diamonds, setDiamonds] = useState(5010);
  const [liveTitle, setLiveTitle] = useState('My Live');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [bets, setBets] = useState({});
  const [selectedBet, setSelectedBet] = useState(10);
  const [seconds, setSeconds] = useState(30);
  const [phase, setPhase] = useState('betting');
  const [highlight, setHighlight] = useState(-1);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastGift, setLastGift] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [loginMethod, setLoginMethod] = useState('phone');
  const [confirmation, setConfirmation] = useState(null);
  const [smsCode, setSmsCode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const betsRef = useRef({});
  const balanceRef = useRef(5010);
  const phaseRef = useRef('betting');
  const screenRef = useRef('login');
  const spinTimer = useRef(null);
  const resultTimer = useRef(null);
  const locked = useRef(false);
  const spinFunction = useRef(null);

  const navigate = next => {
    screenRef.current = next;
    setScreen(next);
  };

  const setGamePhase = next => {
    phaseRef.current = next;
    setPhase(next);
  };

  const updateBalance = next => {
    balanceRef.current = next;
    setDiamonds(next);
  };

  const clearGameTimers = () => {
    if (spinTimer.current) clearTimeout(spinTimer.current);
    if (resultTimer.current) clearTimeout(resultTimer.current);

    spinTimer.current = null;
    resultTimer.current = null;
  };

  const resetGame = () => {
    clearGameTimers();
    betsRef.current = {};
    locked.current = false;
    setBets({});
    setSeconds(30);
    setHighlight(-1);
    setResult(null);
    setGamePhase('betting');
  };

  const openGame = () => {
    resetGame();
    navigate('game');
  };

  const leaveGame = () => {
    if (phaseRef.current === 'spinning') {
      Alert.alert('انتظر', 'الجولة قيد التشغيل');
      return;
    }

    resetGame();
    navigate('games');
  };

  const placeBet = index => {
    if (phaseRef.current !== 'betting') return;

    const current = betsRef.current;

    const count = Object.keys(current).filter(
      key => current[key] > 0
    ).length;

    if (!current[index] && count >= 6) {
      Alert.alert('تنبيه', 'الحد الأقصى 6 خانات');
      return;
    }

    if (balanceRef.current < selectedBet) {
      Alert.alert('رصيد غير كافٍ', 'راجع متجر الماسات');
      return;
    }

    const next = {
      ...current,
      [index]: (current[index] || 0) + selectedBet
    };

    betsRef.current = next;
    setBets(next);
    updateBalance(balanceRef.current - selectedBet);
  };

  const finishRound = (winner, roundBets) => {
    const item = FOODS[winner];
    const stake = roundBets[winner] || 0;
    const payout = stake * item.multi;

    updateBalance(balanceRef.current + payout);
    setHighlight(winner);

    setResult({
      icon: item.icon,
      name: item.name,
      payout
    });

    setHistory(old => [
      {
        icon: item.icon,
        name: item.name,
        payout,
        time: new Date().toLocaleTimeString()
      },
      ...old
    ].slice(0, 15));

    setGamePhase('result');

    resultTimer.current = setTimeout(() => {
      betsRef.current = {};
      setBets({});
      setHighlight(-1);
      setResult(null);
      setSeconds(30);
      locked.current = false;
      setGamePhase('betting');
    }, 3000);
  };

  const startSpin = () => {
    if (phaseRef.current !== 'betting' || locked.current) {
      return;
    }

    const roundBets = { ...betsRef.current };

    locked.current = true;
    setGamePhase('spinning');
    setResult(null);

    // تدور العجلة حتى لو لم يضع اللاعب رهاناً.
    // لا توجد رسالة تطلب وضع رهان أولاً.
    const winner = Math.floor(Math.random() * FOODS.length);
    const totalSteps = 40 + winner;
    let step = 0;

    const advance = () => {
      if (screenRef.current !== 'game') return;

      if (step >= totalSteps) {
        spinTimer.current = null;
        finishRound(winner, roundBets);
        return;
      }

      setHighlight(step % FOODS.length);
      step += 1;

      const delay =
        step > 35 ? 290 :
        step > 27 ? 190 :
        step > 18 ? 120 : 70;

      spinTimer.current = setTimeout(advance, delay);
    };

    advance();
  };

  spinFunction.current = startSpin;

  useEffect(() => {
    if (screen !== 'game' || phase !== 'betting') return;

    const interval = setInterval(() => {
      setSeconds(previous => {
        if (previous <= 1) {
          setTimeout(() => {
            if (
              screenRef.current === 'game' &&
              phaseRef.current === 'betting'
            ) {
              spinFunction.current();
            }
          }, 0);

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, phase]);

  useEffect(() => {
    return () => clearGameTimers();
  }, []);

  // Firebase Auth is the only authority for login. A local phone number is not proof of identity.
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async user => {
      if (!user) {
        setAuthReady(true);
        navigate('login');
        return;
      }
      try {
        const profile = await firestore().collection('users').doc(user.uid).get();
        if (profile.exists && profile.data()?.name) setName(profile.data().name);
        setLoginMethod('phone');
        navigate('home');
      } catch (error) {
        Alert.alert('تعذر تحميل الحساب', 'تحقق من اتصال الإنترنت وإعدادات Firestore.');
        await auth().signOut();
      } finally {
        setAuthReady(true);
      }
    });
    return unsubscribe;
  }, []);

  const normalizedPhone = () => {
    const digits = phone.replace(/\\D/g, '');
    const prefix = COUNTRIES[country][1];
    const countryDigits = prefix.replace('+', '');
    return '+' + (digits.startsWith(countryDigits)
      ? digits
      : countryDigits + digits.replace(/^0+/, ''));
  };

  const login = async () => {
    if (!name.trim() || name.trim().length > 60) {
      Alert.alert('تنبيه', 'أدخل اسماً من 1 إلى 60 حرفاً');
      return;
    }
    if (phone.replace(/\\D/g, '').length < 7) {
      Alert.alert('تنبيه', 'أدخل رقم هاتف صحيح');
      return;
    }
    if (!accepted) {
      Alert.alert('الشروط', 'وافق على الشروط والأحكام');
      return;
    }
    setAuthBusy(true);
    try {
      const pending = await auth().signInWithPhoneNumber(normalizedPhone());
      setConfirmation(pending);
      setSmsCode('');
    } catch (error) {
      Alert.alert('تعذر إرسال الرمز', error?.message || 'تحقق من إعدادات Firebase ورقم الهاتف');
    } finally {
      setAuthBusy(false);
    }
  };

  const verifySms = async () => {
    if (!confirmation || !/^\\d{6}$/.test(smsCode.trim()) || authBusy) return;
    setAuthBusy(true);
    try {
      const credential = await confirmation.confirm(smsCode.trim());
      const user = credential.user;
      const ref = firestore().collection('users').doc(user.uid);
      // Transaction prevents overwriting a previously created user profile.
      await firestore().runTransaction(async tx => {
        const existing = await tx.get(ref);
        if (!existing.exists) {
          tx.set(ref, {
            name: name.trim(),
            createdAt: firestore.FieldValue.serverTimestamp()
          });
        }
      });
      const profile = await ref.get();
      if (profile.exists && profile.data()?.name) setName(profile.data().name);
      setConfirmation(null);
      setSmsCode('');
      setLoginMethod('phone');
      navigate('home');
    } catch (error) {
      Alert.alert('فشل التحقق', error?.message || 'تحقق من رمز الرسالة وحاول مجدداً');
    } finally {
      setAuthBusy(false);
    }
  };

  const socialLogin = provider => {
    Alert.alert(
      'تسجيل الدخول عبر ' + provider,
      'الزر موجود، لكن تسجيل الدخول الحقيقي يحتاج إعداد OAuth وربط التطبيق بحساب مطور ' + provider + '.'
    );
  };

  const sendComment = () => {
    if (!comment.trim()) return;

    setComments(old => [
      ...old,
      { user: name, text: comment.trim() }
    ].slice(-100));

    setComment('');
  };

  const sendGift = gift => {
    if (balanceRef.current < gift.cost) {
      Alert.alert('رصيد غير كافٍ', 'لا تملك ماسات كافية');
      return;
    }

    updateBalance(balanceRef.current - gift.cost);
    setLastGift(gift);

    Alert.alert(
      'تم إرسال هدية تجريبية',
      gift.icon + ' ' + gift.name
    );
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: 'تطبيق Clipi'
      });
    } catch (error) {
      Alert.alert('خطأ', 'تعذرت المشاركة');
    }
  };

  const showUnavailable = service => {
    Alert.alert(
      service,
      'الواجهة موجودة، لكن الخدمة تحتاج ربط خادم حقيقي.'
    );
  };

  const headerProps = {
    diamonds,
    openStore: () => navigate('store')
  };

  if (!authReady) {
    return <View style={[styles.page, { justifyContent: 'center', alignItems: 'center' }]}><Text style={styles.white}>جاري التحقق من الجلسة...</Text></View>;
  }

  if (screen === 'login') {
    return (
      <View style={styles.page}>
        <StatusBar barStyle="light-content" />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.loginContent}>
            <Text style={styles.bigLogo}>Clipi</Text>

            <Text style={styles.subtitle}>
              عالم البث المباشر والألعاب
            </Text>

            <Text style={styles.label}>اسم المستخدم</Text>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="اسم المستخدم"
              placeholderTextColor="#888"
            />

            <Text style={styles.label}>الدولة</Text>

            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCountries(!showCountries)}
            >
              <Text style={styles.inputText}>
                {COUNTRIES[country][0]} {COUNTRIES[country][1]} ▾
              </Text>
            </TouchableOpacity>

            {showCountries && COUNTRIES.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.countryRow}
                onPress={() => {
                  setCountry(index);
                  setShowCountries(false);
                }}
              >
                <Text style={styles.white}>
                  {item[0]} {item[1]}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.label}>رقم الهاتف</Text>

            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="أدخل رقم الهاتف"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={styles.agreeRow}
              onPress={() => setAccepted(!accepted)}
            >
              <Text style={styles.white}>
                {accepted ? '☑' : '☐'} أوافق على الشروط والأحكام
              </Text>
            </TouchableOpacity>

            <Btn
              title="عرض الشروط والأحكام"
              color="#472174"
              onPress={() => navigate('terms')}
            />

            {confirmation ? (
              <>
                <Text style={styles.label}>رمز التحقق المرسل عبر SMS</Text>
                <TextInput
                  style={styles.input}
                  value={smsCode}
                  onChangeText={setSmsCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="رمز من 6 أرقام"
                  placeholderTextColor="#888"
                />
                <Btn title={authBusy ? 'جاري التحقق...' : 'تأكيد الرمز'}
                  disabled={authBusy || !/^\\d{6}$/.test(smsCode.trim())}
                  onPress={verifySms} />
                <Btn title="تغيير رقم الهاتف" color="#472174"
                  disabled={authBusy}
                  onPress={() => { setConfirmation(null); setSmsCode(''); }} />
              </>
            ) : (
              <Btn title={authBusy ? 'جاري إرسال الرمز...' : 'إرسال رمز التحقق'}
                disabled={authBusy} onPress={login} />
            )}

            <Text style={styles.orText}>
              ───────── أو سجل باستخدام ─────────
            </Text>

            <Btn
              title="🌐 المتابعة باستخدام Google"
              color="#4285F4"
              onPress={() => socialLogin('Google')}
            />

            <Btn
              title="📘 المتابعة باستخدام Facebook"
              color="#1877F2"
              onPress={() => socialLogin('Facebook')}
            />

            <Text style={styles.note}>
              تسجيل الهاتف يتطلب رسالة SMS حقيقية وتطبيق Expo Development Build. جوجل وفيسبوك غير مفعّلين.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  if (screen === 'terms') {
    return (
      <View style={styles.page}>
        <Header
          title="الشروط والأحكام"
          back={() => navigate('login')}
          {...headerProps}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>
            شروط استخدام Clipi - النسخة التجريبية
          </Text>

          <Text style={styles.terms}>
            1. هذا التطبيق نسخة تجريبية غير مخصصة للمعاملات المالية.
            {'\n\n'}
            2. الماسات افتراضية ولا يمكن استبدالها بأموال.
            {'\n\n'}
            3. لعبة Greedy Star تستخدم نتائج عشوائية تجريبية، ولا تتضمن مراهنات مالية حقيقية.
            {'\n\n'}
            4. يمنع استخدام التطبيق للإساءة أو المضايقة أو نشر محتوى مخالف.
            {'\n\n'}
            5. البث المباشر وتسجيل الدخول الاجتماعي والدفع الحقيقي يحتاجون إلى تكاملات وخوادم خارجية.
            {'\n\n'}
            6. يجب إعداد سياسة خصوصية وشروط قانونية مناسبة قبل النشر التجاري.
          </Text>

          <Btn
            title="أوافق على الشروط"
            onPress={() => {
              setAccepted(true);
              navigate('login');
            }}
          />
        </ScrollView>
      </View>
    );
  }

  if (screen === 'game') {
    const total = Object.values(bets).reduce(
      (sum, value) => sum + value, 0
    );

    return (
      <View style={styles.gamePage}>
        <StatusBar barStyle="light-content" />

        <Header
          title="Greedy Star"
          back={leaveGame}
          {...headerProps}
        />

        <ScrollView contentContainerStyle={styles.gameContent}>
          <Text style={styles.gameHeading}>
            ⭐ GREEDY STAR ⭐
          </Text>

          <Text style={styles.gameHint}>
            {phase === 'betting'
              ? 'وقت الرهان: ' + seconds + ' ثانية'
              : phase === 'spinning'
                ? 'العجلة تدور...'
                : 'نتيجة الجولة'}
          </Text>

          <View style={styles.wheel}>
            <View style={styles.wheelPointer}>
              <Text style={styles.pointerText}>▼</Text>
            </View>

            {FOODS.map((item, index) => (
              <TouchableOpacity
                key={index}
                disabled={phase !== 'betting'}
                onPress={() => placeBet(index)}
                style={[
                  styles.food,
                  WHEEL_POS[index],
                  highlight === index && styles.foodActive
                ]}
              >
                <Text style={styles.foodIcon}>
                  {item.icon}
                </Text>

                <Text style={styles.foodName}>
                  {item.name}
                </Text>

                <Text style={styles.foodMulti}>
                  ×{item.multi}
                </Text>

                {bets[index] > 0 && (
                  <Text style={styles.foodBet}>
                    💎{bets[index]}
                  </Text>
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.wheelCenter}>
              <Text style={styles.centerStar}>⭐</Text>

              <Text style={styles.centerText}>
                {phase === 'betting'
                  ? seconds
                  : phase === 'spinning'
                    ? '...'
                    : 'WIN'}
              </Text>
            </View>
          </View>

          {result && (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>
                {result.icon} {result.name}
              </Text>

              <Text style={styles.resultMoney}>
                {result.payout > 0
                  ? 'ربحت ' + result.payout + ' 💎'
                  : 'لم تربح هذه الجولة'}
              </Text>
            </View>
          )}

          <View style={styles.betPanel}>
            <Text style={styles.panelTitle}>
              اختر قيمة الرهان
            </Text>

            <View style={styles.amountRow}>
              {AMOUNTS.map(amount => (
                <TouchableOpacity
                  key={amount}
                  disabled={phase !== 'betting'}
                  onPress={() => setSelectedBet(amount)}
                  style={[
                    styles.amount,
                    selectedBet === amount && styles.amountActive
                  ]}
                >
                  <Text style={styles.amountText}>
                    {amount}
                  </Text>

                  <Text style={styles.small}>💎</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.stats}>
              <Text style={styles.stat}>
                الرهان: {total}
              </Text>

              <Text style={styles.stat}>
                الرصيد: {diamonds}
              </Text>
            </View>

            <Btn
              title={
                phase === 'betting'
                  ? 'ابدأ الجولة'
                  : phase === 'spinning'
                    ? 'جاري الدوران...'
                    : 'انتظر الجولة التالية'
              }
              color="#087e42"
              disabled={phase !== 'betting'}
              onPress={startSpin}
            />

            <Text style={styles.note}>
              جميع الرهانات والجوائز افتراضية للتجربة.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            آخر النتائج
          </Text>

          {history.length === 0 ? (
            <Text style={styles.muted}>
              لا توجد نتائج بعد
            </Text>
          ) : history.map((item, index) => (
            <View key={index} style={styles.historyRow}>
              <Text style={styles.white}>
                {item.icon} {item.name}
              </Text>

              <Text style={styles.gold}>
                {item.payout} 💎
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (screen === 'games') {
    return (
      <View style={styles.page}>
        <Header
          title="الألعاب"
          back={() => navigate('home')}
          {...headerProps}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.gameCard}>
            <Text style={styles.cardEmoji}>🎰</Text>

            <Text style={styles.cardTitle}>
              Greedy Star
            </Text>

            <Text style={styles.muted}>
              عجلة الحظ - 8 خانات - مضاعفات مختلفة
            </Text>

            <Btn
              title="العب الآن"
              onPress={openGame}
            />
          </View>
        </ScrollView>

        <BottomNav navigate={navigate} />
      </View>
    );
  }

  if (screen === 'store') {
    return (
      <View style={styles.page}>
        <Header
          title="متجر الماسات"
          back={() => navigate('home')}
          {...headerProps}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>
            💎 رصيدك: {diamonds}
          </Text>

          <Text style={styles.muted}>
            الأسعار للعرض فقط. الدفع الحقيقي غير مفعّل.
          </Text>

          {PACKAGES.map((pack, index) => (
            <View key={index} style={styles.storeCard}>
              <View>
                <Text style={styles.gold}>
                  💎 {pack.diamonds.toLocaleString()}
                </Text>

                <Text style={styles.muted}>
                  ${pack.price} USD
                </Text>
              </View>

              <TouchableOpacity
                style={styles.buyButton}
                onPress={() => Alert.alert(
                  'متجر تجريبي',
                  'يجب ربط مزود دفع معتمد قبل تفعيل الشراء.'
                )}
              >
                <Text style={styles.white}>
                  شراء
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              🪙 الدفع بعملة Pi
            </Text>

            <Text style={styles.muted}>
              الدفع بعملة Pi غير متصل حالياً، ولا يوجد سعر مباشر للعملة في هذه النسخة.
            </Text>
          </View>
        </ScrollView>

        <BottomNav navigate={navigate} />
      </View>
    );
  }

  if (screen === 'gifts') {
    return (
      <View style={styles.page}>
        <Header
          title="الهدايا"
          back={() => navigate('home')}
          {...headerProps}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>
            🎁 إرسال هدية تجريبية
          </Text>

          {GIFTS.map((gift, index) => (
            <View key={index} style={styles.giftRow}>
              <Text style={styles.giftEmoji}>
                {gift.icon}
              </Text>

              <View style={{ flex: 1 }}>
                <Text style={styles.white}>
                  {gift.name}
                </Text>

                <Text style={styles.gold}>
                  💎 {gift.cost}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.buyButton}
                onPress={() => sendGift(gift)}
              >
                <Text style={styles.white}>
                  إرسال
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {lastGift && (
            <View style={styles.resultBox}>
              <Text style={styles.cardEmoji}>
                {lastGift.icon}
              </Text>

              <Text style={styles.white}>
                آخر هدية: {lastGift.name}
              </Text>
            </View>
          )}
        </ScrollView>

        <BottomNav navigate={navigate} />
      </View>
    );
  }

  if (screen === 'profile') {
    return (
      <View style={styles.page}>
        <Header
          title="حسابي"
          back={() => navigate('home')}
          {...headerProps}
        />

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.avatar}>👤</Text>

          <Text style={styles.label}>
            اسم المستخدم
          </Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>
            عنوان البث
          </Text>

          <TextInput
            style={styles.input}
            value={liveTitle}
            onChangeText={setLiveTitle}
          />

          <Text style={styles.label}>
            رصيد الماسات
          </Text>

          <Text style={styles.gold}>
            💎 {diamonds}
          </Text>

          <Text style={styles.label}>
            طريقة الدخول
          </Text>

          <Text style={styles.white}>
            {loginMethod === 'phone'
              ? 'الهاتف - تجريبي'
              : loginMethod}
          </Text>

          <Btn
            title="حفظ التغييرات"
            onPress={async () => {
              try {
                const user = auth().currentUser;
                if (!user) throw new Error('يجب تسجيل الدخول');
                const nextName = name.trim();
                if (!nextName || nextName.length > 60) throw new Error('اسم غير صالح');
                await firestore().collection('users').doc(user.uid).update({ name: nextName });
                Alert.alert('تم', 'حُفظ الاسم في Firestore');
              } catch (error) { Alert.alert('فشل الحفظ', error.message); }
            }}
          />

          <Btn
            title="متجر الماسات"
            color="#7032be"
            onPress={() => navigate('store')}
          />

          <Btn
            title="تسجيل الخروج"
            color="#555"
            onPress={async () => { await auth().signOut(); setConfirmation(null); navigate('login'); }}
          />
        </ScrollView>

        <BottomNav navigate={navigate} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <StatusBar barStyle="light-content" />

      <View style={styles.homeHeader}>
        <Text style={styles.homeLogo}>
          Clipi
        </Text>

        <Text style={styles.headerTitle}>
          الرئيسية
        </Text>

        <TouchableOpacity onPress={() => navigate('store')}>
          <Text style={styles.balance}>
            💎 {diamonds}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            أهلاً {name} 👋
          </Text>

          <Text style={styles.white}>
            مرحباً بك في عالم Clipi
          </Text>

          <Btn
            title="🎮 ادخل الألعاب"
            color="#7024bf"
            onPress={() => navigate('games')}
          />
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quick}
            onPress={() => navigate('games')}
          >
            <Text style={styles.quickEmoji}>🎰</Text>
            <Text style={styles.white}>الألعاب</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quick}
            onPress={() => showUnavailable('البث المباشر')}
          >
            <Text style={styles.quickEmoji}>📹</Text>
            <Text style={styles.white}>لايف</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quick}
            onPress={() => showUnavailable('الغرف الصوتية')}
          >
            <Text style={styles.quickEmoji}>🎤</Text>
            <Text style={styles.white}>صوتي</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quick}
            onPress={() => navigate('gifts')}
          >
            <Text style={styles.quickEmoji}>🎁</Text>
            <Text style={styles.white}>الهدايا</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quick}
            onPress={() => navigate('store')}
          >
            <Text style={styles.quickEmoji}>💎</Text>
            <Text style={styles.white}>المتجر</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quick}
            onPress={shareApp}
          >
            <Text style={styles.quickEmoji}>📤</Text>
            <Text style={styles.white}>مشاركة</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          🔴 الغرف المباشرة
        </Text>

        <View style={styles.card}>
          <Text style={styles.muted}>
            لا توجد غرف بث متصلة حالياً
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          💬 التعليقات
        </Text>

        <View style={styles.card}>
          {comments.map((item, index) => (
            <Text key={index} style={styles.comment}>
              <Text style={styles.gold}>
                {item.user}:
              </Text>
              {' '}{item.text}
            </Text>
          ))}

          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="اكتب تعليقاً"
            placeholderTextColor="#888"
          />

          <Btn
            title="إرسال التعليق"
            onPress={sendComment}
          />
        </View>

        <Text style={styles.note}>
          هذه نسخة تجريبية. البيانات لا تُحفظ على خادم.
        </Text>
      </ScrollView>

      <BottomNav navigate={navigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#14052c'
  },
  gamePage: {
    flex: 1,
    backgroundColor: '#8b431e'
  },
  loginContent: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 45
  },
  content: {
    padding: 15,
    paddingBottom: 40
  },
  bigLogo: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center'
  },
  subtitle: {
    color: '#cbb6e9',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 25
  },
  label: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8
  },
  input: {
    backgroundColor: '#fff',
    color: '#111',
    padding: 14,
    borderRadius: 12,
    marginBottom: 9
  },
  inputText: {
    color: '#111',
    fontSize: 15
  },
  countryRow: {
    backgroundColor: '#392060',
    padding: 12,
    borderRadius: 7,
    marginBottom: 3
  },
  agreeRow: {
    padding: 14,
    alignItems: 'center'
  },
  button: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 11
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  note: {
    color: '#ddd',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 15
  },
  orText: {
    color: '#d2c6df',
    textAlign: 'center',
    marginTop: 22,
    marginBottom: 8
  },
  white: {
    color: '#fff',
    fontWeight: '600'
  },
  muted: {
    color: '#c8bdd4',
    marginVertical: 7
  },
  gold: {
    color: '#ffdc57',
    fontWeight: 'bold',
    fontSize: 16
  },
  header: {
    backgroundColor: '#260c49',
    paddingTop: 46,
    paddingBottom: 15,
    paddingHorizontal: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  homeHeader: {
    backgroundColor: '#260c49',
    paddingTop: 46,
    paddingBottom: 15,
    paddingHorizontal: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  homeLogo: {
    color: '#fff',
    fontSize: 23,
    fontWeight: '900'
  },
  headerBack: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  balance: {
    color: '#ffdc57',
    fontWeight: 'bold',
    fontSize: 14
  },
  banner: {
    backgroundColor: '#ec326a',
    borderRadius: 18,
    padding: 20,
    marginBottom: 15
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 9
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  quick: {
    flex: 1,
    backgroundColor: '#35165b',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 17,
    marginHorizontal: 3
  },
  quickEmoji: {
    fontSize: 28,
    marginBottom: 7
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 19,
    marginBottom: 11
  },
  card: {
    backgroundColor: '#291349',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12
  },
  nav: {
    backgroundColor: '#260c49',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15
  },
  navText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11
  },
  comment: {
    color: '#fff',
    marginBottom: 9
  },
  avatar: {
    fontSize: 70,
    textAlign: 'center',
    marginVertical: 20
  },
  gameCard: {
    backgroundColor: '#291349',
    borderRadius: 20,
    padding: 23,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffcf54'
  },
  cardEmoji: {
    fontSize: 54
  },
  cardTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12
  },
  storeCard: {
    backgroundColor: '#291349',
    borderRadius: 13,
    padding: 17,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  buyButton: {
    backgroundColor: '#ff3267',
    borderRadius: 9,
    paddingHorizontal: 20,
    paddingVertical: 11
  },
  giftRow: {
    backgroundColor: '#291349',
    borderRadius: 13,
    padding: 15,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center'
  },
  giftEmoji: {
    fontSize: 35,
    marginRight: 16
  },
  terms: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 27
  },
  gameContent: {
    padding: 12,
    alignItems: 'center',
    paddingBottom: 40
  },
  gameHeading: {
    color: '#ffdf64',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 12
  },
  gameHint: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 14
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    backgroundColor: '#b96a23',
    borderRadius: WHEEL_SIZE / 2,
    borderWidth: 8,
    borderColor: '#ffdc57',
    position: 'relative',
    marginBottom: 20
  },
  wheelPointer: {
    position: 'absolute',
    top: -26,
    left: 123,
    zIndex: 12
  },
  pointerText: {
    color: '#ffed43',
    fontSize: 28,
    fontWeight: 'bold'
  },
  food: {
    position: 'absolute',
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
    backgroundColor: '#ffbd50',
    borderWidth: 3,
    borderColor: '#fff1ac',
    alignItems: 'center',
    justifyContent: 'center'
  },
  foodActive: {
    backgroundColor: '#6feb83',
    borderColor: '#00ff77',
    borderWidth: 5
  },
  foodIcon: {
    fontSize: 23
  },
  foodName: {
    color: '#6c2d0b',
    fontSize: 9,
    fontWeight: 'bold'
  },
  foodMulti: {
    color: '#9b2b0c',
    fontSize: 12,
    fontWeight: '900'
  },
  foodBet: {
    position: 'absolute',
    top: -9,
    backgroundColor: '#220747',
    color: '#fff',
    fontSize: 10,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 5
  },
  wheelCenter: {
    position: 'absolute',
    top: 97,
    left: 97,
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#09a34e',
    borderWidth: 5,
    borderColor: '#ffdc45',
    alignItems: 'center',
    justifyContent: 'center'
  },
  centerStar: {
    fontSize: 24
  },
  centerText: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900'
  },
  betPanel: {
    width: '100%',
    backgroundColor: '#743317',
    borderRadius: 14,
    padding: 12
  },
  panelTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 12
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  amount: {
    flex: 1,
    backgroundColor: '#ffdf9e',
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d99836',
    alignItems: 'center',
    paddingVertical: 9,
    marginHorizontal: 2
  },
  amountActive: {
    backgroundColor: '#fff',
    borderColor: '#00d26b'
  },
  amountText: {
    color: '#683111',
    fontSize: 11,
    fontWeight: 'bold'
  },
  small: {
    fontSize: 11
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 14
  },
  stat: {
    color: '#ffdf79',
    fontWeight: 'bold'
  },
  resultBox: {
    width: '100%',
    backgroundColor: '#08713d',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 15
  },
  resultTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  resultMoney: {
    color: '#ffe54d',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 7
  },
  historyRow: {
    width: '100%',
    backgroundColor: '#693017',
    padding: 13,
    borderRadius: 10,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});
