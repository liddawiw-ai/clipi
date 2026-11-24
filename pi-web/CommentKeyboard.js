import {ui,interfaceLocale} from './interface-language.mjs';
import React,{useState} from 'react';
import {Platform,Pressable,StyleSheet,Text,View} from 'react-native';

const layouts={
  ar:['ض ص ث ق ف غ ع ه خ ح ج','ش س ي ب ل ا ت ن م ك ط','ئ ء ؤ ر ى ة و ز ظ د ذ'],
  arShift:['أ إ آ ٱ پ چ ژ گ ڤ','َ ً ُ ٌ ِ ٍ ْ ّ ـ','، ؛ ؟ ! . : ( ) « »'],
  en:['q w e r t y u i o p','a s d f g h j k l','z x c v b n m'],
  num:['1 2 3 4 5 6 7 8 9 0','@ # $ % & - + ( )','! ؟ ، . : / _'],
  sym:['١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ٠','[ ] { } < > = *','~ ^ | \\ ؛ « » …']
};
export function CommentKeyboard({onEdit,onSend,onHide,canSend,short=false,rowHeight=42,disabled=false}){
  const [lang,setLang]=useState(()=>interfaceLocale()==='ar'?'ar':'en'),[numbers,setNumbers]=useState(false),[shift,setShift]=useState(false);
  const layout=numbers?(shift?'sym':'num'):(lang==='ar'&&shift?'arShift':lang);
  function key(value,action,options={}){
    const {weight=1,special=false,selected=false,send=false,label=value,testID}=options;
    const locked=disabled||send&&!canSend;
    return <Pressable key={label} testID={testID} disabled={locked} accessibilityRole="button" accessibilityLabel={special?ui(label):label}
      accessibilityState={{disabled:locked,selected}} onPress={action}
      {...(Platform.OS==='web'?{onMouseDown:e=>e.preventDefault()}: {})}
      style={({pressed})=>[s.key,{height:rowHeight,flexGrow:weight},special&&s.modifier,selected&&s.selected,send&&s.send,locked&&send&&s.dim,pressed&&s.pressed]}>
      <Text allowFontScaling={false} style={[s.letter,special&&s.word,send&&s.light,short&&{fontSize:special?13:17}]}>{special?ui(value):value}</Text>
    </Pressable>;
  }
  const control=(value,action,label,extra={})=>key(value,action,{special:true,label,...extra});
  function type(value){onEdit(value);if(shift&&!numbers)setShift(false);}
  return <View style={s.keyboard} testID="clipi-keyboard">
    {layouts[layout].map((row,index)=><View key={index} style={s.row}>
      {row.split(' ').map(symbol=>{const v=!numbers&&lang==='en'&&shift?symbol.toUpperCase():symbol;return key(v,()=>type(v));})}
    </View>)}
    <View style={s.row}>
      {control(numbers?'ABC':'١٢٣',()=>{setNumbers(!numbers);setShift(false);},numbers?'الحروف':'الأرقام')}
      {control(lang==='ar'?'EN':'عربي',()=>{setLang(lang==='ar'?'en':'ar');setNumbers(false);setShift(false);},'تبديل اللغة')}
      {control(numbers?'#+=':lang==='ar'?'أَ':'⇧',()=>setShift(!shift),'تبديل الرموز والحروف',{selected:shift})}
      {key(ui('مسافة'),()=>type(' '),{weight:2.2,label:'مسافة',special:true})}
      {control('⌫',()=>onEdit(null),'حذف حرف')}
      {control('⌄',onHide,'إخفاء لوحة المفاتيح')}
      {control('إرسال',onSend,'إرسال من لوحة المفاتيح',{send:true,weight:1.55,testID:'clipi-keyboard-send'})}
    </View>
  </View>;
}
const s=StyleSheet.create({
  keyboard:{paddingHorizontal:3,paddingTop:5,paddingBottom:4,backgroundColor:'#d9dce1',gap:5,direction:'ltr'},
  row:{flexDirection:'row',direction:'ltr',gap:3,alignItems:'stretch'},
  key:{minWidth:0,flexBasis:0,justifyContent:'center',alignItems:'center',borderRadius:5,borderBottomWidth:1,borderBottomColor:'#9a9da3',backgroundColor:'#fff'},
  modifier:{backgroundColor:'#bec3cb'},selected:{backgroundColor:'#f8fafc'},send:{backgroundColor:'#f44724',borderBottomColor:'#c53416'},dim:{opacity:.54},pressed:{backgroundColor:'#e3e6ea'},
  letter:{fontSize:21,color:'#181b1e',textAlign:'center',includeFontPadding:false},word:{fontSize:14,fontWeight:'600'},light:{color:'#fff'}
});
