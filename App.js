import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';

export default function App() {
  const [name, setName] = useState('وليد');
  const [title, setTitle] = useState('أجمل لحظات اليوم');
  const [videoUrl, setVideoUrl] = useState('');
  const [videos, setVideos] = useState([]);
  const [tab, setTab] = useState('videos');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [gifts, setGifts] = useState([]);
  return (
    <ScrollView style={styles.bg}>
      <Text style={styles.logo}>Clipi كليبي</Text>
      <Text style={styles.sub}>فيديوهات • غرف مباشرة</Text>
      <Text style={styles.label}>اسمك</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setTab('videos')}><Text style={{ fontWeight: 'bold' }}>فيديوهات</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('live')}><Text style={{ fontWeight: 'bold' }}>لايف 🔴</Text></TouchableOpacity>
      </View>
      {tab === 'videos' && (
        <View>
          <Text style={styles.label}>عنوان الفيديو</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.label}>رابط الفيديو</Text>
          <TextInput style={styles.input} value={videoUrl} onChangeText={setVideoUrl} placeholder="https://..." />
          <TouchableOpacity style={styles.btn} onPress={() => { setVideos([{ id: Date.now(), title, url: videoUrl, creator: name }, ...videos]); Alert.alert('تم نشر الفيديو ✅'); }}><Text style={styles.btnText}>نشر الفيديو</Text></TouchableOpacity>
          {videos.map(v => (
            <View key={v.id} style={styles.card}><Text style={styles.cardTitle}>{v.title}</Text><Text>بواسطة {v.creator}</Text><Text>{v.url}</Text></View>
          ))}
        </View>
      )}
      {tab === 'live' && (
        <View>
          <Text style={styles.label}>غرفة مباشرة - دردشه - LIVE 🔴</Text>
          <Text style={{ color: '#fff', marginVertical: 6 }}>مع {name} • أنت المضيف</Text>
          <Text style={{ color: '#fff', backgroundColor: '#333', padding: 20, textAlign: 'center', borderRadius: 12 }}>📷 الكاميرا بتيجي بعدين</Text>
          <Text style={styles.label}>أرسل هدية - {gifts.length} هدية</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <TouchableOpacity style={styles.gift} onPress={() => setGifts([...gifts, '🌹'])}><Text>🌹 وردة</Text></TouchableOpacity>
            <TouchableOpacity style={styles.gift} onPress={() => setGifts([...gifts, '❤️'])}><Text>❤️ قلب</Text></TouchableOpacity>
            <TouchableOpacity style={styles.gift} onPress={() => setGifts([...gifts, '☕'])}><Text>☕ قهوة</Text></TouchableOpacity>
          </View>
          <Text style={{ color: '#fff', marginTop: 8 }}>{gifts.join(' ')}</Text>
          <Text style={styles.label}>التعليقات</Text>
          {comments.map((c, i) => (<Text key={i} style={{ color: '#fff', marginVertical: 2 }}>{c.user}: {c.text}</Text>))}
          <TextInput style={styles.input} value={comment} onChangeText={setComment} placeholder="اكتب تعليقك هنا..." />
          <TouchableOpacity style={styles.btn} onPress={() => { if (comment) { setComments([...comments, { user: name, text: comment }]); setComment(''); } }}><Text style={styles.btnText}>إرسال</Text></TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  bg: { flex: 1, padding: 16, backgroundColor: '#111' },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginTop: 20 },
  sub: { color: '#fff', textAlign: 'center', marginBottom: 16 },
  label: { color: '#fff', marginTop: 8 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginVertical: 6 },
  btn: { backgroundColor: '#ff2d55', padding: 14, borderRadius: 12, marginVertical: 10 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', padding: 12, borderRadius: 10 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginVertical: 6 },
  cardTitle: { fontWeight: 'bold', fontSize: 16 },
  gift: { backgroundColor: '#fff', padding: 10, borderRadius: 10 },
});
