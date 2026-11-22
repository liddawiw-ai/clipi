import React,{useState,useEffect,useRef} from 'react';
import {View,Text,TextInput,ScrollView,TouchableOpacity,StyleSheet,Alert,Linking} from 'react-native';
import countries from './payout-countries.json';
const normalize=v=>v.trim().toLowerCase().replace(/[أآإ]/g,'ا');
const digits=v=>v.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace('٫','.');
export default function PayoutPicker({data,call,reload}){
 const [open,setOpen]=useState(false),[search,filter]=useState(''),[country,choose]=useState(null);
 const [options,setOptions]=useState(null),[method,setMethod]=useState(null),[amount,setAmount]=useState(''),[pin,setPin]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(''),[retry,refresh]=useState(0);
 const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 useEffect(()=>{
  let current=true;
  setOptions(null);setMethod(null);setError('');
  if(country)call('getPayoutMethods')({country:country[0]}).then(r=>{if(current)setOptions(r.data.methods)}).catch(()=>{if(current)setError('تعذّر تحميل طرق السحب المتاحة في هذه الدولة.')});
  return()=>{current=false};
 },[country,retry,call]);
 const points=Math.round(Number(digits(amount))*100);
 const can=Boolean(data?.canRequest&&method&&/^\d+(\.\d{1,2})?$/.test(digits(amount))&&points>=data.minimumPoints&&points<=data.availablePoints&&method.bands.some(b=>points>=Math.round(b.min*100)&&points<=Math.round(b.max*100)));
 async function submit(receipt=false){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  try{
   const response=await call('requestCashPayout')({pin:digits(pin),country:country?.[0],product:method?.id,points:Number.isFinite(points)?points:0,receipt});
   if(!alive.current)return;
   const r=response.data;
   setResult(r.state==='issued'?'صدر رابط استلام المبلغ.':r.state==='canceled'?'أُلغي الطلب وأُعيد المبلغ إلى رصيدك.':'طلبك قيد المعالجة.');
   setPin('');await reload();
   if(alive.current&&r.url)await Linking.openURL(r.url);
  }catch(e){if(alive.current)setError(e.message)}
  finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const action=(text,onPress,disabled=false)=><TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={[S.button,disabled&&{opacity:.5}]}><Text style={S.cta}>{text}</Text></TouchableOpacity>;
 return <View style={S.panel}><Text style={S.heading}>سحب الأرباح</Text>
 <Text style={S.label}>الرصيد المتاح للسحب {data?'$'+(data.availableUsdMinor/100).toFixed(2):'…'}</Text>
 <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)} style={S.selection}><Text style={S.value}>{country?.[1]||'اختر الدولة'}　{open?'▴':'▾'}</Text></TouchableOpacity>
 {open&&<View><TextInput accessibilityLabel="البحث عن دولة" placeholder="ابحث باسم الدولة أو رمزها" placeholderTextColor="#bbb0c5" value={search} onChangeText={filter} style={S.input}/>
 <ScrollView nestedScrollEnabled style={{maxHeight:215}} keyboardShouldPersistTaps="handled">{countries.filter(([code,name])=>normalize(name).includes(normalize(search))||code.includes(search.trim().toUpperCase())).map(c=><TouchableOpacity accessibilityRole="button" key={c[0]} onPress={()=>{choose(c);setOpen(false);filter('')}} style={S.row}><Text style={S.value}>{c[1]}</Text></TouchableOpacity>)}</ScrollView></View>}
 {country&&!options&&!error&&<Text style={S.label}>جارٍ جلب طرق السحب…</Text>}
 {options?.length===0&&<Text style={S.label}>لا تتوفر وسيلة سحب بالدولار لهذه الدولة حاليًا.</Text>}
 {['bank','wallet'].map(t=>options?.some(m=>m.type===t)&&<View key={t}><Text style={S.label}>{t==='bank'?'التحويل البنكي':'المحافظ الإلكترونية'}</Text>
 {options.filter(m=>m.type===t).map(m=><TouchableOpacity key={m.id} accessibilityRole="radio" accessibilityState={{selected:method?.id===m.id}} onPress={()=>setMethod(m)} style={S.row}><Text style={S.value}>{method?.id===m.id?'●':'○'}　{m.name}</Text></TouchableOpacity>)}</View>)}
 {method&&<TextInput accessibilityLabel="مبلغ السحب بالدولار" keyboardType="decimal-pad" placeholder="المبلغ بالدولار" value={amount} onChangeText={setAmount} placeholderTextColor="#bbb0c5" style={S.input}/>}
 {(method||data?.activeWithdrawal||data?.lastWithdrawal)&&<TextInput keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="الرقم السري للمحفظة" placeholderTextColor="#bbb0c5" value={pin} onChangeText={setPin} style={S.input}/>}
 {method&&!data?.activeWithdrawal&&action('طلب سحب',()=>Alert.alert('تأكيد السحب',amount+' USD · '+country[1]+' · '+method.name,[{text:'إلغاء',style:'cancel'},{text:'تأكيد',onPress:()=>submit()}]),busy||!can||!/^\d{6}$/.test(digits(pin)))}
 {data?.activeWithdrawal&&action('متابعة الطلب الحالي',()=>submit(),busy||digits(pin).length!==6)}
 {data?.lastWithdrawal&&!data.activeWithdrawal&&action('فتح آخر إيصال',()=>submit(true),busy||digits(pin).length!==6)}
 {!!result&&<Text style={S.label}>{result}</Text>}
 {!!error&&<Text accessibilityLiveRegion="polite" style={S.error}>{error}</Text>}
 {error&&country&&!options&&action('إعادة تحميل الطرق',()=>refresh(n=>n+1))}
 </View>;
}
const S=StyleSheet.create({panel:{padding:18,marginVertical:10,gap:9,backgroundColor:'#302051',borderRadius:14},heading:{fontSize:21,fontWeight:'900',color:'#fff0db',textAlign:'right'},label:{color:'#e5d5e9',textAlign:'right',lineHeight:22},selection:{padding:14,backgroundColor:'#483657',borderRadius:12,borderWidth:1,borderColor:'#a08061'},value:{fontSize:16,color:'#f9efdd',textAlign:'right'},row:{padding:11,borderBottomWidth:1,borderColor:'#614968'},input:{padding:11,borderRadius:10,backgroundColor:'#251a34',color:'white',textAlign:'right'},button:{backgroundColor:'#efd099',padding:13,borderRadius:12,alignItems:'center'},cta:{color:'#302031',fontWeight:'800'},error:{color:'#ffcbcd',textAlign:'right'}});
