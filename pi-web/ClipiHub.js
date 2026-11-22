import React from 'react';
import {Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';

const ink = '#182e32';
const muted = '#52696b';
const accent = '#0b654e';
const covers = ['#d0eadf', '#dce6f9', '#f6e2d0', '#e9e1f2'];

export function ClipiDock({items, page, onNavigate}) {
  return <View style={s.dock}>
    {items.map(({id, icon, label}) => {
      const active = id === page;
      const create = id === 'create';
      return <TouchableOpacity key={id} accessibilityRole="tab" accessibilityState={{selected:active}}
        style={s.dockItem} onPress={()=>onNavigate(id)}>
        <Text style={[s.dockIcon,active&&s.active,create&&s.createIcon]}>{icon}</Text>
        <Text numberOfLines={1} style={[s.dockLabel,active&&s.active]}>{label}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

export function HubScreen({title, action, children, dock}) {
  return <View style={s.screen}>
    <StatusBar barStyle="dark-content" backgroundColor="#f5f7f2"/>
    <View style={s.header}>
      <Text accessibilityRole="header" style={s.heading}>{title}</Text>
      {action&&<TouchableOpacity accessibilityRole="button" style={s.headerAction} onPress={action.onPress}>
        <Text style={s.actionText}>{action.label}</Text>
      </TouchableOpacity>}
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView>
    {dock}
  </View>;
}

export function RoomDiscovery({copy, userId, rooms, error, filter, onFilter, search, onSearch, onCreate, onEnter, onClose, showWelcome}) {
  const tabs = [['all',copy.all],['audio',copy.voice],['video',copy.live]];
  return <>
    <TouchableOpacity accessibilityRole="button" style={s.hero} onPress={onCreate}>
      <View style={s.heroBody}>
        <Text style={s.heroTitle}>{copy.create}</Text>
        <Text style={s.heroNote}>{copy.createNote}</Text>
      </View>
      <Text style={s.heroPlus}>+</Text>
    </TouchableOpacity>
    <View style={s.filters}>
      {tabs.map(([id,title])=><TouchableOpacity key={id} accessibilityRole="tab" accessibilityState={{selected:filter===id}}
        style={[s.filter,filter===id&&s.selectedFilter]} onPress={()=>onFilter(id)}>
        <Text style={[s.filterLabel,filter===id&&s.active]}>{title}</Text>
      </TouchableOpacity>)}
    </View>
    <TextInput accessibilityLabel={copy.search} style={s.search} placeholder={copy.search} placeholderTextColor={muted}
      autoCorrect={false} value={search} onChangeText={onSearch}/>
    {error?<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>
      :rooms.length===0?<View style={s.empty}><Text style={s.emptyTitle}>{copy.empty}</Text></View>
      :<View style={s.grid}>{rooms.map((room,index)=>{
        const video=room.type==='video';
        return <View key={room.id} style={s.roomCard}>
          <TouchableOpacity accessibilityRole="button" onPress={()=>onEnter(room)}>
            <View style={[s.cover,{backgroundColor:covers[index%covers.length]}]}>
              <View pointerEvents="none" style={s.coverCircle}/>
              <View pointerEvents="none" style={s.coverRing}/>
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

export function AccountHub({name, avatar, number, balance, copy, shortcuts, settings}) {
  return <>
    <View style={s.account}>
      <View style={s.identity}>
        {avatar?.startsWith('data:image/')?<Image accessibilityLabel={copy.photo} source={{uri:avatar}} style={s.avatar}/>
        :<View style={s.avatar}><Text style={s.avatarIcon}>{avatar||'👤'}</Text></View>}
        <View style={{flex:1}}>
          <Text style={s.cardTitle} numberOfLines={2}>{name}</Text>
          <Text style={s.secondary}>ID · {number??'…'}</Text>
        </View>
      </View>
      <View style={s.balance}>
        <Text style={s.secondary}>{copy.balance}</Text>
        <Text style={s.balanceValue}>💎 {balance??'…'}</Text>
      </View>
    </View>
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
  screen:{flex:1,backgroundColor:'#f5f7f2'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:14,paddingBottom:10},
  heading:{fontSize:26,fontWeight:'800',color:ink,flexShrink:1},
  headerAction:{borderRadius:12,backgroundColor:'#e3eee6',paddingHorizontal:13,paddingVertical:10},
  actionText:{color:accent,fontWeight:'700'},
  content:{width:'100%',maxWidth:680,alignSelf:'center',paddingHorizontal:14,paddingTop:4,paddingBottom:20},
  hero:{backgroundColor:'#173d36',flexDirection:'row',alignItems:'center',borderRadius:20,padding:16,minHeight:88,marginBottom:14},
  heroBody:{flex:1},
  heroTitle:{color:'#f6fff9',fontSize:20,fontWeight:'800'},
  heroNote:{color:'#bce4d3',fontSize:13,marginTop:4},
  heroPlus:{color:'#173d36',backgroundColor:'#9dddbd',borderRadius:14,width:40,height:40,textAlign:'center',lineHeight:40,fontSize:28,marginHorizontal:3},
  filters:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:9},
  filter:{borderRadius:10,paddingHorizontal:12,paddingVertical:9,backgroundColor:'#eaf0e9'},
  selectedFilter:{backgroundColor:'#cdebdc'},
  filterLabel:{color:muted,fontWeight:'700',fontSize:13},
  active:{color:accent,fontWeight:'800'},
  search:{backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:'#d5e1d9',color:ink,padding:11,minHeight:42,marginBottom:12},
  empty:{padding:16,backgroundColor:'#fff',borderRadius:14},
  emptyTitle:{fontWeight:'800',color:ink},
  error:{padding:12,color:'#8c3043'},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},
  roomCard:{width:'48.5%',backgroundColor:'#fff',borderRadius:15,overflow:'hidden',marginBottom:10,borderWidth:1,borderColor:'#e0e8e1'},
  cover:{height:106,overflow:'hidden',justifyContent:'center',alignItems:'center'},
  coverCircle:{position:'absolute',width:98,height:98,borderRadius:49,backgroundColor:'#ffffff63',top:-38,right:-4},
  coverRing:{position:'absolute',width:92,height:92,borderRadius:46,borderWidth:13,borderColor:'#ffffff67',left:-32,bottom:-41},
  coverIcon:{color:accent,fontSize:33,fontWeight:'700',marginBottom:14},
  coverLabel:{position:'absolute',bottom:7,left:8,color:ink,backgroundColor:'#ffffffd9',borderRadius:6,paddingHorizontal:6,paddingVertical:3,fontSize:11,fontWeight:'800'},
  cardText:{padding:10,minHeight:64},
  cardTitle:{fontSize:15,color:ink,fontWeight:'800'},
  secondary:{fontSize:13,color:muted,marginTop:3},
  manage:{borderTopWidth:1,borderColor:'#e4ede5',padding:9},
  manageText:{color:'#8c3043',fontSize:13,fontWeight:'700'},
  welcome:{marginTop:12,borderRadius:14,backgroundColor:'#e4efe3',padding:13},
  dock:{flexDirection:'row',backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#dce6df',paddingTop:7,paddingBottom:9,paddingHorizontal:5},
  dockItem:{alignItems:'center',justifyContent:'center',flex:1,minHeight:48},
  dockIcon:{color:muted,fontSize:22,lineHeight:27,fontWeight:'700'},
  dockLabel:{color:muted,fontWeight:'600',fontSize:10},
  createIcon:{backgroundColor:'#cdebdc',color:accent,borderRadius:11,minWidth:34,textAlign:'center'},
  account:{backgroundColor:'#fff',borderRadius:18,padding:14,marginBottom:12},
  identity:{flexDirection:'row',alignItems:'center',gap:11},
  avatar:{width:58,height:58,borderRadius:18,backgroundColor:'#dceee3',justifyContent:'center',alignItems:'center'},
  avatarIcon:{fontSize:28},
  balance:{marginTop:12,borderRadius:12,backgroundColor:'#e6f0e7',padding:11},
  balanceValue:{color:ink,fontWeight:'800',fontSize:18,marginTop:3},
  shortcuts:{flexDirection:'row',gap:7,marginBottom:12},
  shortcut:{flex:1,backgroundColor:'#fff',borderRadius:13,padding:9,alignItems:'center',minHeight:66,justifyContent:'center'},
  shortcutIcon:{fontSize:20,color:accent,fontWeight:'800'},
  shortcutLabel:{color:ink,fontSize:11,fontWeight:'700',textAlign:'center'},
  rows:{backgroundColor:'#fff',borderRadius:14,overflow:'hidden',marginBottom:12},
  row:{padding:13,borderBottomWidth:1,borderBottomColor:'#e9eee9',flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:46},
  rowLabel:{color:ink,fontWeight:'700',flexShrink:1},
});
