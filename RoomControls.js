import GiftMark from './GiftMark';
import {theme} from './ClipiTheme';
import React, {useRef, useState} from 'react';
import {Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

export function RoomAction({icon, label, active, onPress,children}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={active==null?undefined:{selected:active}} onPress={onPress}
    style={[s.action,active&&s.active]}>
    {children||<Text style={[s.glyph,active&&s.activeGlyph]}>{icon}</Text>}
  </TouchableOpacity>;
}

export function RoomOption({title, onPress, disabled}) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} style={[s.option,disabled&&s.disabled]} onPress={onPress}>
    <Text style={s.optionText}>{title}</Text>
  </TouchableOpacity>;
}

export function RoomGiftSheet({visible, recipientKey, gifts, allLabel, translate, copy, recipient, recipientReady, recipientAvatar, balance, onWallet, onShop, onClose, onSend, children}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <TouchableOpacity accessible={false} style={StyleSheet.absoluteFillObject} onPress={onClose}/>
      {visible&&<GiftPanel key={recipientKey} gifts={gifts} allLabel={allLabel} translate={translate} copy={copy}
        recipient={recipient} recipientReady={recipientReady} recipientAvatar={recipientAvatar} onWallet={onWallet} onShop={onShop} balance={balance} onClose={onClose} onSend={onSend}>{children}</GiftPanel>}
    </View>
  </Modal>;
}

