import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal } from 'react-native';

export default function App() {
  const [name, setName] = useState('وليد');
  const [title, setTitle] = useState('بث اليوم');
  const [diamonds, setDiamonds] = useState(5000);
  const [houseBank, setHouseBank] = useState(1000000);
  const [showStore, setShowStore] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [showPiModal, setShowPiModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);

  // اللعبة بتبدا فاضية
  const [bets, setBets] = useState({});
  const [activeItem, setActiveItem] = useState(null);
  const [lastResult, setLastResult] = useState('');

  // المؤقت 10 ثواني
  const [timeLeft, setTimeLeft] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const betsRef = useRef({});
  const diamondsRef = useRef(5000);
  betsRef.current = bets;
  diamondsRef.current = diamonds;

  const wheelItems = [
    { id: 'veg1', label: '🥦', name: 'خضار 1', mult: 5 },
    { id: 'veg2', label: '🥕', name: 'خضار 2', mult: 5 },
    { id: 'veg3', label: '🌽', name: 'خضار 3', mult: 5 },
    { id: 'veg4', label: '🍆', name: 'خضار 4', mult: 5 },
    { id: 'shrimp', label: '🦐', name: 'جمبري', mult: 10 },
    { id: 'meat', label: '🥩', name: 'لحمة', mult: 15 },
    { id: 'steak', label: '🍖', name: 'ستيك', mult: 25 },
    { id: 'fish', label: '🐟', name: 'سمك', mult: 45 },
  ];

  const packs = [
    { id: 1, dollarDiamonds: 1000, piDiamonds: 1200, priceDollar: 1 },
    { id: 2, dollarDiamonds: 5500, piDiamonds: 6600, priceDollar: 5 },
    { id: 3, dollarDiamonds: 12000, piDiamonds: 14400, priceDollar: 10 },
  ];

  const goLive = () => { Alert.alert('Go Live', 'رح تنشئ غرفتك العامة الخاصة فيك.'); };
  const voiceChat = () => { Alert.alert('Voice Chat', 'رح تنشئ غرفة صوتية عامة خاصة فيك.'); };

  const buyWithDollar = (pack) => {
    Alert.alert('الدفع عبر 【entity-Google Play¦canonical_name=Google Play】', `سيتم خصم ${pack.priceDollar}$ وستحصل على ${pack.dollarDiamonds} ماسة فورا`, [
      { text: 'إلغاء' },
      { text: 'تأكيد', onPress: () => { setDiamonds(diamonds + pack.dollarDiamonds); Alert.alert('تم!', `حصلت على ${pack.dollarDiamonds} ماسة`); } }
    ]);
  };

  const openPiModal = (pack) => { setSelectedPack(pack); setShowPiModal(true); };
  const confirmPiPayment = () => { setShowPiModal(false); Alert.alert('Pi Browser', 'اذا كنت داخل Pi Browser ومحفظتك موثقة، سيتم فتح المحفظة للدفع. اذا ما عندك محفظة موثقة، ادفع بالدولار هلأ وخلص فورا.'); };

  const betCount = Object.keys(bets).filter(k => bets[k] > 0).length;
  const totalCost = Object.values(bets).reduce((a, b) => a + b, 0);

  const selectItem = (label) => {
    if (isSpinning) return;
    if (!bets[label] && betCount >= 6) {
      Alert.alert('خلصت الستة', 'عبّيت الستة اللي اخترتهم. الغي واحد عشان تقدر تراهن على صنف جديد.');
      return;
    }
    setActiveItem(label);
  };

  const addBet = (amount) => {
    if (isSpinning) return;
    if (!activeItem) { Alert.alert('اختار صنف اول', 'اكبس على صنف اول، بعدين اكبس على زر المراهنة.'); return; }
    if (!bets[activeItem] && betCount >= 6) { Alert.alert('خلصت الستة', 'عبّيت الستة.'); return; }
    const newBets = { ...bets };
    newBets[activeItem] = (newBets[activeItem] || 0) + amount;
    setBets(newBets);
  };

  const clearItem = (label) => {
    if (isSpinning) return;
    const newBets = { ...bets };
    delete newBets[label];
    setBets(newBets);
    if (activeItem === label) setActiveItem(null);
  };
  const clearAll = () => { if (isSpinning) return; setBets({}); setActiveItem(null); };

  // ===== الكود بيجيب ربح بيناسب ميزانية الصندوق =====
  const spinWheel = () => {
    const currentBets = betsRef.current;
    const currentCount = Object.keys(currentBets).filter(k => currentBets[k] > 0).length;
    const currentTotal = Object.values(currentBets).reduce((a, b) => a + b, 0);
    const currentDiamonds = diamondsRef.current;

    if (currentCount === 0) {
      setLastResult('خلص الوقت - ما راهنت على اشي، راحت الدورة فاضية');
      Alert.alert('خلص الوقت ⏰', 'ما راهنت على اشي هاي الدورة. بلشت دورة جديدة، عندك 10 ثواني.');
      setBets({}); setActiveItem(null); setTimeLeft(10); setIsSpinning(false);
      return;
    }
    if (currentDiamonds < currentTotal) {
      Alert.alert('ما عندك ماسات كفاية', `مجموع مراهناتك ${currentTotal} ماسة. رصيدك ${currentDiamonds} ماسة.`);
      setTimeLeft(10); setIsSpinning(false);
      return;
    }
    setIsSpinning(true);

    // 1. الصندوق = مجموع مراهنات هاي الدورة
    const pool = currentTotal;
    // 2. ربح المشروع 15% اول
    const houseFee = Math.floor(pool * 0.15);
    // 3. بيضل 85% للجوائز
    const prizePool = pool - houseFee;
    // 4. اكبر ربح مسموح = 80% من صندوق الجوائز
    const maxWin = Math.floor(prizePool * 0.8);
    const afterBet = currentDiamonds - currentTotal;

    // 5. اوزان العجلة بتتغير على حسب الصندوق
    // الصندوق صغير = سمك وستيك وزنهم 0، ممنوعين
    // الصندوق وسط = سمك وزنه 3، نادر
    // الصندوق كبير = سمك وزنه 8، بيطلع اكثر
    let fishWeight = 3;
    let steakWeight = 4;
    let meatWeight = 5;
    if (pool < 56000) { fishWeight = 0; }
    if (pool < 28000) { steakWeight = 0; }
    if (pool > 200000) { fishWeight = 8; steakWeight = 7; meatWeight = 7; }

    const allSpecs = [
      { label: '🥦', name: 'خضار 1', mult: 5, weight: 18 },
      { label: '🥕', name: 'خضار 2', mult: 5, weight: 18 },
      { label: '🌽', name: 'خضار 3', mult: 5, weight: 18 },
      { label: '🍆', name: 'خضار 4', mult: 5, weight: 18 },
      { label: '🦐', name: 'جمبري', mult: 10, weight: 8 },
      { label: '🥩', name: 'لحمة', mult: 15, weight: meatWeight },
      { label: '🍖', name: 'ستيك', mult: 25, weight: steakWeight },
      { label: '🐟', name: 'سمك', mult: 45, weight: fishWeight },
      { label: '⬜', name: 'فاضي', mult: 0, weight: 8 },
    ];

    // 6. الاختيار التلقائي: الكود بيجيب بس الربح اللي بيناسب الصندوق
    // اذا ربح الصنف اكبر من maxWin، الكود بيشيله تلقائي وبيحط بداله فاضي
    // مثال: الصندوق 10000، maxWin = 6800، سمك 45000 ممنوع، خضار 5000 مسموح
    const allowed = [];
    allSpecs.forEach(spec => {
      if (spec.name === 'فاضي') { allowed.push(spec); return; }
      if (spec.weight === 0) {
        // وزن صفر يعني الصندوق ما بيتحمله، حط بداله فاضي
        allowed.push({ label: '⬜', name: 'فاضي', mult: 0, weight: 8 });
        return;
      }
      const betOnThis = currentBets[spec.label] || 0;
      if (betOnThis === 0) { allowed.push(spec); return; } // ما حدا راهن عليه، خليه موجود عشان يطلع خسارة
      const theoreticalWin = betOnThis * spec.mult;
      if (theoreticalWin <= maxWin) {
        allowed.push(spec); // الصندوق بيتحمله، مسموح
      } else {
        // الصندوق ما بيتحمله، الكود بيشيله تلقائي
        allowed.push({ label: '⬜', name: 'فاضي', mult: 0, weight: spec.weight });
      }
    });

    // 7. بناء عجلة 100 خانة متداخلة من الاصناف المسموحة بس
    const wheel100 = [];
    allowed.forEach(spec => {
      for (let i = 0; i < spec.weight; i++) wheel100.push(spec);
    });
    // خلط متداخل عشان ما يطلعوا كتل ورا بعض
    for (let i = wheel100.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wheel100[i], wheel100[j]] = [wheel100[j], wheel100[i]];
    }
    while (wheel100.length < 100) wheel100.push({ label: '⬜', name: 'فاضي', mult: 0, weight: 1 });
    while (wheel100.length > 100) wheel100.pop();

    const randomIndex = Math.floor(Math.random() * 100);
    const landed = wheel100[randomIndex];

    // 8. النتيجة - الربح دايما على قد الصندوق
    let newHouseBank = houseBank + houseFee;
    if (landed.name === 'فاضي') {
      setDiamonds(afterBet);
      setHouseBank(newHouseBank + (pool - houseFee));
      setLastResult(`وقفت على فاضي ⬜ - الكل خسر`);
      Alert.alert('فاضي ⬜', `العجلة وقفت على فاضي\nالكل خسر هاي الدورة\nخسرت ${currentTotal} ماسة\nرصيدك هلأ: ${afterBet}`);
    } else {
      const betOnLanded = currentBets[landed.label] || 0;
      if (betOnLanded > 0) {
        // الربح = مراهنتك × الضعف، بس ما بيطلع اكبر من maxWin ابدا
        const rawWin = betOnLanded * landed.mult;
        const winAmount = Math.min(rawWin, maxWin); // سقف على قد الصندوق
        const newBalance = afterBet + winAmount;
        setDiamonds(newBalance);
        const remaining = prizePool - winAmount;
        setHouseBank(newHouseBank + (remaining > 0 ? remaining : 0));
        setLastResult(`وقفت على ${landed.label} ${landed.name} x${landed.mult} - ربحت ${winAmount}!`);
        Alert.alert('ربحت! 🎉', `العجلة وقفت على ${landed.label} ${landed.name} - ${landed.mult} اضعاف\nانت كنت مراهن عليه ${betOnLanded} ماسة\nربحت ${winAmount} ماسة\nمجموع مراهناتك كان ${currentTotal}\nالصندوق كان ${pool}، اكبر ربح مسموح كان ${maxWin}\nرصيدك هلأ: ${newBalance}`);
      } else {
        setDiamonds(afterBet);
        setHouseBank(newHouseBank + prizePool);
        setLastResult(`وقفت على ${landed.label} ${landed.name} - ما كنت مراهن عليه، خسرت ${currentTotal}`);
        Alert.alert('خسرت 😢', `العجلة وقفت على ${landed.label} ${landed.name}\nانت ما كنت مراهن عليه، كان فاضي عندك\nخسرت ${currentTotal} ماسة\nرصيدك هلأ: ${afterBet}`);
      }
    }
    setBets({}); setActiveItem(null); setTimeLeft(10); setIsSpinning(false);
  };

  useEffect(() => {
    if (isSpinning) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => spinWheel(), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft === 10, isSpinning]);

  return (
    <ScrollView style={styles.bg}>
      <Text style={styles.logo}>Clipi كليبي</Text>
      <Text style={styles.sub}>بث مباشر • غرف • العاب • هدايا • ماسات</Text>

      <TouchableOpacity style={styles.diamondBar} onPress={() => setShowStore(!showStore)}>
        <Text style={styles.diamondText}>💎 {diamonds} ماسة - اكبس للمتجر | بنك المشروع: {houseBank}</Text>
      </TouchableOpacity>

      {showStore && (
        <View style={styles.storeBox}>
          <Text style={styles.storeTitle}>متجر الماسات / Diamond Store</Text>
          <Text style={styles.free}>10 ماسات مجانية اول دخول - رصيدك: {diamonds}</Text>
          {packs.map((pack) => (
            <View key={pack.id} style={styles.packCard}>
              <Text style={styles.packTitle}>باقة {pack.priceDollar}$</Text>
              <TouchableOpacity style={styles.dollarBtn} onPress={() => buyWithDollar(pack)}>
                <Text style={styles.btnText}>شراء بالدولار - {pack.dollarDiamonds} ماسة = {pack.priceDollar}$</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.piBtn} onPress={() => openPiModal(pack)}>
                <Text style={styles.btnTextPi}>شراء بـ Pi - {pack.piDiamonds} ماسة = Pi بقيمة {pack.priceDollar}$</Text>
              </TouchableOpacity>
              <Text style={styles.bonus}>+20% بونص عند الدفع بـ Pi</Text>
            </View>
          ))}
        </View>
      )}

      <Modal visible={showPiModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>تأكيد الشراء بـ Pi</Text>
            {selectedPack && (<><Text>الباقة: {selectedPack.piDiamonds} ماسة</Text><Text>القيمة: {selectedPack.priceDollar}$</Text></>)}
            <Text style={styles.noteBox}>ملاحظة قبل الشراء: عدد الماسات والمبلغ المدفوع بـ Pi يعتمد على سعر Pi، صعودا او هبوطا. الباقة قيمتها 1$، وسيتم حساب كم Pi يساوي 1$ وقت الدفع. Note: The number of diamonds and the Pi amount depend on the Pi price, up or down.</Text>
            <Text style={styles.smallNote}>الدفع بـ Pi متوفر فقط داخل Pi Browser لحساب موثق. اذا ما عندك محفظة موثقة، ادفع بالدولار هلأ وخلص بنفس الثانية.</Text>
            <TouchableOpacity style={styles.dollarBtn} onPress={confirmPiPayment}><Text style={styles.btnText}>تأكيد الدفع</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPiModal(false)}><Text style={styles.cancel}>إلغاء</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.plusBtn} onPress={goLive}>
        <Text style={styles.plusText}>+</Text>
      </TouchableOpacity>
      <Text style={styles.plusLabel}>اضغط + عشان تفتح بثك</Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.mainBtn} onPress={goLive}><Text style={styles.btnText}>Go Live</Text></TouchableOpacity>
        <TouchableOpacity style={styles.mainBtn2} onPress={voiceChat}><Text style={styles.btnText}>Voice Chat</Text></TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Greedy Star - ربح على قد الصندوق</Text>
        <Text style={styles.cardSub}>معك 10 ثواني تراهن. الكود بيشيك على الصندوق وبيجيب ربح بيناسبه تلقائي.</Text>

        <View style={styles.timerBox}>
          <Text style={styles.timerText}>{isSpinning ? '🎡 العجلة بتدور...' : `⏰ ضل ${timeLeft} ثواني`}</Text>
          <View style={styles.timerBarBg}><View style={[styles.timerBar, { width: `${timeLeft * 10}%` }]} /></View>
        </View>

        <View style={styles.wrap}>
          {wheelItems.map((item) => {
            const amount = bets[item.label] || 0;
            const isActive = activeItem === item.label;
            const isFilled = amount > 0;
            return (
              <TouchableOpacity key={item.id} style={[styles.itemBtn, isFilled && styles.itemFilled, isActive && styles.itemActive]} onPress={() => selectItem(item.label)}>
                <Text style={styles.itemText}>{item.label}</Text>
                <Text style={styles.multText}>x{item.mult}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.amountText}>{amount > 0 ? `💎 ${amount}` : 'فاضي - 0'}</Text>
                <Text style={styles.selectText}>{isActive ? '👆 عم تراهن هون' : isFilled ? '✅ مراهن عليه' : 'اكبس عشان تختاره'}</Text>
                {isFilled && <TouchableOpacity onPress={() => clearItem(item.label)}><Text style={styles.clearText}>مسح</Text></TouchableOpacity>}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.betLabel}>عبّيت {betCount} / 6 اصناف - المجموع: {totalCost} ماسة - الصندوق: {totalCost}</Text>

        <Text style={styles.betLabel}>اكبس عشان تزيد على الصنف اللي اخترته:</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.betBtn} onPress={() => addBet(10)}><Text style={styles.btnText}>+10</Text></TouchableOpacity>
          <TouchableOpacity style={styles.betBtn} onPress={() => addBet(100)}><Text style={styles.btnText}>+100</Text></TouchableOpacity>
          <TouchableOpacity style={styles.betBtn} onPress={() => addBet(1000)}><Text style={styles.btnText}>+1000</Text></TouchableOpacity>
          <TouchableOpacity style={styles.betBtn} onPress={() => addBet(10000)}><Text style={styles.btnText}>+10000</Text></TouchableOpacity>
        </View>
        <Text style={styles.note}>بدك 20؟ اكبس 10 مرتين. بدك 50؟ اكبس 10 خمس مرات. بدك 3000؟ اكبس 1000 ثلاث مرات.</Text>

        <View style={styles.row}>
          <TouchableOpacity style={styles.clearBtn} onPress={clearAll}><Text style={styles.btnText}>تصفير الكل</Text></TouchableOpacity>
          <TouchableOpacity style={styles.spinBtn} onPress={spinWheel}><Text style={styles.btnText}>لف هلأ - {totalCost} ماسة</Text></TouchableOpacity>
        </View>

        {lastResult !== '' && <Text style={styles.result}>{lastResult}</Text>}
        <Text style={styles.note}>خضار x5 | جمبري x10 | لحمة x15 | ستيك x25 | سمك x45 | الكود بيجيب ربح على قد الصندوق | نسبة ربح المشروع 15%</Text>
      </View>

      <Text style={styles.label}>اسمك</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="اسمك" />
      <Text style={styles.label}>عنوان البث</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="عنوان البث" />
      <Text style={styles.label}>تعليق</Text>
      <TextInput style={styles.input} value={comment} onChangeText={setComment} placeholder="اكتب تعليق" />
      <TouchableOpacity style={styles.sendBtn} onPress={() => { if(comment) { setComments([...comments, comment]); setComment(''); } }}>
        <Text style={styles.btnText}>إرسال</Text>
      </TouchableOpacity>
      {comments.map((c, i) => (<Text key={i} style={styles.comment}>💬 {c}</Text>))}
      <Text style={styles.footer}>Clipi - غرفتك انت، بثك انت. Terms & Privacy داخل البروفايل.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#12002b', padding: 16 },
  logo: { fontSize: 32, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  sub: { color: '#b388ff', textAlign: 'center', marginVertical: 8 },
  diamondBar: { backgroundColor: '#1e004d', padding: 14, borderRadius: 12, alignItems: 'center', marginVertical: 10, borderWidth: 1, borderColor: '#ffcc00' },
  diamondText: { color: '#ffcc00', fontWeight: 'bold', fontSize: 15 },
  storeBox: { backgroundColor: '#1e004d', borderRadius: 16, padding: 14, marginVertical: 10 },
  storeTitle: { fontSize: 19, color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  free: { color: '#ffcc00', textAlign: 'center', marginVertical: 8 },
  packCard: { backgroundColor: '#12002b', borderRadius: 12, padding: 12, marginBottom: 10 },
  packTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  dollarBtn: { backgroundColor: '#7b2fff', padding: 13, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  piBtn: { borderWidth: 1.5, borderColor: '#b388ff', padding: 11, borderRadius: 10, alignItems: 'center', marginBottom: 6 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  btnTextPi: { color: '#e6d5ff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  bonus: { color: '#00e676', textAlign: 'center', fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  noteBox: { backgroundColor: '#fff3e0', padding: 10, borderRadius: 10, marginVertical: 10, fontSize: 13, lineHeight: 19 },
  smallNote: { fontSize: 12, color: '#666', marginBottom: 12, textAlign: 'center' },
  cancel: { textAlign: 'center', color: '#7b2fff', fontWeight: 'bold', marginTop: 10 },
  plusBtn: { backgroundColor: '#7b2fff', width: 80, height: 80, borderRadius: 40, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  plusText: { color: '#fff', fontSize: 42, fontWeight: 'bold' },
  plusLabel: { color: '#fff', textAlign: 'center', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  mainBtn: { backgroundColor: '#7b2fff', flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', marginRight: 8 },
  mainBtn2: { backgroundColor: '#3b0a7a', flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: '#7b2fff' },
  card: { backgroundColor: '#1e004d', borderRadius: 16, padding: 16, marginVertical: 12 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  cardSub: { color: '#ccc', textAlign: 'center', marginVertical: 8 },
  timerBox: { backgroundColor: '#12002b', padding: 12, borderRadius: 12, alignItems: 'center', marginVertical: 8, borderWidth: 1, borderColor: '#ff9800' },
  timerText: { color: '#ffcc00', fontWeight: 'bold', fontSize: 20 },
  timerBarBg: { width: '100%', height: 8, backgroundColor: '#333', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  timerBar: { height: 8, backgroundColor: '#ff9800' },
  betLabel: { color: '#ffcc00', textAlign: 'center', fontWeight: 'bold', marginVertical: 8, fontSize: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  itemBtn: { backgroundColor: '#2a2a2a', width: '22%', padding: 8, borderRadius: 10, alignItems: 'center', margin: 4, borderWidth: 1, borderColor: '#555' },
  itemFilled: { backgroundColor: '#3b0a7a', borderColor: '#7b2fff' },
  itemActive: { backgroundColor: '#ff9800', borderColor: '#fff' },
  itemText: { fontSize: 24 },
  multText: { color: '#ffcc00', fontWeight: 'bold', fontSize: 13 },
  itemName: { color: '#fff', fontSize: 11 },
  amountText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 2 },
  selectText: { color: '#fff', fontSize: 9, textAlign: 'center', marginTop: 3 },
  clearText: { color: '#ff5252', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  betBtn: { backgroundColor: '#3b0a7a', flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', marginHorizontal: 3, borderWidth: 1, borderColor: '#7b2fff' },
  clearBtn: { backgroundColor: '#555', flex: 1, padding: 13, borderRadius: 12, alignItems: 'center', marginRight: 6 },
  spinBtn: { backgroundColor: '#ff9800', flex: 2, padding: 13, borderRadius: 12, alignItems: 'center', marginLeft: 6 },
  result: { color: '#fff', textAlign: 'center', marginTop: 10, fontWeight: 'bold' },
  note: { color: '#ccc', textAlign: 'center', marginTop: 8, fontSize: 12 },
  label: { color: '#fff', marginTop: 14, marginBottom: 6, fontWeight: 'bold' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  sendBtn: { backgroundColor: '#7b2fff', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  comment: { color: '#fff', marginTop: 8 },
  footer: { color: '#888', textAlign: 'center', marginVertical: 20, fontSize: 12 },
});
