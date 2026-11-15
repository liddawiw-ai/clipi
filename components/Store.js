import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';

export default function Store({ diamonds, setDiamonds }) {
  const [showPiModal, setShowPiModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);

  const packs = [
    { id: 1, dollarDiamonds: 1000, piDiamonds: 1200, priceDollar: 1 },
    { id: 2, dollarDiamonds: 5500, piDiamonds: 6600, priceDollar: 5 },
    { id: 3, dollarDiamonds: 12000, piDiamonds: 14400, priceDollar: 10 },
  ];

  const buyWithDollar = (pack) => {
    Alert.alert('الدفع عبر Google Play', `سيتم خصم ${pack.priceDollar}$ وستحصل على ${pack.dollarDiamonds} ماسة فوراً`, [
      { text: 'إلغاء' },
      { text: 'تأكيد', onPress: () => { setDiamonds(diamonds + pack.dollarDiamonds); Alert.alert('تم!', `حصلت على ${pack.dollarDiamonds} ماسة`); } }
    ]);
  };

  const openPiModal = (pack) => { setSelectedPack(pack); setShowPiModal(true); };
  const confirmPiPayment = () => { setShowPiModal(false); Alert.alert('Pi Browser', 'اذا كنت داخل Pi Browser ومحفظتك موثقة، سيتم فتح المحفظة للدفع. اذا ما عندك محفظة موثقة، ادفع بالدولار هلأ وخلص فورا.'); };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>متجر الماسات / Diamond Store</Text>
      <Text style={styles.free}>10 ماسات مجانية اول دخول - رصيدك: {diamonds}</Text>
      {packs.map((pack) => (
        <View key={pack.id} style={styles.card}>
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
      <Modal visible={showPiModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>تأكيد الشراء بـ Pi</Text>
            {selectedPack && (<><Text>الباقة: {selectedPack.piDiamonds} ماسة</Text><Text>القيمة: {selectedPack.priceDollar}$</Text><Text>السعر الحالي: مثال 1$ = 3.33 Pi</Text></>)}
            <Text style={styles.note}>ملاحظة قبل الشراء: عدد الماسات والمبلغ المدفوع بـ Pi يعتمد على سعر Pi، صعودا او هبوطا. الباقة قيمتها 1$، وسيتم حساب كم Pi يساوي 1$ وقت الدفع. Note: The number of diamonds and the Pi amount depend on the Pi price, up or down.</Text>
            <Text style={styles.smallNote}>الدفع بـ Pi متوفر فقط داخل Pi Browser لحساب موثق. اذا ما عندك محفظة موثقة، ادفع بالدولار هلأ وخلص بنفس الثانية.</Text>
            <TouchableOpacity style={styles.dollarBtn} onPress={confirmPiPayment}><Text style={styles.btnText}>تأكيد الدفع</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPiModal(false)}><Text style={styles.cancel}>إلغاء</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#1e004d', borderRadius: 16, padding: 14, marginVertical: 10 },
  title: { fontSize: 19, color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  free: { color: '#ffcc00', textAlign: 'center', marginVertical: 8 },
  card: { backgroundColor: '#12002b', borderRadius: 12, padding: 12, marginBottom: 10 },
  packTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  dollarBtn: { backgroundColor: '#7b2fff', padding: 13, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  piBtn: { borderWidth: 1.5, borderColor: '#b388ff', padding: 11, borderRadius: 10, alignItems: 'center', marginBottom: 6 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  btnTextPi: { color: '#e6d5ff', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  bonus: { color: '#00e676', textAlign: 'center', fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  note: { backgroundColor: '#fff3e0', padding: 10, borderRadius: 10, marginVertical: 10, fontSize: 13, lineHeight: 19 },
  smallNote: { fontSize: 12, color: '#666', marginBottom: 12, textAlign: 'center' },
  cancel: { textAlign: 'center', color: '#7b2fff', fontWeight: 'bold', marginTop: 10 },
});
