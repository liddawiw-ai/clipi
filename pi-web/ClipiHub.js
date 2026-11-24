import {ui as appText} from './interface-language.mjs';
import {HostLevels} from './RoomHostCard';
import {theme} from './ClipiTheme';
import {FeedIcon} from './FeedControls';
import GoldFrame from './GoldFrame';
import React,{useEffect,useRef,useState} from 'react';
import {Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';

const ink = theme.ink;
const muted = theme.secondary;
const accent = theme.accent;
const covers = ['#d0eadf', '#dce6f9', '#f6e2d0', '#e9e1f2'];

export function ClipiDock({items, page, onNavigate}) {
  return <div className="clipi-dock" role="tablist">
    {items.map(({id,label})=><button type="button" key={id} role="tab" aria-selected={id===page}
      data-create={id==='create'} onClick={()=>onNavigate(id)}>
      <span><FeedIcon name={id} size={id==='create'?20:23}/></span><span>{label}</span>
    </button>)}
  </div>;
}

export function HubScreen({title, action, children, dock}) {
  return <View style={s.screen}>
    <StatusBar barStyle="dark-content" backgroundColor="#f5f7f2"/>
    <View style={s.header}>
      <Text accessibilityRole="header" style={s.heading}>{title==="Clipi"?appText("Live Clipi"):title}</Text>
      {action&&<TouchableOpacity accessibilityRole="button" style={s.headerAction} onPress={action.onPress}>
        <Text style={s.actionText}>{action.label}</Text>
      </TouchableOpacity>}
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView>
    {dock}
  </View>;
}

export function RoomDiscovery({hostField,copy, userId, rooms, error, filter, onFilter, search, onSearch, onCreate, onEnter, onClose, showWelcome, busy=false}) {
  const tabs = [['all',copy.all],['audio',copy.voiceRooms],['video',copy.live]];
  return <>
    <View accessibilityRole="tablist" style={s.filters}>
      {tabs.map(([id,title])=><TouchableOpacity key={id} accessibilityRole="tab" aria-selected={filter===id} disabled={busy} accessibilityState={{selected:filter===id,disabled:busy}}
        style={[s.filter,filter===id&&s.selectedFilter]} onPress={()=>onFilter(id)}>
        <Text style={[s.filterLabel,filter===id&&s.active]}>{title}</Text>
      </TouchableOpacity>)}
    </View>
    {hostField}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={appText(copy.create)} aria-busy={busy} accessibilityState={{disabled:busy,busy}} disabled={busy} style={s.hero} onPress={onCreate}>
      <Image accessible={false} resizeMode="cover" style={s.heroImage} source={require('./assets/live-studio.jpg')}/>
      <View style={s.heroBody}>
        <Text style={s.heroTitle}>{appText(copy.create)}</Text>
        {!!copy.createNote&&<Text style={s.heroNote}>{appText(copy.createNote)}</Text>}
        <Text accessibilityElementsHidden style={s.heroPlus}>+</Text>
      </View>
    </TouchableOpacity>
    <TextInput accessibilityLabel={appText(copy.search)} style={s.search} placeholder={appText(copy.search)} placeholderTextColor={muted}
      autoCorrect={false} value={search} onChangeText={onSearch}/>
    {error?<Text accessibilityLiveRegion="polite" style={s.error}>{appText(error)}</Text>
      :rooms.length===0?<View style={s.empty}><Text style={s.emptyTitle}>{appText(copy.empty)}</Text></View>
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
            <Text style={s.manageText}>{appText(copy.close)}</Text>
          </TouchableOpacity>}
        </View>;
      })}</View>}
    {showWelcome&&<View style={s.welcome}><Text style={s.emptyTitle}>{appText(copy.welcome)}</Text><Text style={s.secondary}>{appText(copy.welcomeNote)}</Text></View>}
  </>;
}

export function AccountPhoto({avatar,label,onPress}){
  const image=avatar?.startsWith('data:image/')?<Image source={{uri:avatar}} style={s.avatar}/>
    :<View style={s.avatar}><Text style={s.avatarIcon}>{avatar||'👤'}</Text></View>;
  if(!onPress)return <View accessible accessibilityLabel={label} style={s.photoButton}>{image}</View>;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.photoButton}>
    {image}<View pointerEvents="none" style={s.editBadge}><Text style={s.editGlyph}>✎</Text></View>
  </TouchableOpacity>;
}

function IdentityCard({name,avatar,number,onPhoto,photoLabel,followAction,children}){
  return <View style={s.account}><GoldFrame tone="apricot"/>
    <View style={s.identity}>
      <View style={s.photoColumn}><AccountPhoto avatar={avatar} onPress={onPhoto} label={photoLabel}/>{followAction}</View>
      <View style={{flex:1}}>
        <Text style={s.profileName} numberOfLines={2}>{name}</Text>
        {(number!=null||onPhoto)&&<Text style={s.profileId}>{appText('معرّف الحساب')} · {number??'…'}</Text>}
      </View>
    </View>
    {children}
  </View>;
}

