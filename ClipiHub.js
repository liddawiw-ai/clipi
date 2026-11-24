import {theme} from './ClipiTheme';
import GoldFrame from './GoldFrame';
import React from 'react';
import {Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';

const ink = theme.ink;
const muted = theme.secondary;
const accent = theme.accent;
const covers = ['#d0eadf', '#dce6f9', '#f6e2d0', '#e9e1f2'];

export function ClipiDock({items, page, onNavigate}) {
  return <View style={[s.dock,page==='home'&&{backgroundColor:'#050505',borderTopColor:'#151515',direction:'ltr',flexDirection:'row-reverse'}]}>
    {items.map(({id, icon, label}) => {
      const active = id === page;
      const create = id === 'create';
      return <TouchableOpacity key={id} accessibilityRole="tab" accessibilityState={{selected:active}}
        style={s.dockItem} onPress={()=>onNavigate(id)}>
        <Text style={[s.dockIcon,active&&s.active,create&&s.createIcon,page==='home'&&{color:active||create?'#fff':'#bbb',backgroundColor:'transparent'},create&&page==='home'&&{borderWidth:2,borderColor:'#fff',borderRadius:18}]}>{icon}</Text>
        <Text numberOfLines={1} style={[s.dockLabel,active&&s.active,page==='home'&&{color:active?'#fff':'#bbb'}]}>{label}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

export function HubScreen({title, action, children, dock, scrollable=true}) {
  return <View style={s.screen}>
    <StatusBar barStyle="dark-content" backgroundColor="#f5f7f2"/>
    <View style={s.header}>
      <Text accessibilityRole="header" style={s.heading}>{title==="Clipi"?"Live Clipi":title}</Text>
      {action&&<TouchableOpacity accessibilityRole="button" style={s.headerAction} onPress={action.onPress}>
        <Text style={s.actionText}>{action.label}</Text>
      </TouchableOpacity>}
    </View>
    {scrollable?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView>:children}
    {dock}
  </View>;
}

export function RoomDiscovery({copy, userId, rooms, error, filter, onFilter, search, onSearch, onCreate, onEnter, onClose, showWelcome}) {
  const tabs = [['all',copy.all],['audio',copy.voice],['video',copy.live]];
  return <>
    <View style={s.filters}>
      {tabs.map(([id,title])=><TouchableOpacity key={id} accessibilityRole="tab" accessibilityState={{selected:filter===id}}
        style={[s.filter,filter===id&&s.selectedFilter]} onPress={()=>onFilter(id)}>
        <Text style={[s.filterLabel,filter===id&&s.active]}>{title}</Text>
      </TouchableOpacity>)}
    </View>
    <TouchableOpacity accessibilityRole="button" style={s.hero} onPress={onCreate}>
      <Image accessible={false} resizeMode="cover" style={s.heroImage} source={require('./assets/live-studio.jpg')}/>
      <View style={s.heroBody}>
        <Text style={s.heroTitle}>{copy.create}</Text>
        <Text style={s.heroNote}>{copy.createNote}</Text>
        <Text accessibilityElementsHidden style={s.heroPlus}>+</Text>
      </View>
    </TouchableOpacity>
    <TextInput accessibilityLabel={copy.search} style={s.search} placeholder={copy.search} placeholderTextColor={muted}
      autoCorrect={false} value={search} onChangeText={onSearch}/>
    {error?<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>
      :rooms.length===0?<View style={s.empty}><Text style={s.emptyTitle}>{copy.empty}</Text></View>
      :<View style={s.grid}>{rooms.map((room,index)=>{
        const video=room.type==='video';
        return <View key={room.id} style={s.roomCard}>
          <TouchableOpacity accessibilityRole="button" onPress={()=>onEnter(room)}>
            <View style={[s.cover,{backgroundColor:covers[index%covers.length]}]}>
              <GoldFrame tone={video?'apricot':'lilac'}/>
              <Text accessibilityElementsHidden importantForAccessibility="no" style={s.coverIcon}>{video?'▸':'♫'}</Text>
              <Text style={s.coverLabel}>{video?copy.live:copy.voice}</Text>
            </View>
            <View style={s.cardText}>
              <Text numberOfLines={2} style={s.cardTitle}>{room.name||copy.untitled}</Text>
              {!!(room.ownerName||room.host)&&<Text numberOfLines={1} style={s.secondary}>{room.ownerName||room.host}</Text>}
            </View>
          </TouchableOpacity>
          {room.ownerUid===userId&&<TouchableOpacity accessibilityRole="button" style={s.manage} onPress={()=>onClose(room)}>
            <Text style={s.manageText}>{copy.close}</Text>
          </TouchableOpacity>}
        </View>;
      })}</View>}
    {showWelcome&&<View style={s.welcome}><Text style={s.emptyTitle}>{copy.welcome}</Text><Text style={s.secondary}>{copy.welcomeNote}</Text></View>}
  </>;
}

export function AccountPhoto({avatar,label,onPress}){
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.photoButton}>
    {avatar?.startsWith('data:image/')?<Image source={{uri:avatar}} style={s.avatar}/>
      :<View style={s.avatar}><Text style={s.avatarIcon}>{avatar||'👤'}</Text></View>}
    <View pointerEvents="none" style={s.editBadge}><Text style={s.editGlyph}>✎</Text></View>
  </TouchableOpacity>;
}

export function AccountHub({children,onPhoto,photoLabel,name, avatar, number, balance, copy, shortcuts, settings, unit="💎"}) {
  return <>
    <View style={s.account}><GoldFrame tone="apricot"/>
      <View style={s.identity}>
        <AccountPhoto avatar={avatar} onPress={onPhoto} label={photoLabel||copy.photo}/>
        <View style={{flex:1}}>
          <Text style={s.profileName} numberOfLines={2}>{name}</Text>
          <Text style={s.profileId}>ID · {number??'…'}</Text>
        </View>
      </View>
      <View style={s.balance}>
        <Text style={s.secondary}>{copy.balance}</Text>
        <Text style={s.balanceValue}>{unit} {balance??'…'}</Text>
      </View>
    </View>
    {children}
    <View style={s.shortcuts}>{shortcuts.map(item=><TouchableOpacity key={item.label} accessibilityRole="button"
      style={s.shortcut} onPress={item.onPress}>
      <Text style={s.shortcutIcon}>{item.icon}</Text><Text style={s.shortcutLabel}>{item.label}</Text>
    </TouchableOpacity>)}</View>
    <HubRows items={settings}/>
  </>;
}

export function HubRows({items}) {
  return <View style={s.rows}>
    {items.map(item=><TouchableOpacity key={item.label} accessibilityRole="button" style={s.row} onPress={item.onPress}>
      <Text style={[s.rowLabel,item.destructive&&s.manageText]}>{item.label}</Text>
      <Text style={s.secondary}>›</Text>
    </TouchableOpacity>)}
  </View>;
}

const s = StyleSheet.create({
  photoButton:{alignSelf:'center',position:'relative'},
  editBadge:{position:'absolute',bottom:-2,right:-2,width:23,height:23,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:theme.mint,borderWidth:2,borderColor:theme.paper},
  editGlyph:{color:theme.ink,fontWeight:'900',fontSize:13},
  screen:{flex:1,backgroundColor:theme.canvas},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingTop:14,paddingBottom:14},
  heading:{fontFamily:'serif',fontSize:30,fontWeight:'700',color:theme.ink,flexShrink:1},
  headerAction:{borderRadius:0,backgroundColor:'transparent',paddingHorizontal:3,paddingVertical:10,borderBottomWidth:1,borderBottomColor:theme.line},
  actionText:{color:accent,fontWeight:'700'},
  content:{width:'100%',maxWidth:680,alignSelf:'center',paddingHorizontal:14,paddingTop:4,paddingBottom:20},
  hero:{backgroundColor:theme.mint,direction:'ltr',flexDirection:'row',alignItems:'center',borderRadius:24,padding:16,minHeight:148,overflow:'hidden',marginBottom:14,borderWidth:1,borderColor:theme.line},
  heroImage:{position:'absolute',left:0,top:0,bottom:0,right:0,width:'100%',height:'100%'},
  heroBody:{position:'absolute',top:8,bottom:8,right:'5%',width:'51%',alignItems:'flex-end',justifyContent:'center'},
  heroTitle:{color:theme.ink,fontSize:25,fontWeight:'800'},
  heroNote:{color:theme.secondary,fontSize:13,marginTop:4},
  heroPlus:{borderWidth:1,borderColor:theme.line,color:theme.ink,backgroundColor:theme.paper,borderRadius:16,width:30,height:30,textAlign:'center',lineHeight:28,fontSize:23,marginTop:6},
  filters:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:9},
  filter:{borderWidth:1,borderColor:theme.line,borderRadius:20,paddingHorizontal:12,paddingVertical:9,backgroundColor:'transparent'},
  selectedFilter:{backgroundColor:theme.mint,borderColor:theme.accent},
  filterLabel:{color:muted,fontWeight:'700',fontSize:13},
  active:{color:accent,fontWeight:'800'},
  search:{backgroundColor:theme.paper,borderRadius:12,borderWidth:1,borderColor:theme.line,color:ink,padding:11,minHeight:42,marginBottom:12},
  empty:{padding:16,backgroundColor:theme.paper,borderRadius:14},
  emptyTitle:{fontWeight:'800',color:ink},
  error:{padding:12,color:theme.danger},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},
  roomCard:{width:'48.5%',backgroundColor:theme.paper,borderRadius:18,overflow:'hidden',marginBottom:10,borderWidth:1,borderColor:theme.line},
  cover:{height:116,overflow:'hidden',justifyContent:'center',alignItems:'center'},
  coverCircle:{position:'absolute',width:98,height:98,borderRadius:49,backgroundColor:theme.paper,top:-38,right:-4},
  coverRing:{position:'absolute',width:92,height:92,borderRadius:46,borderWidth:13,borderColor:theme.line,left:-32,bottom:-41},
  coverIcon:{color:theme.accent,fontSize:34,fontWeight:'700',marginBottom:14},
  coverLabel:{position:'absolute',bottom:7,left:8,color:theme.ink,backgroundColor:theme.paper,borderRadius:9,paddingHorizontal:8,paddingVertical:3,fontSize:11,fontWeight:'800'},
  cardText:{padding:10,minHeight:64},
  cardTitle:{fontSize:16,color:ink,fontWeight:'800'},
  secondary:{fontSize:13,color:theme.secondary,marginTop:3},
  manage:{borderTopWidth:1,borderColor:theme.line,padding:9},
  manageText:{color:theme.danger,fontSize:13,fontWeight:'700'},
  welcome:{marginTop:12,borderRadius:14,backgroundColor:theme.sand,padding:13},
  dock:{flexDirection:'row',backgroundColor:theme.paper,borderTopWidth:1,borderTopColor:theme.line,paddingTop:7,paddingBottom:9,paddingHorizontal:5},
  dockItem:{alignItems:'center',justifyContent:'center',flex:1,minHeight:48},
  dockIcon:{color:muted,fontSize:22,lineHeight:27,fontWeight:'700'},
  dockLabel:{color:muted,fontWeight:'600',fontSize:10},
  createIcon:{backgroundColor:theme.mint,color:theme.accent,borderRadius:11,minWidth:34,textAlign:'center'},
  profileName:{color:theme.ink,fontWeight:'800',fontSize:22},profileId:{color:theme.secondary,marginTop:3},account:{overflow:'hidden',backgroundColor:theme.paper,borderRadius:22,padding:19,marginBottom:12,minHeight:172},
  identity:{flexDirection:'row',alignItems:'center',gap:11},
  avatar:{width:64,height:64,borderRadius:32,borderWidth:2,borderColor:theme.brass,backgroundColor:theme.paper,justifyContent:'center',alignItems:'center'},
  avatarIcon:{fontSize:28},
  balance:{marginTop:12,borderRadius:12,backgroundColor:theme.glass,padding:11},
  balanceValue:{color:ink,fontWeight:'800',fontSize:18,marginTop:3},
  shortcuts:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12},
  shortcut:{flexGrow:1,flexBasis:'22%',backgroundColor:theme.paper,borderRadius:13,padding:9,alignItems:'center',minHeight:66,justifyContent:'center',borderWidth:1,borderColor:theme.line},
  shortcutIcon:{fontSize:20,color:accent,fontWeight:'800'},
  shortcutLabel:{color:ink,fontSize:11,fontWeight:'700',textAlign:'center'},
  rows:{backgroundColor:'transparent',borderRadius:14,overflow:'hidden',marginBottom:12},
  row:{padding:13,borderBottomWidth:1,borderBottomColor:theme.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:51,backgroundColor:'transparent'},
  rowLabel:{color:ink,fontWeight:'700',flexShrink:1},
});