function GiftPanel({gifts, allLabel, translate, copy, recipient, recipientReady, recipientAvatar, balance, onWallet, onShop, onClose, onSend, children}) {
  const [category,setCategory]=useState(allLabel);
  const [selected,setSelected]=useState(null);
  const [pending,setPending]=useState(false);
  const sending=useRef(false);
  const categories=[allLabel,...new Set(gifts.map(gift=>gift[4]))];
  const insufficient=selected&&Number.isSafeInteger(balance)&&balance<selected[2];
  const canSend=Boolean(selected && recipientReady && !pending);
  async function send(){
    if(!canSend||sending.current)return;
    sending.current=true;
    setPending(true);
    try{await onSend(selected)}finally{sending.current=false;setPending(false)}
  }
  return <View style={s.sheet}>
    <View style={s.sheetHeading}>
      {recipientAvatar?.startsWith('data:image/jpeg;base64,')
        ?<Image accessibilityLabel={recipient} source={{uri:recipientAvatar}} style={{width:44,height:44,borderRadius:22}}/>
        :<Text accessibilityLabel={recipient} style={{fontSize:27}}>{recipientAvatar||'👤'}</Text>}
      <View style={{flex:1}}>
        <Text accessibilityRole="header" style={s.title}>{copy.title}</Text>
        <Text numberOfLines={1} style={s.sub}>{recipient}</Text>
      </View>
      <RoomAction icon="×" label={copy.close} onPress={onClose}/>
    </View>
    <ScrollView horizontal style={s.tabs} showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabContent}>
      {categories.map(item=><TouchableOpacity key={item} accessibilityRole="tab"
        disabled={pending} accessibilityState={{selected:category===item}} onPress={()=>{
          setCategory(item);
          if(item!==allLabel&&selected?.[4]!==item)setSelected(null);
        }} style={[s.tab,category===item&&s.active]}>
        <Text style={[s.sub,category===item&&s.activeGlyph]}>{translate(item)}</Text>
      </TouchableOpacity>)}
    </ScrollView>
    <ScrollView style={s.catalog} contentContainerStyle={s.grid} keyboardShouldPersistTaps="handled">
      {gifts.filter(gift=>category===allLabel||category===gift[4]).map(gift=>
        <TouchableOpacity key={gift[1]} accessibilityRole="button" accessibilityState={{selected:selected===gift}}
          disabled={pending} onPress={()=>setSelected(gift)} style={[s.gift,selected===gift&&s.selectedGift]}>
          {selected===gift&&<Text accessible={false} style={s.check}>✓</Text>}
          <GiftMark gift={gift} size={25}/>
          <Text numberOfLines={2} style={s.giftName}>{translate(gift[1])}</Text>
          <Text style={s.price}>{gift[2]} 💎</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
    {children}
    {insufficient&&<Text accessibilityLiveRegion="polite" style={s.sub}>{translate("رصيد الماس المشترى غير كافٍ")}</Text>}
    <View style={s.footer}>
      <TouchableOpacity accessibilityRole="button" disabled={pending} onPress={onWallet} style={s.edgeAction}>
        <Text style={s.walletText}>{copy.wallet}</Text>
      </TouchableOpacity>
      <View style={s.funds}>
        <Text style={s.balance}>{copy.balance} · {balance??'…'} 💎</Text>
        {onShop&&<TouchableOpacity accessibilityRole="button" disabled={pending} onPress={onShop} style={s.shop}>
          <Text style={s.shopText}>{copy.shop}</Text>
        </TouchableOpacity>}
      </View>
      <TouchableOpacity accessibilityRole="button" disabled={!canSend}
        accessibilityState={{disabled:!canSend,busy:pending}}
        style={s.edgeAction} onPress={send}>
        <Text style={[s.sendText,!canSend&&s.inactive]}>{copy.send}</Text>
      </TouchableOpacity>
    </View>
  </View>;
}

const s=StyleSheet.create({
  action:{width:40,height:42,borderRadius:13,backgroundColor:'transparent',alignItems:'center',justifyContent:'center'},
  glyph:{fontSize:19,fontWeight:'800',color:theme.accent,},
  active:{backgroundColor:'transparent',borderBottomColor:theme.accent},
  activeGlyph:{color:theme.accent,fontWeight:'800'},
  option:{width:'100%',minHeight:44,padding:8,borderRadius:0,backgroundColor:'transparent',justifyContent:"center",borderBottomWidth:1,borderBottomColor:theme.line,alignItems:'stretch',paddingHorizontal:4,paddingVertical:8},
  optionText:{color:theme.ink,fontSize:15,fontWeight:'600',textAlign:'auto'},
  overlay:{flex:1,justifyContent:'flex-end',backgroundColor:theme.scrim},
  sheet:{backgroundColor:theme.paper,borderTopLeftRadius:26,borderTopRightRadius:26,padding:14,maxHeight:'72%',borderWidth:1,borderColor:theme.line},
  sheetHeading:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8},
  title:{fontSize:20,fontWeight:'800',color:theme.ink},
  sub:{fontSize:12,color:theme.secondary},
  tabs:{flexGrow:0,maxHeight:43,marginBottom:8},
  tabContent:{alignItems:'center',gap:6},
  tab:{backgroundColor:'transparent',paddingVertical:8,paddingHorizontal:11,borderRadius:0,borderBottomWidth:1,borderBottomColor:theme.line},
  catalog:{maxHeight:234,minHeight:80},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},
  gift:{width:'24%',minHeight:83,marginBottom:5,backgroundColor:theme.canvas,borderWidth:1,borderColor:theme.line,borderRadius:12,padding:4,alignItems:'center'},
  check:{position:'absolute',top:2,right:5,color:theme.accent,fontSize:15,fontWeight:'900'},
  selectedGift:{borderColor:theme.accent,backgroundColor:theme.mint},
  giftIcon:{fontSize:23},
  giftName:{fontSize:12,fontWeight:'700',color:theme.ink,textAlign:'center'},
  price:{fontSize:11,color:theme.secondary,marginTop:3},
  footer:{direction:'ltr',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,
    marginTop:8,paddingTop:5,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:theme.line},
  edgeAction:{minWidth:44,minHeight:44,paddingHorizontal:6,alignItems:'center',justifyContent:'center',backgroundColor:'transparent'},
  funds:{flex:1,alignItems:'center',justifyContent:'center'},
  balance:{color:theme.ink,fontSize:12,textAlign:'center'},
  walletText:{color:theme.accent,fontSize:14,fontWeight:'700'},
  sendText:{color:theme.accent,fontSize:15,fontWeight:'800'},
  inactive:{color:theme.secondary},
  shop:{paddingHorizontal:8,paddingVertical:4},shopText:{color:theme.gold,fontSize:12,fontWeight:'700'},
  disabled:{opacity:.48},
});
