import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,Modal,ScrollView,StyleSheet,Text,TouchableOpacity,View} from 'react-native';
import {accountLabels} from './AccountLabels';
import {theme} from './ClipiTheme';

const levelSize=1000;

function DiamondTrack({label,caption,total,format}){
  const level=Math.floor(total/levelSize);
  const progress=total%levelSize;
  const progressText=format(progress)+' / '+format(levelSize);
  return <View style={s.trackSection}>
    <Text style={s.heading}>{label} · {format(level)}</Text>
    <View accessibilityRole="progressbar" accessibilityLabel={label}
      aria-valuemin={0} aria-valuemax={levelSize} aria-valuenow={progress} aria-valuetext={progressText} style={s.track}>
      <View style={[s.fill,{width:(progress/levelSize*100)+'%'}]}/>
    </View>
    <Text style={s.detail}>{caption} · {format(total)} 💎</Text>
    <Text style={s.fraction}>{progressText}</Text>
  </View>;
}

export default function RoomHostCard({hostName,ownAvatar,locale,act,lastGiftId}){
  const menu=accountLabels[locale]||accountLabels.en;
  const copy=menu.hostCard;
  const rtl=['ar','he','fa','ur'].includes(locale);
  const format=(n)=>n.toLocaleString(locale);
  const [open,setOpen]=useState(false);
  const [photo,setPhoto]=useState('');
  const [totals,setTotals]=useState(null);
  const [failed,setFailed]=useState(false);
  const [retry,setRetry]=useState(0);
  const request=useRef(act);
  request.current=act;
  useEffect(()=>{
    if(ownAvatar||photo)return;
    let current=true;
    request.current('hostCard',{includeAvatar:true}).then(data=>{
      if(current)setPhoto(data.avatar);
    }).catch(()=>{});
    return ()=>{current=false};
  },[ownAvatar,photo,open,retry]);
  useEffect(()=>{
    if(!open)return;
    let current=true,timer;
    async function refresh(){
      try{
        const data=await request.current('hostCard',{details:true});
        if(!['room','received','sent'].every(key=>Number.isSafeInteger(data.totals?.[key])&&data.totals[key]>=0))throw Error('Invalid diamond totals');
        if(current){setTotals(data.totals);setFailed(false)}
      }catch{
        if(current)setFailed(true);
      }
      if(current)timer=setTimeout(refresh,12000);
    }
    refresh();
    return ()=>{current=false;clearTimeout(timer)};
  },[open,lastGiftId,retry]);
  const picture=ownAvatar||photo;
  const name=hostName||copy.title;
  const hostLevel=totals&&Math.floor(totals.received/levelSize);
  const supportLevel=totals&&Math.floor(totals.sent/levelSize);
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy.title+' · '+name} aria-expanded={open}
      style={s.portrait} onPress={()=>{setTotals(null);setFailed(false);setOpen(true)}}>
      {picture?.startsWith('data:image/')?<Image style={s.photo} source={{uri:picture}}/>:
        <Text style={s.initial}>{picture||Array.from(hostName||'👤')[0]}</Text>}
    </TouchableOpacity>
    {open&&<Modal transparent visible animationType="fade" onRequestClose={()=>setOpen(false)}>
      <View style={s.scrim}>
        <View accessibilityViewIsModal style={[s.panel,{direction:rtl?'rtl':'ltr'}]}>
          <View style={s.header}>
            <Text accessibilityRole="header" style={s.title}>{name}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={menu.back} style={s.close} onPress={()=>setOpen(false)}>
              <Text style={s.closeGlyph}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            {totals&&<>
              <Text style={s.roomTotal}>{copy.room} · {format(totals.room)} 💎</Text>
              <DiamondTrack label={copy.hostLevel} caption={copy.received} total={totals.received} format={format}/>
              <DiamondTrack label={copy.supportLevel} caption={copy.sent} total={totals.sent} format={format}/>
              <View style={s.group}><Text style={s.heading}>{copy.achievements}</Text>
                {hostLevel>0&&<Text style={s.detail}>{copy.hostLevel} · {format(hostLevel)}</Text>}
                {supportLevel>0&&<Text style={s.detail}>{copy.supportLevel} · {format(supportLevel)}</Text>}
                {!hostLevel&&!supportLevel&&<Text style={s.detail}>{copy.empty}</Text>}
              </View>
              <View style={s.group}><Text style={s.heading}>{copy.badges}</Text><Text style={s.detail}>{copy.empty}</Text></View>
            </>}
            {failed?<TouchableOpacity accessibilityRole="button" onPress={()=>{setFailed(false);setRetry(n=>n+1)}}>
              <Text style={s.retry}>{menu.retry}</Text></TouchableOpacity>:!totals&&<ActivityIndicator color={theme.accent}/>}
          </ScrollView>
        </View>
      </View>
    </Modal>}
  </>;
}

const s=StyleSheet.create({
  portrait:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:theme.brass,overflow:'hidden'},
  photo:{height:'100%',width:'100%'},initial:{fontSize:23,fontWeight:'700',color:theme.ink},
  scrim:{flex:1,justifyContent:'center',alignItems:'center',padding:20,backgroundColor:'rgba(12,29,27,0.45)'},
  panel:{width:'100%',maxWidth:430,maxHeight:'85%',padding:20,borderRadius:18,backgroundColor:theme.canvas},
  header:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:8},title:{flex:1,fontSize:22,fontWeight:'800',color:theme.ink},
  close:{width:44,height:44,alignItems:'center',justifyContent:'center'},closeGlyph:{fontSize:28,color:theme.ink},
  content:{gap:20,paddingBottom:6},roomTotal:{fontSize:16,fontWeight:'700',color:theme.ink},
  group:{gap:4},trackSection:{gap:5},heading:{fontWeight:'700',fontSize:16,color:theme.ink},
  track:{height:8,width:'100%',backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#A5B3BB',overflow:'hidden'},
  fill:{height:'100%',backgroundColor:'#1976D2'},detail:{fontSize:13,color:theme.secondary},
  fraction:{fontSize:12,color:theme.secondary,writingDirection:'ltr'},retry:{color:theme.accent,fontWeight:'700',paddingVertical:8}
});
