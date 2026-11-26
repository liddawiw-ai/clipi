import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Modal,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {theme} from './ClipiTheme';
import {ui,uiError} from './interface-language.mjs';

function Action({label,onPress,selected=false}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress}
    style={[s.button,selected&&s.selected]}><Text style={s.action}>{label}</Text></Pressable>;
}
function Row({title,detail,onPress}){
  const contents=<><Text style={s.title}>{title}</Text>{!!detail&&<Text style={s.detail}>{detail}</Text>}</>;
  return onPress?<Pressable accessibilityRole="button" style={s.row} onPress={onPress}>{contents}</Pressable>:<View style={s.row}>{contents}</View>;
}
const empty={items:[],next:null,busy:true,error:''};
function usePages(request,op,kind='',query=''){
  const [state,setState]=useState(empty),seq=useRef(0),lock=useRef(false);
  const enabled=op!=='shortSearch'||(kind!=='rooms'&&!!query);
  async function load(cursor,version){
    if(lock.current||version!==seq.current)return;
    lock.current=true;setState(s=>({...s,busy:true,error:''}));
    try{
      const args=op==='shortSearch'?{kind,query,offset:cursor??0}:cursor==null?{}:{before:cursor};
      const data=await request('/account-number',{op,...args});
      if(!Array.isArray(data.items))throw Error(ui('تعذّر تحميل القائمة'));
      if(version===seq.current)setState(prev=>({items:cursor==null?data.items:[...prev.items,...data.items],next:data.next,busy:false,error:''}));
    }catch(e){if(version===seq.current)setState(s=>({...s,busy:false,error:uiError(e)}));}
    finally{if(version===seq.current)lock.current=false;}
  }
  useEffect(()=>{
    const version=++seq.current;
    lock.current=false;setState({...empty,busy:enabled});
    const timer=enabled?setTimeout(()=>load(null,version),op==='shortSearch'?220:0):null;
    return ()=>{clearTimeout(timer);seq.current++;};
  },[request,op,kind,query,enabled]);
  return {...state,more:()=>load(state.next,seq.current)};
}
function Footer({data,hasRows,emptyLabel}){
  return <>{data.busy&&<ActivityIndicator color={theme.accent}/>}
    {!!data.error&&<Text accessibilityRole="alert" style={s.detail}>{data.error}</Text>}
    {!data.busy&&!data.error&&!hasRows&&<Text style={s.detail}>{ui(emptyLabel)}</Text>}
    {!data.busy&&(data.next!=null||!!data.error)&&<Action label={ui(data.error?'إعادة المحاولة':'تحميل المزيد')} onPress={data.more}/>}</>;
}
const tabs={accounts:'حسابات',rooms:'غرف',videos:'فيديوهات'};
const arabicDigits=text=>text.replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)&15));
export function ClipiSearch({request,rooms,blocked,openRoom,openPerson,openVideo,memory}){
  const [raw,setRaw]=useState(memory.current.raw||''),[kind,setKind]=useState(memory.current.kind||'accounts');
  const query=raw.trim(),data=usePages(request,'shortSearch',kind,query);
  const [roomResult,setRoomResult]=useState({id:null,busy:false,error:''}),[retry,setRetry]=useState(0);
  const number=arabicDigits(query);
  useEffect(()=>{
    let live=true;
    if(kind!=='rooms'||!/^\d{7,15}$/.test(number)){setRoomResult({id:null,busy:false,error:''});return;}
    setRoomResult({id:null,busy:true,error:''});
    const timer=setTimeout(()=>request('/account-number',{op:'shortSearchRoomId',number}).then(r=>{
      if(live)setRoomResult({id:r.room,busy:false,error:''});
    }).catch(e=>{if(live)setRoomResult({id:null,busy:false,error:uiError(e)});}),200);
    return ()=>{live=false;clearTimeout(timer);};
  },[kind,number,request,retry]);
  const roomRows=rooms.filter(r=>r.id===roomResult.id||[r.name,r.host,r.id].some(x=>x&&String(x).toLowerCase().includes(query.toLowerCase())));
  const items=(kind==='rooms'?roomRows:data.items).filter(x=>!blocked.includes(x.uid||x.ownerUid||x.owner));
  return <View style={s.card}>
    <TextInput accessibilityLabel={ui('بحث في كليبي')} placeholder={ui('اسم أو معرّف الحساب أو الغرفة أو الفيديو')} placeholderTextColor={theme.secondary}
      maxLength={100} value={raw} onChangeText={v=>{memory.current.raw=v;setRaw(v);}} style={s.input} returnKeyType="search"/>
    <View style={s.tabs}>{Object.entries(tabs).map(([key,label])=><Action key={key} label={ui(label)} selected={key===kind} onPress={()=>{setKind(key);memory.current.kind=key;}}/>)}</View>
    {!!query&&<>{items.map(x=>kind==='accounts'?<Row key={x.uid} title={x.name||String(x.number||ui('مستخدم كليبي'))} detail={x.number?'ID · '+x.number:''} onPress={()=>openPerson({...x,name:x.name||String(x.number||ui('مستخدم كليبي'))})}/>:
      <Row key={x.id} title={kind==='rooms'?x.name||x.host||ui('غرفة'):x.title||ui('فيديو')} onPress={()=>kind==='rooms'?openRoom(x):openVideo(x.id)}/>)}
      <Footer data={kind==='rooms'?{...roomResult,more:()=>setRetry(n=>n+1)}:data} hasRows={items.length>0} emptyLabel="لا توجد نتائج"/></>}
  </View>;
}
const decisions={grant:'تعيين أدمن للتطبيق',revoke:'سحب صلاحية أدمن التطبيق',approved:'قبول طلب وكالة',rejected:'رفض طلب وكالة'};
export function ActivityList({request,audit=false,openVideo}){
  const data=usePages(request,audit?'adminDecisionLog':'shortHistory');
  return <View style={s.card}>{data.items.map(x=>{
    if(!audit)return <Row key={x.id} title={x.title||ui('فيديو')} onPress={()=>openVideo(x.id)}/>;
    const person=(name,number)=>number&&name!==number?name+' (#'+number+')':name;
    const actor=person(x.actorName,x.actorNumber),target=person(x.targetName,x.targetNumber);
    return <Row key={x.cursor} title={ui(decisions[x.kind])} detail={[actor+' → '+target,x.subject!==target?x.subject:'',new Date(x.stamp).toLocaleString()].filter(Boolean).join(' · ')}/>;
  })}<Footer data={data} hasRows={data.items.length>0} emptyLabel={audit?'لا توجد قرارات مسجّلة بعد':'لا توجد فيديوهات في سجل المشاهدة بعد'}/></View>;
}
export function VideoInsights({clip,request,onClose}){
  const [result,setResult]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{let live=true;setError('');request('/account-number',{op:'shortInsights',clip}).then(r=>{if(live)setResult(r);})
    .catch(e=>{if(live)setError(uiError(e));});return ()=>{live=false;};},[request,clip,retry]);
  return <Modal transparent visible animationType="fade" onRequestClose={onClose}><View style={s.backdrop}><View style={s.sheet} accessibilityViewIsModal>
    <Text accessibilityRole="header" style={s.title}>{ui('إحصاءات الفيديو')}</Text>
    {result?[['views','مرات المشاهدة'],['viewers','مشاهدون مختلفون'],['completed','مشاهدون أكملوا الفيديو']].map(([k,label])=><Row key={k} title={ui(label)+' · '+result[k]}/>):
      error?<><Text style={s.detail}>{error}</Text><Action label={ui('إعادة المحاولة')} onPress={()=>setRetry(n=>n+1)}/></>:<ActivityIndicator/>}
    <Action label={ui('إغلاق')} onPress={onClose}/>
  </View></View></Modal>;
}
export function SearchButton({onPress}){
  return <Pressable accessibilityRole="button" accessibilityLabel={ui('بحث في كليبي')} onPress={onPress} style={s.searchButton}>
    <View style={s.lens}/><View style={s.handle}/></Pressable>;
}
const s=StyleSheet.create({
  card:{gap:10,padding:14,backgroundColor:theme.paper,borderRadius:12},input:{minHeight:46,borderWidth:1,borderColor:theme.line,borderRadius:10,paddingHorizontal:12,fontSize:16,color:theme.ink},
  tabs:{flexDirection:'row',flexWrap:'wrap',gap:6},button:{minHeight:44,paddingHorizontal:12,justifyContent:'center',alignItems:'center'},selected:{backgroundColor:theme.mint,borderRadius:12},action:{color:theme.accent,fontWeight:'700'},
  row:{minHeight:48,justifyContent:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderColor:theme.line,paddingVertical:8},title:{fontSize:17,fontWeight:'700',color:theme.ink},detail:{color:theme.secondary,marginVertical:4},
  backdrop:{flex:1,justifyContent:'flex-end',alignItems:'center',backgroundColor:'rgba(0,0,0,.5)'},sheet:{width:'100%',maxWidth:600,backgroundColor:theme.paper,padding:18,borderRadius:16},
  searchButton:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},lens:{width:16,height:16,borderWidth:2,borderColor:'white',borderRadius:10},handle:{position:'absolute',height:2,width:8,backgroundColor:'white',left:27,top:29,transform:[{rotate:'45deg'}]}
});
