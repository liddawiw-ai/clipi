import {theme} from './ClipiTheme';
import {ui} from './interface-language.mjs';
import React from 'react';
import {View,Text,TouchableOpacity} from 'react-native';
export default function EarningsWalletScreen({onBack}){
 return <View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:theme.paper}}>
 <Text style={{color:theme.ink}}>{ui("محفظة الأرباح تتطلب التحقق من هوية صاحب الجهاز داخل تطبيق أندرويد.")}</Text>
 <TouchableOpacity onPress={onBack}><Text style={{color:theme.ink,padding:12}}>{ui("رجوع")}</Text></TouchableOpacity></View>;
}
