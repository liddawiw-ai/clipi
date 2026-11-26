import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,FlatList,Image,Modal,StyleSheet,Text,TouchableOpacity,View} from 'react-native';
import {theme} from './ClipiTheme';
import {ui} from './interface-language.mjs';

export function ProfilePeople({kind,title,owner,request,onClose,onOpen,blocked=[]}){
  const [people,setPeople]=useState([]),[next,setNext]=useState(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  const generation=useRef(0),pending=useRef(false);
  const load=useCallback(async after=>{
    if(pending.current)return;
    const version=generation.current;
    pending.current=true;setLoading(true);setError('');
    try{
      const result=await request('/account-number',{op:'shortProfilePeople',owner,kind,after});
      if(!Array.isArray(result.people))throw Error(ui('تعذر تحميل القائمة'));
      if(version!==generation.current)return;
      setPeople(prev=>after?[...prev,...result.people.filter(p=>!prev.some(old=>old.uid===p.uid))]:result.people);
      setNext(result.next);
    }catch(e){if(version===generation.current)setError(e.message||ui('تعذر تحميل القائمة'));}
    finally{if(version===generation.current){pending.current=false;setLoading(false);}}
  },[request,owner,kind]);
  useEffect(()=>{
    load('');
    return ()=>{generation.current++;pending.current=false;};
  },[load]);
  const visible=people.filter(p=>!blocked.includes(p.uid));
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.backdrop}><View style={s.panel} accessibilityViewIsModal>
      <View style={s.header}><Text accessibilityRole="header" style={s.title}>{title}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={ui('إغلاق')} onPress={onClose} style={s.action}><Text style={s.link}>×</Text></TouchableOpacity></View>
      <FlatList data={visible} keyExtractor={p=>p.uid} renderItem={({item})=>{
        const name=item.name||String(item.number||ui('مستخدم كليبي'));
        return <TouchableOpacity accessibilityRole="button" accessibilityLabel={ui('فتح حساب')+' '+name}
          style={s.row} onPress={()=>{onClose();onOpen({...item,name});}}>
          {item.avatar?.startsWith('data:image/')?<Image source={{uri:item.avatar}} style={s.photo}/>:<Text style={s.icon}>{item.avatar||'👤'}</Text>}
          <View style={s.identity}><Text style={s.name}>{name}</Text>{item.number!=null&&item.name&&<Text style={s.sub}>ID · {item.number}</Text>}</View>
        </TouchableOpacity>;
      }} ListEmptyComponent={!loading&&!error&&!next?<Text style={s.status}>{ui('لا يوجد أشخاص في هذه القائمة بعد')}</Text>:null}
        ListFooterComponent={<>{loading&&<ActivityIndicator accessibilityLabel={ui('جارٍ التحميل')} color={theme.accent}/>}
          {!!error&&<Text accessibilityRole="alert" style={s.status}>{ui(error)}</Text>}
          {!loading&&(!!next||!!error)&&<TouchableOpacity accessibilityRole="button" style={s.action} onPress={()=>load(next||'')}>
            <Text style={s.link}>{ui(error?'إعادة المحاولة':'تحميل المزيد')}</Text></TouchableOpacity>}</>}/>
    </View></View>
  </Modal>;
}
const s=StyleSheet.create({
  backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.42)'},
  panel:{alignSelf:'center',width:'100%',maxWidth:600,height:'65%',backgroundColor:theme.paper,borderTopLeftRadius:20,borderTopRightRadius:20,padding:16},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:theme.line},
  title:{fontSize:20,fontWeight:'700',color:theme.ink},action:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},
  link:{fontSize:18,color:theme.accent,fontWeight:'700'},row:{minHeight:56,flexDirection:'row',alignItems:'center',paddingVertical:6,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:theme.line},
  photo:{width:38,height:38,borderRadius:19},icon:{fontSize:24,width:38,textAlign:'center'},identity:{flex:1,marginHorizontal:10},
  name:{fontSize:16,fontWeight:'600',color:theme.ink},sub:{fontSize:13,color:theme.secondary},status:{textAlign:'center',padding:14,color:theme.secondary}
});
