import React from 'react';
import {View,Text,TouchableOpacity,StyleSheet,Alert} from 'react-native';

// Archived shop component: payment and diamond issuance are intentionally disabled.
// Never credit diamonds from a client-side confirmation without a verified purchase receipt.
const PACKS=[
 {usd:1,usdDiamonds:1000,piDiamonds:1200},
 {usd:2,usdDiamonds:2000,piDiamonds:2400},
 {usd:5,usdDiamonds:5000,piDiamonds:6000},
 {usd:10,usdDiamonds:10000,piDiamonds:12000},
];
export default function Store({diamonds=0}){
 const unavailable=()=>Alert.alert('الشراء غير متاح حاليًا',
  'هذه معاينة للأسعار فقط. لن يتم خصم أموال أو إضافة ماسات حتى تفعيل نظام دفع معتمد والتحقق من المعاملات على الخادم.');
 return <View style={styles.container}>
  <Text style={styles.title}>متجر الماسات — معاينة فقط</Text>
  <Text style={styles.note}>رصيد المعاينة: {Number.isFinite(diamonds)?diamonds:0} ماسة</Text>
  {PACKS.map(pack=><View key={pack.usd} style={styles.card}>
   <Text style={styles.label}>{pack.usdDiamonds} ماسة مقابل {pack.usd}$</Text>
   <Text style={styles.note}>أو {pack.piDiamonds} ماسة بقيمة {pack.usd}$ عبر Pi عند إتاحة الدفع</Text>
   <TouchableOpacity accessibilityRole="button" onPress={unavailable} style={styles.button}>
    <Text style={styles.buttonText}>الشراء غير مفعّل</Text>
   </TouchableOpacity>
  </View>)}
  <Text style={styles.note}>لا تُصدر هذه الشاشة ماسات ولا تنفذ عمليات مالية.</Text>
 </View>;
}
const styles=StyleSheet.create({
 container:{backgroundColor:'#1e004d',borderRadius:16,padding:14,marginVertical:10},
 title:{fontSize:19,color:'#fff',fontWeight:'bold',textAlign:'center'},
 card:{backgroundColor:'#12002b',borderRadius:12,padding:12,marginVertical:6},
 label:{color:'#fff',fontSize:15,textAlign:'center'},
 note:{color:'#e4d6ff',fontSize:12,marginVertical:8,textAlign:'center'},
 button:{backgroundColor:'#554568',padding:12,borderRadius:10,alignItems:'center'},
 buttonText:{color:'#fff',fontWeight:'bold'}
});
