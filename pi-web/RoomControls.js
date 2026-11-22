import React, {useRef, useState} from 'react';
import {Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

export function RoomAction({icon, label, active, onPress}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={active==null?undefined:{selected:active}} onPress={onPress}
    style={[s.action,active&&s.active]}>
    <Text style={[s.glyph,active&&s.activeGlyph]}>{icon}</Text>
  </TouchableOpacity>;
}

export function RoomOption({title, onPress, color}) {
  return <TouchableOpacity accessibilityRole="button" style={[s.option,color&&{backgroundColor:color}]} onPress={onPress}>
    <Text style={s.optionText}>{title}</Text>
  </TouchableOpacity>;
}

export function RoomGiftSheet({visible, gifts, allLabel, translate, copy, recipient, balance, onClose, onSend, children}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <TouchableOpacity accessible={false} style={StyleSheet.absoluteFillObject} onPress={onClose}/>
      {visible&&<GiftPanel gifts={gifts} allLabel={allLabel} translate={translate} copy={copy}
        recipient={recipient} balance={balance} onClose={onClose} onSend={onSend}>{children}</GiftPanel>}
    </View>
  </Modal>;
}

function GiftPanel({gifts, allLabel, translate, copy, recipient, balance, onClose, onSend, children}) {
  const [category,setCategory]=useState(allLabel);
  const [selected,setSelected]=useState(null);
  const [pending,setPending]=useState(false);
  const sending=useRef(false);
  const categories=[allLabel,...new Set(gifts.map(gift=>gift[4]))];
  async function send(){
    if(!selected||sending.current)return;
    sending.current=true;
    setPending(true);
    try{await onSend(selected)}finally{sending.current=false;setPending(false)}
  }
  return <View style={s.sheet}>
    <View style={s.sheetHeading}>
      <View style={{flex:1}}>
        <Text accessibilityRole="header" style={s.title}>{copy.title}</Text>
        <Text numberOfLines={1} style={s.sub}>{recipient}</Text>
      </View>
      <RoomAction icon="×" label={copy.close} onPress={onClose}/>
    </View>
    <ScrollView horizontal style={s.tabs} showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabContent}>
      {categories.map(item=><TouchableOpacity key={item} accessibilityRole="tab"
        accessibilityState={{selected:category===item}} onPress={()=>setCategory(item)} style={[s.tab,category===item&&s.active]}>
        <Text style={[s.sub,category===item&&s.activeGlyph]}>{translate(item)}</Text>
      </TouchableOpacity>)}
    </ScrollView>
    <ScrollView style={s.catalog} contentContainerStyle={s.grid} keyboardShouldPersistTaps="handled">
      {gifts.filter(gift=>category===allLabel||category===gift[4]).map(gift=>
        <TouchableOpacity key={gift[1]} accessibilityRole="button" accessibilityState={{selected:selected===gift}}
          onPress={()=>setSelected(gift)} style={[s.gift,selected===gift&&s.selectedGift]}>
          <Text style={s.giftIcon}>{gift[0]}</Text>
          <Text numberOfLines={2} style={s.giftName}>{translate(gift[1])}</Text>
          <Text style={s.price}>{gift[2]} 💎</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
    {children}
    <View style={s.footer}>
      <Text style={s.sub}>{copy.share&&selected?copy.share(selected[2])+" · ":""}{copy.balance} · {balance??'…'} 💎</Text>
      <TouchableOpacity disabled={!selected||pending} accessibilityRole="button"
        accessibilityState={{disabled:!selected||pending,busy:pending}}
        style={[s.send,(!selected||pending)&&s.disabled]} onPress={send}>
        <Text style={s.sendText}>{pending?copy.sending:copy.send}</Text>
      </TouchableOpacity>
    </View>
  </View>;
}

const s=StyleSheet.create({
  action:{width:40,height:42,borderRadius:13,backgroundColor:'transparent',alignItems:'center',justifyContent:'center'},
  glyph:{fontSize:19,fontWeight:'800',color:'#f3fff8',textShadowColor:'#100b18',textShadowOffset:{width:0,height:1},textShadowRadius:4},
  active:{backgroundColor:'transparent'},
  activeGlyph:{color:'#ffdc86',fontWeight:'800'},
  option:{width:"47%",minHeight:46,padding:8,borderRadius:12,backgroundColor:"#244741",justifyContent:"center"},
  optionText:{color:"#effff5",fontSize:13,fontWeight:"700",textAlign:"center"},
  overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'#07191460'},
  sheet:{backgroundColor:'#132e2b',borderTopLeftRadius:22,borderTopRightRadius:22,padding:12,maxHeight:'64%'},
  sheetHeading:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8},
  title:{fontSize:18,fontWeight:'800',color:'#effff5'},
  sub:{fontSize:12,color:'#d3ede1'},
  tabs:{flexGrow:0,maxHeight:43,marginBottom:8},
  tabContent:{alignItems:'center',gap:6},
  tab:{backgroundColor:'#244741',paddingVertical:8,paddingHorizontal:11,borderRadius:12},
  catalog:{maxHeight:234,minHeight:80},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},
  gift:{width:'24%',minHeight:83,marginBottom:5,backgroundColor:'#1d3d36',borderWidth:1,borderColor:'#315950',borderRadius:10,padding:4,alignItems:'center'},
  selectedGift:{borderColor:'#a7e3c7',backgroundColor:'#2a5549'},
  giftIcon:{fontSize:23},
  giftName:{fontSize:10,fontWeight:'700',color:'#effff5',textAlign:'center'},
  price:{fontSize:10,color:'#bbefd9',marginTop:3},
  footer:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:8},
  send:{minHeight:40,justifyContent:'center',paddingHorizontal:16,backgroundColor:'#a7e3c7',borderRadius:10},
  sendText:{color:'#ffdc86',fontWeight:'800'},
  disabled:{opacity:.48},
});