function SocialAccountCard({socialProfile,labels,...identity}){
  const {request,owner,viewer,followRevision,onFollowChange}=socialProfile;
  const [state,setState]=useState(null),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const generation=useRef(0),mounted=useRef(false),writing=useRef(false);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    const version=++generation.current;
    request('/account-number',{op:'shortProfileSocial',owner}).then(result=>{
      if(mounted.current&&generation.current===version){setState(result);setError('');}
    }).catch(e=>{if(mounted.current&&generation.current===version)setError(e.message||labels.retry);});
    return ()=>{generation.current++;};
  },[request,owner,viewer,followRevision,attempt,labels.retry]);

  async function toggle(){
    if(!state||owner===viewer||writing.current)return;
    writing.current=true;generation.current++;setSaving(true);setError('');
    try{
      const result=await request('/account-number',{op:'shortProfileFollow',owner,following:!state.following});
      if(mounted.current){generation.current++;setState(result);}
      onFollowChange();
    }catch(e){if(mounted.current)setError(e.message||labels.retry);}
    finally{writing.current=false;if(mounted.current)setSaving(false);}
  }
  const followAction=owner!==viewer&&<TouchableOpacity accessibilityRole="button"
    accessibilityState={{selected:!!state?.following,disabled:!state||saving}} disabled={!state||saving} onPress={toggle} style={s.followAction}>
    <Text style={s.followText}>{state?.following?labels.followed:labels.follow}</Text>
  </TouchableOpacity>;
  return <IdentityCard {...identity} number={identity.number??state?.number} followAction={followAction}>
    <View style={s.socialCounts}>{['friends','followers','followingCount'].map(key=><View key={key} accessible
      accessibilityLabel={labels[key]+' '+(state?.[key]??'…')} style={s.socialCount}>
      <Text style={s.socialValue}>{state?.[key]??'…'}</Text><Text style={s.socialLabel}>{labels[key]}</Text>
    </View>)}</View>
    <HostLevels key={owner} owner={owner} request={request} locale={socialProfile.locale} initialOpen={socialProfile.fromRoom}/>
    {!!error&&<View><Text accessibilityRole="alert" style={s.socialLabel}>{appText(error)}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={()=>setAttempt(n=>n+1)} style={s.followAction}><Text style={s.followText}>{appText(labels.retry)}</Text></TouchableOpacity>
    </View>}
  </IdentityCard>;
}

export function AccountHub({children,onPhoto,photoLabel,name,avatar,number,balance,copy,shortcuts,settings,socialProfile,compactShortcuts=false,unit="💎"}) {
  const identity={name,avatar,number,onPhoto,photoLabel:photoLabel||copy.photo};
  return <>
    {socialProfile?<SocialAccountCard key={JSON.stringify([socialProfile.viewer,socialProfile.owner])}
      {...identity} labels={copy} socialProfile={socialProfile}/>:
      <IdentityCard {...identity}><View style={s.balance}>
        <Text style={s.secondary}>{appText(copy.balance)}</Text>
        <Text style={s.balanceValue}>{unit} {balance??'…'}</Text>
      </View></IdentityCard>}
    {!!shortcuts?.length&&<View style={[s.shortcuts, compactShortcuts && s.compactShortcuts]}>{shortcuts.map(item=><TouchableOpacity key={item.label} accessibilityRole="button"
      style={[s.shortcut, compactShortcuts && s.compactShortcut]} onPress={item.onPress}>
      <Text style={s.shortcutIcon}>{item.icon}</Text><Text style={s.shortcutLabel}>{item.label}</Text>
    </TouchableOpacity>)}</View>}
    {settings?.length > 0 && <HubRows items={settings}/>}
    {children}
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
  photoColumn:{alignItems:'center'},
  socialCounts:{flexDirection:'row',alignItems:'flex-start',marginTop:14},
  socialCount:{flex:1,minWidth:0,alignItems:'center',paddingHorizontal:2},
  socialValue:{color:ink,fontSize:20,fontWeight:'800',textAlign:'center'},
  socialLabel:{color:ink,fontSize:14,textAlign:'center'},
  followAction:{minHeight:44,minWidth:52,alignItems:'center',justifyContent:'center',backgroundColor:'transparent'},
  followText:{fontWeight:'700',color:accent,textAlign:'center'},
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
  profileName:{color:theme.ink,fontWeight:'800',fontSize:22},profileId:{color:theme.secondary,marginTop:3},account:{overflow:'hidden',backgroundColor:theme.paper,borderRadius:22,padding:19,marginBottom:12,minHeight:172},
  identity:{flexDirection:'row',alignItems:'center',gap:11},
  avatar:{width:64,height:64,borderRadius:32,borderWidth:2,borderColor:theme.brass,backgroundColor:theme.paper,justifyContent:'center',alignItems:'center'},
  avatarIcon:{fontSize:28},
  balance:{marginTop:12,borderRadius:12,backgroundColor:theme.glass,padding:11},
  balanceValue:{color:ink,fontWeight:'800',fontSize:18,marginTop:3},
  shortcuts:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12},
  shortcut:{flexGrow:1,flexBasis:'22%',backgroundColor:theme.paper,borderRadius:13,padding:9,alignItems:'center',minHeight:66,justifyContent:'center',borderWidth:1,borderColor:theme.line},
  compactShortcuts:{gap:4},
  compactShortcut:{flexBasis:'14.5%',minWidth:44,paddingHorizontal:2},
  shortcutIcon:{fontSize:20,color:accent,fontWeight:'800'},
  shortcutLabel:{alignSelf:'stretch',color:ink,fontSize:11,fontWeight:'700',textAlign:'center'},
  rows:{backgroundColor:'transparent',borderRadius:14,overflow:'hidden',marginBottom:12},
  row:{padding:13,borderBottomWidth:1,borderBottomColor:theme.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:51,backgroundColor:'transparent'},
  rowLabel:{color:ink,fontWeight:'700',flexShrink:1},
});
