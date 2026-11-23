import React, {useRef, useState} from 'react';
import {Linking, Share, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import * as Crypto from 'expo-crypto';

const packs = [1, 2, 5, 10, 20, 50, 100];

export default function PiDiamondShop({endpoint, request, uid, isCurrentUser}) {
  const [dollars, setDollars] = useState(1);
  const [offer, setOffer] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const active = useRef(false);
  const order = useRef(null);

  function choose(amount) {
    if (active.current) return;
    setDollars(amount);
    setOffer(null);
    setLink('');
    setMessage('');
    order.current = null;
  }

  async function next() {
    if (active.current || !isCurrentUser(uid)) return;
    active.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (!offer) {
        if (!order.current) order.current = Crypto.randomUUID();
        const quote = await request('/account-number', {op:'externalCreate', method:'pi', dollars, id:order.current});
        if (!isCurrentUser(uid)) return;
        if (quote.url !== endpoint + '/external-checkout#' + order.current ||
            !Number.isFinite(Number(quote.amount)) || Number(quote.amount) <= 0 ||
            quote.diamonds !== dollars * 1200 || !Number.isFinite(quote.expires)) {
          throw Error('تعذّر التحقق من عرض الشراء.');
        }
        setOffer(quote);
        setLink('');
        return;
      }
      if (Date.now() >= offer.expires) {
        setOffer(null);
        setLink('');
        order.current = null;
        throw Error('انتهت صلاحية السعر. اطلب سعرًا جديدًا.');
      }
      setLink(offer.url);
      try {
        await Linking.openURL(offer.url.replace(/^https:/, 'pi:'));
      } catch {
        throw Error('افتح رابط الطلب في Pi Browser من خيار المشاركة.');
      }
      setMessage('بعد تأكيد الدفع، ارجع إلى محفظة كليبي لتشوف رصيدك.');
    } catch (error) {
      if (error.status === 409) {
        order.current = null;
        setLink('');
        setOffer(null);
      }
      setMessage(error.message);
    } finally {
      active.current = false;
      setBusy(false);
    }
  }

  return <View style={styles.body}>
    <Text style={styles.title}>اختر باقة الماس</Text>
    <View style={styles.packs}>{packs.map(n =>
      <TouchableOpacity key={n} accessibilityRole="button" accessibilityState={{selected:n===dollars}}
        disabled={busy} onPress={()=>choose(n)} style={[styles.pack,n===dollars&&styles.selected]}>
        <Text style={styles.ink}>{(n*1200).toLocaleString('en-US')} 💎</Text>
        <Text style={styles.ink}>{n} USD</Text>
      </TouchableOpacity>
    )}</View>
    {offer&&<Text accessibilityLiveRegion="polite" style={styles.ink}>{offer.diamonds.toLocaleString('en-US')} ماسة مقابل {offer.amount} Pi</Text>}
    <TouchableOpacity accessibilityRole="button" style={styles.button} disabled={busy} onPress={next}>
      <Text style={styles.ink}>{busy?'جارٍ الاتصال…':offer?'متابعة في Pi Browser':'عرض السعر بعملة Pi'}</Text>
    </TouchableOpacity>
    {!!message&&<Text accessibilityLiveRegion="polite" style={styles.ink}>{message}</Text>}
    {!!link&&<TouchableOpacity accessibilityRole="button" onPress={()=>Share.share({message:link}).catch(()=>setMessage('تعذّر فتح المشاركة. أعد المحاولة.'))}>
      <Text style={styles.ink}>مشاركة رابط الطلب لفتحه في Pi Browser</Text>
    </TouchableOpacity>}
  </View>;
}
const styles=StyleSheet.create({
  body:{padding:18,gap:14,borderRadius:18,backgroundColor:'#fffdf5'},
  title:{fontSize:20,fontWeight:'700',color:'#193e36',textAlign:'right'},
  packs:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8},
  pack:{minWidth:'30%',minHeight:52,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#c8d9d1',borderRadius:10},
  selected:{borderColor:'#39795f',backgroundColor:'#e2f4e9'},
  button:{alignItems:'center',padding:12,backgroundColor:'#c9ebd9',borderRadius:12},
  ink:{fontSize:16,color:'#193e36',textAlign:'right'}
});
