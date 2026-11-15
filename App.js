import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import Store from './components/Store';

export default function App() {
  const [name, setName] = useState('وليد');
  const [title, setTitle] = useState('بث اليوم');
  const [diamonds, setDiamonds] = useState(10);
  const [tab, setTab] = useState('home');
  const [showStore, setShowStore] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);

  const goLive = () => {
    Alert.alert('Go Live', 'رح تنشئ غرفتك العامة الخاصة فيك. كل واحد بيكبس Go Live بتنفتح غرفته هو.');
    setTab('live');
  };

  const voiceChat = () => {
    Alert.alert('Voice Chat', 'رح تنشئ غرفة صوتية عامة خاصة فيك.');
    setTab('voice');
  };

  const spinWheel = () => {
    const win = Math.floor(Math.random() * 100) + 10;
    setDiamonds(diamonds + win);
    Alert.alert('Greedy Star', `ربحت ${win} ماسة!`);
  };

  const playGame = (game) => {
    Alert.alert(game, 'رح تفتح اللعبة جوا الغرفة، العب واربح ماسات وادعم الستريمر.');
  };

  return (
    <ScrollView style={styles.bg}>
      <Text style={styles.logo}>Clipi كليبي</Text>
      <Text style={styles.sub}>بث مباشر • غرف • العاب • هدايا • ماسات</Text>

      {/* زر الماس */}
      <TouchableOpacity style={styles.diamondBar} onPress={() => setShowStore(!showStore)}>
        <Text style={styles.diamondText}>💎 {diamonds} ماسة - اكبس للمتجر</Text>
      </TouchableOpacity>

      {showStore && <Store diamonds={diamonds} setDiamonds={setDiamonds} />}

      {/* زر + الكبير */}
      <TouchableOpacity style={styles.plusBtn} onPress={goLive}>
        <Text style={styles.plusText}>+</Text>
      </TouchableOpacity>
      <Text style={styles.plusLabel}>اضغط + عشان تفتح بثك</Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.mainBtn} onPress={goLive}>
          <Text style={styles.btnText}>Go Live</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mainBtn2} onPress={voiceChat}>
          <Text style={styles.btnText}>Voice Chat</Text>
        </TouchableOpacity>
      </View>

      {/* العاب */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>العاب - Games</Text>
        <Text style={styles.cardSub}>العب جوا الغرفة، اربح ماسات، وادعم الستريمرز</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.gameBtn} onPress={() => playGame('Greedy Star')}>
            <Text style={styles.btnText}>Greedy Star</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gameBtn} onPress={() => playGame('عجلة الحظ')}>
            <Text style={styles.btnText}>عجلة الحظ</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.gameBtn} onPress={() => playGame('تحدي')}>
            <Text style={styles.btnText}>تحدي</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gameBtn} onPress={() => playGame('هدايا')}>
            <Text style={styles.btnText}>هدايا</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.spinBtn} onPress={spinWheel}>
          <Text style={styles.btnText}>لف عجلة Greedy Star واربح ماسات</Text>
        </TouchableOpacity>
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

      {comments.map((c, i) => (
        <Text key={i} style={styles.comment}>💬 {c}</Text>
      ))}

      <Text style={styles.footer}>Clipi - غرفتك انت، بثك انت. Terms & Privacy داخل البروفايل.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#12002b', padding: 16 },
  logo: { fontSize: 32, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  sub: { color: '#b388ff', textAlign: 'center', marginVertical: 8 },
  diamondBar: { backgroundColor: '#1e004d', padding: 14, borderRadius: 12, alignItems: 'center', marginVertical: 10, borderWidth: 1, borderColor: '#ffcc00' },
  diamondText: { color: '#ffcc00', fontWeight: 'bold', fontSize: 17 },
  plusBtn: { backgroundColor: '#7b2fff', width: 80, height: 80, borderRadius: 40, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  plusText: { color: '#fff', fontSize: 42, fontWeight: 'bold' },
  plusLabel: { color: '#fff', textAlign: 'center', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  mainBtn: { backgroundColor: '#7b2fff', flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', marginRight: 8 },
  mainBtn2: { backgroundColor: '#3b0a7a', flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: '#7b2fff' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  card: { backgroundColor: '#1e004d', borderRadius: 16, padding: 16, marginVertical: 12 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  cardSub: { color: '#ccc', textAlign: 'center', marginVertical: 8 },
  gameBtn: { backgroundColor: '#3b0a7a', flex: 1, padding: 13, borderRadius: 10, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#7b2fff' },
  spinBtn: { backgroundColor: '#ff9800', padding: 13, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  label: { color: '#fff', marginTop: 14, marginBottom: 6, fontWeight: 'bold' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  sendBtn: { backgroundColor: '#7b2fff', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  comment: { color: '#fff', marginTop: 8 },
  footer: { color: '#888', textAlign: 'center', marginVertical: 20, fontSize: 12 },
});
