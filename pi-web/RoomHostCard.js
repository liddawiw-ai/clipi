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

export function HostLevels({owner,request,locale,initialOpen}){
  const menu=accountLabels[locale]||accountLabels.en,copy=menu.hostCard;
  const [open,setOpen]=useState(!!initialOpen),[totals,setTotals]=useState(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{if(initialOpen)setOpen(true)},[initialOpen]);
  useEffect(()=>{
    if(!open)return;
    let active=true;
    setFailed(false);
    request('/account-number',{op:'hostLevels',owner}).then(data=>{
      if(!Number.isSafeInteger(data.received)||!Number.isSafeInteger(data.sent))throw Error('Invalid levels');
      if(active)setTotals(data);
    }).catch(()=>{if(active)setFailed(true)});
    return ()=>{active=false};
  },[owner,request,open,retry]);
  const format=n=>n.toLocaleString(locale);
  const earned=totals&&[[copy.hostLevel,totals.received],[copy.supportLevel,totals.sent]].filter(([,value])=>value>=levelSize);
  return <View style={s.levels}>
    <TouchableOpacity accessibilityRole="button" aria-expanded={open} onPress={()=>setOpen(v=>!v)}>
      <Text style={s.heading}>{copy.hostLevel} · {copy.supportLevel} {open?'⌃':'⌄'}</Text>
    </TouchableOpacity>
    {open&&(failed?<TouchableOpacity accessibilityRole="button" onPress={()=>setRetry(v=>v+1)}><Text style={s.retry}>{menu.retry}</Text></TouchableOpacity>:
      !totals?<ActivityIndicator/>:<>
        <DiamondTrack label={copy.hostLevel} caption={copy.received} total={totals.received} format={format}/>
        <DiamondTrack label={copy.supportLevel} caption={copy.sent} total={totals.sent} format={format}/>
        <View style={s.group}><Text style={s.heading}>{copy.achievements}</Text>
          {earned.length?earned.map(([label,value])=><Text key={label} style={s.detail}>{label} · {format(Math.floor(value/levelSize))}</Text>):<Text style={s.detail}>{copy.empty}</Text>}
        </View>
        <View style={s.group}><Text style={s.heading}>{copy.badges}</Text><Text style={s.detail}>{copy.empty}</Text></View>
      </>)}
  </View>;
}

export function useRoomHost(act,enabled,lastGiftId){
  const request=useRef(act);
  request.current=act;
  const knownPortrait=useRef(false);
  const [summary,setSummary]=useState({});
  useEffect(()=>{
    if(!enabled)return;
    let active=true,timer;
    async function refresh(){
      try{
        const first=!knownPortrait.current;
        const data=await request.current('hostCard',{includeAvatar:first,profileName:first,roomTotal:true});
        if(active){
          if(typeof data.avatar==='string')knownPortrait.current=true;
          setSummary(old=>({...old,...data}));
        }
      }catch{ /* Keep the last confirmed total while reconnecting. */ }
      if(active)timer=setTimeout(refresh,15000);
    }
    refresh();
    return ()=>{active=false;clearTimeout(timer)};
  },[enabled,lastGiftId]);
  return summary;
}

function SupporterList({act,lastGiftId,menu,onClose}){
  const request=useRef(act);
  request.current=act;
  const [items,setItems]=useState([]),[next,setNext]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState(false);
  const version=useRef(0),inFlight=useRef(false),cursor=useRef(null);
  async function load(after,reset){
    if(!reset&&inFlight.current)return;
    const current=++version.current;
    inFlight.current=true;cursor.current=after;setBusy(true);setError(false);
    try{
      const data=await request.current('hostCard',{supporters:true,after:after||''});
      if(current===version.current){
        setItems(old=>reset?data.supporters.people:[...old,...data.supporters.people]);setNext(data.supporters.next);
      }
    }catch{if(current===version.current)setError(true)}
    finally{if(current===version.current){inFlight.current=false;setBusy(false)}}
  }
  useEffect(()=>{
    load(null,true);
    return ()=>{version.current++};
  },[lastGiftId]);
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.scrim}><View accessibilityViewIsModal style={s.panel}>
      <View style={s.header}><Text accessibilityRole="header" style={s.title}>{menu.roomSupporters}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={menu.back} onPress={onClose} style={s.close}>
          <Text style={s.closeGlyph}>×</Text></TouchableOpacity></View>
      <ScrollView contentContainerStyle={s.content}>
        {items.map(person=><Text key={person.uid} style={s.heading}>{person.name||'—'}</Text>)}
        {!items.length&&!busy&&!error&&<Text style={s.detail}>{menu.hostCard.empty}</Text>}
        {busy?<ActivityIndicator/>:error?<TouchableOpacity accessibilityRole="button" onPress={()=>load(cursor.current,!cursor.current)}><Text style={s.retry}>{menu.retry}</Text></TouchableOpacity>:
          next&&<TouchableOpacity accessibilityRole="button" onPress={()=>load(next,false)}><Text style={s.retry}>{menu.more}</Text></TouchableOpacity>}
      </ScrollView>
    </View></View>
  </Modal>;
}

export default function RoomHostCard({hostName,portrait,total,locale,act,lastGiftId,onProfile,textStyle}){
  const menu=accountLabels[locale]||accountLabels.en;
  const [open,setOpen]=useState(false);
  const count=Number.isSafeInteger(total)?total.toLocaleString(locale):'…';
  return <View style={s.roomHost}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={menu.hostCard.title+' · '+(hostName||'')} onPress={onProfile} style={s.portrait}>
      {portrait?.startsWith('data:image/')?<Image style={s.photo} source={{uri:portrait}}/>:
        <Text style={[s.initial,textStyle]}>{portrait||Array.from(hostName||'👤')[0]}</Text>}
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={menu.roomSupporters+' · '+count} onPress={()=>setOpen(true)} style={s.counter}>
      <Text style={[s.count,textStyle]}>{count} 💎</Text>
    </TouchableOpacity>
    {open&&<SupporterList act={act} lastGiftId={lastGiftId} menu={menu} onClose={()=>setOpen(false)}/>}
  </View>;
}

const s=StyleSheet.create({
  roomHost:{alignItems:'center',flexShrink:0},counter:{alignItems:'center',justifyContent:'center',minHeight:24},count:{fontSize:12,fontWeight:'700',color:theme.ink},
  levels:{marginTop:10,gap:10},portrait:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:theme.brass,overflow:'hidden'},
  photo:{height:'100%',width:'100%'},initial:{fontSize:19,fontWeight:'700',color:theme.ink},
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
