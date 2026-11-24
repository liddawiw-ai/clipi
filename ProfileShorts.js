import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Player} from './ShortMedia';

const unchanged = text => text;

function Action({label, onPress, disabled = false, danger = false}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[styles.action, danger && styles.danger, disabled && styles.disabled]}>
    <Text style={[styles.actionText, danger && styles.dangerText]}>{label}</Text>
  </Pressable>;
}

export default function ProfileShorts({request, endpoint, authorUid, translate = unchanged}) {
  const [clips, setClips] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const life = useRef(0), loadingPage = useRef(null), deletingId = useRef(null);

  const load = useCallback(async before => {
    const generation = life.current;
    if (loadingPage.current === generation) return;
    loadingPage.current = generation;
    setLoading(true);
    setError('');
    try {
      const page = await request('/account-number', {op: 'shortProfileList', owner: authorUid, before});
      if (life.current !== generation) return;
      setClips(current => before == null ? page.clips : [...current, ...page.clips]);
      setCanDelete(page.canDelete === true);
      setCursor(page.nextCursor);
    } catch (e) {
      if (life.current === generation) setError(e.message || translate('تعذّر تحميل الفيديوهات'));
    } finally {
      if (life.current === generation) {
        loadingPage.current = null;
        setLoading(false);
      }
    }
  }, [request, authorUid, translate]);

  useEffect(() => {
    life.current++;
    setClips([]); setCursor(null); setSelected(null); setConfirmId(null);
    setCanDelete(false); setDeleteError(''); setDeleting(false); deletingId.current = null;
    load(null);
    return () => { life.current++; };
  }, [load]);

  async function remove(id) {
    if (!canDelete || deletingId.current != null || confirmId !== id) return;
    const generation = life.current;
    deletingId.current = id;
    setDeleting(true); setDeleteError('');
    try {
      await request('/account-number', {op: 'shortDelete', clip: id});
      if (life.current !== generation) return;
      setClips(current => current.filter(clip => clip.id !== id));
      setSelected(current => current === id ? null : current);
      setConfirmId(null);
    } catch (e) {
      if (life.current === generation) setDeleteError(e.message || translate('تعذّر حذف الفيديو'));
    } finally {
      if (life.current === generation) { deletingId.current = null; setDeleting(false); }
    }
  }

  function open(id) {
    setSelected(id); setPlaying(true); setMuted(true);
  }

  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>{translate(authorUid ? 'الفيديوهات' : 'فيديوهاتي')}</Text>
    {clips.map((clip, index) => <View key={clip.id} style={styles.card}>
      <View style={styles.row}>
        <Pressable style={styles.open} accessibilityRole="button" onPress={() => open(clip.id)}
          accessibilityLabel={translate('تشغيل الفيديو') + ' ' + (clip.title || index + 1)}>
          <Text style={styles.play}>▶</Text>
          <Text style={styles.title} numberOfLines={2}>{clip.title || translate('فيديو') + ' ' + (index + 1)}</Text>
        </Pressable>
        {canDelete && <Action label={translate('حذف الفيديو')} danger disabled={deleting}
          onPress={() => { setConfirmId(clip.id); setDeleteError(''); }}/>}
      </View>
      {selected === clip.id && <>
        <View style={styles.video}>
          <Player key={clip.id} source={endpoint + '/shorts/media/' + clip.id} fit="contain"
            active={playing} muted={muted} onMuteRequired={setMuted}/>
        </View>
        <View style={styles.controls}>
          <Action label={translate(playing ? 'إيقاف مؤقت' : 'تشغيل')} onPress={() => setPlaying(!playing)}/>
          <Action label={translate(muted ? 'تشغيل الصوت' : 'كتم الصوت')} onPress={() => setMuted(!muted)}/>
          <Action label={translate('إغلاق')} onPress={() => setSelected(null)}/>
        </View>
      </>}
      {confirmId === clip.id && <View style={styles.confirm}>
        <Text style={styles.title}>{translate('حذف الفيديو؟')}</Text>
        <Text style={styles.muted}>{translate('سيُحذف المقطع وتعليقاته نهائيًا.')}</Text>
        {!!deleteError && <Text accessibilityRole="alert" style={styles.dangerText}>{deleteError}</Text>}
        <View style={styles.controls}>
          <Action label={translate(deleting ? 'جارٍ الحذف…' : 'تأكيد الحذف')} danger disabled={deleting} onPress={() => remove(clip.id)}/>
          <Action label={translate('إلغاء')} disabled={deleting} onPress={() => setConfirmId(null)}/>
        </View>
      </View>}
    </View>)}
    {loading && <Text style={styles.muted}>{translate('جارٍ تحميل الفيديوهات…')}</Text>}
    {!loading && !!error && <View><Text accessibilityRole="alert" style={styles.muted}>{error}</Text>
      <Action label={translate('إعادة المحاولة')} onPress={() => load(cursor)}/></View>}
    {!loading && !error && !clips.length && <Text style={styles.muted}>{translate('لا توجد فيديوهات منشورة بعد')}</Text>}
    {!loading && !error && cursor != null && <Action label={translate('عرض المزيد')} onPress={() => load(cursor)}/>}
  </View>;
}

const styles = StyleSheet.create({
  section: {backgroundColor:'#fff', borderRadius:16, padding:14, gap:10},
  heading: {fontSize:20, fontWeight:'700', color:'#192625', textAlign:'right'},
  card: {borderWidth:1, borderColor:'#e0e6e2', borderRadius:12, overflow:'hidden'},
  row: {flexDirection:'row-reverse', alignItems:'center', padding:7, gap:8},
  open: {flex:1, minHeight:48, flexDirection:'row-reverse', alignItems:'center', gap:10},
  play: {color:'#225648', backgroundColor:'#e2f1eb', borderRadius:8, overflow:'hidden', padding:10},
  title: {flexShrink:1, fontWeight:'600', color:'#192625', textAlign:'right'},
  video: {height:260, backgroundColor:'#101615'}, controls: {flexDirection:'row-reverse', flexWrap:'wrap', padding:4, gap:5},
  action: {minHeight:44, justifyContent:'center', paddingHorizontal:10, alignItems:'center', borderRadius:9},
  actionText: {fontWeight:'600', color:'#225648'}, danger: {backgroundColor:'#fff0ed'},
  dangerText: {color:'#932c25'}, disabled: {opacity:0.5},
  muted: {color:'#53625b', textAlign:'right'}, confirm: {padding:10, gap:6, backgroundColor:'#fff7f5'}
});
