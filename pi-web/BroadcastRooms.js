import React,{useEffect,useState} from 'react';
import {ActivityIndicator,StyleSheet,Text,TextInput,TouchableOpacity,View} from 'react-native';
import {theme} from './ClipiTheme';

export function BroadcastName({label,value,onChange,disabled=false}){
  return <TextInput accessibilityLabel={label} placeholder={label} placeholderTextColor={theme.secondary}
    style={s.input} maxLength={35} editable={!disabled} returnKeyType="done" value={value} onChangeText={onChange}/>;
}

export function PreviousRooms({db,uid,request,onResume,busy,menu,hostField,locale}){
  const [rows,setRows]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    async function load(){
      const [snapshot,{links}]=await Promise.all([
        db.collection('rooms').where('ownerUid','==',uid).get(),request('/account-number',{op:'myRoomContinuations'})
      ]);
      const all=snapshot.docs.map(doc=>({...doc.data(),id:doc.id}));
      const existing=new Set(all.map(room=>room.id));
      const replaced=new Set(links.filter(link=>existing.has(link.session)).map(link=>link.previous));
      const closed=all.filter(room=>room.status==='closed'&&!replaced.has(room.id))
        .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      if(active){setRows(closed);setError('')}
    }
    load().catch(e=>{if(active)setError(e.message||menu.retry)});
    return ()=>{active=false};
  },[uid,attempt,request]);
  return <View style={s.list}>
    {hostField}
    {error?<TouchableOpacity accessibilityRole="button" onPress={()=>setAttempt(n=>n+1)}><Text style={s.title}>{menu.retry}</Text></TouchableOpacity>:
      !rows?<ActivityIndicator/>:!rows.length?<Text style={s.detail}>{menu.hostCard.empty}</Text>:rows.map(room=>
        <TouchableOpacity accessibilityRole="button" key={room.id} disabled={busy} onPress={()=>onResume(room)} style={s.row}>
          <Text style={s.title}>{room.name}</Text>
          <Text style={s.detail}>{room.type==='audio'?menu.voiceRooms:menu.liveBroadcast} · {room.createdAt?.seconds?new Date(room.createdAt.seconds*1000).toLocaleString(locale):room.id}</Text>
        </TouchableOpacity>)}
  </View>;
}

// Retrying a reserved broadcast returns the same document, even from another device.
export async function openPreviousBroadcast(db,request,previous,ownerUid,ownerName,createdAt){
  const reserved=await request('/room-control',{op:'resumeBroadcast',roomId:previous.id});
  const ref=db.collection('rooms').doc(reserved.session);
  return db.runTransaction(async transaction=>{
    const snapshot=await transaction.get(ref);
    // Firebase compat uses a property; React Native Firebase exposes a method.
    const exists=typeof snapshot.exists==='function'?snapshot.exists():snapshot.exists;
    if(exists){
      const existing=snapshot.data();
      if(existing.ownerUid!==ownerUid||existing.status!=='open'||existing.type!==previous.type)throw Error(previous.name);
      return {...existing,id:ref.id};
    }
    const data={name:previous.name,type:previous.type,ownerUid,ownerName,createdAt,status:'open'};
    transaction.set(ref,data);
    return {...data,id:ref.id};
  });
}
const s=StyleSheet.create({
  input:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:theme.line,borderRadius:12,color:theme.ink,fontSize:16,minHeight:46,paddingHorizontal:14,marginVertical:8},
  list:{gap:8},row:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:theme.line},
  title:{color:theme.ink,fontSize:16,fontWeight:'700'},detail:{color:theme.secondary,fontSize:13}
});
