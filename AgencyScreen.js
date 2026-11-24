import {ui as appText} from './interface-language.mjs';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Clipboard,Modal,Platform,StyleSheet,Text,TextInput,TouchableOpacity,View} from 'react-native';

const labels={name:'اسم الوكالة',area:'الحي أو المنطقة',audio:'بيانات الغرف الصوتية',live:'بيانات البث المباشر'};
const thisMonth=()=>new Date().toISOString().slice(0,7);
function stepMonth(month,offset){
  const [year,m]=month.split('-').map(Number);
  return new Date(Date.UTC(year,m-1+offset)).toISOString().slice(0,7);
}
function Action({title,onPress,disabled,danger=false}){
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[s.button,danger&&s.danger,disabled&&{opacity:.45}]}><Text style={[s.action,danger&&s.dangerText]}>{title}</Text></TouchableOpacity>;
}
function Field({label,value,onChangeText,numeric}){
  return <View style={s.field}><Text style={s.label}>{appText(label)}</Text><TextInput accessibilityLabel={appText(label)}
    value={value} onChangeText={onChangeText} maxLength={numeric?12:220} keyboardType={numeric?'number-pad':'default'} style={s.input}/></View>;
}
export default function AgencyScreen({request}){
  const [id,setId]=useState(null),[month,setMonth]=useState(thisMonth);
  const [data,setData]=useState(null),[issue,setIssue]=useState(''),[notice,setNotice]=useState('');
  const [creating,setCreating]=useState(false),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false);
  const [form,setForm]=useState({}),[number,setNumber]=useState('');
  const [confirming,setConfirming]=useState(false);
  const gate=useRef(false),version=useRef(0);
  const api=useCallback((op,more)=>request('/account-number',{op,...more}),[request]);
  const refresh=useCallback(async()=>{
    const ticket=++version.current;
    setData(null);setIssue('');setNotice('');
    try{
      const result=id?await api('agencyDetail',{id,month}):await api('agencyList',{});
      if(ticket===version.current)setData(result);
    }catch(error){if(ticket===version.current)setIssue(error.message||appText('تعذّر تحميل الوكالات'));}
  },[api,id,month]);
  useEffect(()=>{void refresh();return ()=>{version.current++;};},[refresh]);
  function go(next){
    setData(null);setId(next);setMonth(thisMonth());setNumber('');setForm({});setEditing(false);setCreating(false);setConfirming(false);
  }
  async function mutate(op,params){
    if(gate.current)return;
    gate.current=true;setBusy(true);setIssue('');
    const ticket=version.current;
    try{
      const result=await api(op,{...params,id});
      if(ticket!==version.current)return;
      if(op==='agencyCreate'){go(result.id);return;}
      if(op==='agencyDelete'){go(null);return;}
      setEditing(false);setNumber('');await refresh();
    }catch(error){if(ticket===version.current)setIssue(error.message||appText('تعذّر حفظ التغيير'));}
    finally{gate.current=false;setBusy(false);}
  }
  function update(key,value){setForm(f=>({...f,[key]:value}));}
  async function copy(){
    try{
      if(Platform.OS==='web'&&globalThis.navigator?.clipboard)await globalThis.navigator.clipboard.writeText(String(id));
      else Clipboard.setString(String(id));
      setNotice(appText('تم نسخ رقم الوكالة'));
    }catch{setNotice(appText('رقم الوكالة ')+id);}
  }
  const agency=data?.agency,totals=data?.totals;
  return <View style={s.panel}>
    {issue?<View><Text accessibilityRole="alert" style={s.error}>{appText(issue)}</Text><Action title={appText("إعادة المحاولة")} onPress={refresh}/></View>:null}
    {!data&&!issue?<Text style={s.label}>{appText("جارٍ تحميل الوكالات…")}</Text>:null}
    {data&&!id&&<>
      {data.agencies.map(a=><Action key={a.id} title={a.name+' · '+a.members+appText(' أعضاء')} onPress={()=>go(a.id)}/>)}
      {!data.agencies.length&&<Text style={s.label}>{appText("ما في وكالات مسجّلة حاليًا")}</Text>}
      {data.canCreate&&<Action title={creating?appText('إلغاء'):appText('إضافة وكالة')} onPress={()=>{setCreating(!creating);setForm({});}}/>}
      {creating&&<><Field label={appText(labels.name)} value={form.name||''} onChangeText={v=>update('name',v)}/>
        <Field label={appText("رقم حساب الوكيل (اختياري)")} numeric value={form.agentNumber||''} onChangeText={v=>update('agentNumber',v)}/>
        <Action title={appText("إنشاء الوكالة")} disabled={busy||!form.name?.trim()} onPress={()=>mutate('agencyCreate',form)}/></>}
    </>}
    {agency&&<>
      <Text style={s.heading}>{agency.name}</Text>
      <Action title={appText('نسخ رقم الوكالة · ')+id} onPress={copy}/>{!!notice&&<Text style={s.label}>{appText(notice)}</Text>}
      {Object.keys(labels).filter(k=>k!=='name').map(k=><Text key={k} style={s.label}>{appText(labels[k])+' · '+(agency[k]||appText('غير محدد'))}</Text>)}
      {data.canManage&&<Action title={editing?appText('إلغاء التعديل'):appText('إعدادات الوكالة')} onPress={()=>{setEditing(!editing);setForm({...agency});}}/>}
      {data.canDelete&&<Action title={appText("حذف الوكالة")} danger disabled={busy} onPress={()=>{setIssue('');setConfirming(true);}}/>}
      {confirming&&data.canDelete&&<Modal visible transparent animationType="fade" onRequestClose={()=>{if(!gate.current)setConfirming(false);}}>
        <View style={s.overlay}><View accessibilityViewIsModal style={s.dialog}>
          <Text accessibilityRole="header" style={[s.heading,s.dialogInk]}>{appText('حذف وكالة «')+agency.name+'»؟'}</Text>
          <Text style={[s.label,s.dialogInk]}>{appText("ستُحذف الوكالة من القائمة ويُفصل أعضاؤها عنها. تُحفظ سجلات الدعم السابقة.")}</Text>
          {!!issue&&<Text accessibilityRole="alert" style={[s.error,{color:'#832e36'}]}>{appText(issue)}</Text>}
          <View style={s.row}><Action title={appText("إلغاء")} disabled={busy} onPress={()=>{if(!gate.current){setConfirming(false);setIssue('');}}}/>
            <Action title={busy?appText('جارٍ الحذف…'):appText('تأكيد الحذف')} danger disabled={busy} onPress={()=>mutate('agencyDelete',{confirmedName:agency.name})}/></View>
        </View></View>
      </Modal>}
      {editing&&<>{Object.entries(labels).map(([k,label])=><Field key={k} label={label} value={form[k]||''} onChangeText={v=>update(k,v)}/>)}
        {data.canSetRates&&[['host_pct','نسبة المضيف ٪'],['agent_pct','نسبة الوكيل ٪']].map(([k,label])=><Field key={k} numeric label={label} value={String(form[k]??'')} onChangeText={v=>update(k,v)}/>)}
        <Action title={appText("حفظ الإعدادات")} disabled={busy} onPress={()=>mutate('agencyEdit',{...form,host_pct:Number(form.host_pct),agent_pct:Number(form.agent_pct)})}/>
      </>}
      {data.roster&&<><Text style={s.heading}>{appText("أعضاء الوكالة · ")}{data.roster.length}</Text>
        {data.roster.map(({number:n})=><Text key={n} selectable style={s.label}>{n}</Text>)}
        <Field numeric label={appText("رقم العضو في كليبي")} value={number} onChangeText={setNumber}/>
        <View style={s.row}><Action title={appText("إضافة عضو")} disabled={busy||!number} onPress={()=>mutate('agencyMemberAdd',{number})}/>
        <Action title={appText("إزالة عضو")} disabled={busy||!number} onPress={()=>mutate('agencyMemberRemove',{number})}/></View></>}
      <Text style={s.heading}>{appText("كشف الرواتب والألماس")}</Text>
      <Text style={s.label}>{appText("المضيف ")}{agency.host_pct}{appText("٪ · الوكيل ")}{agency.agent_pct}{appText("٪ · البرنامج ")}{100-agency.host_pct-agency.agent_pct}٪</Text>
      <View style={s.row}><Action title={appText("الشهر السابق")} onPress={()=>setMonth(stepMonth(month,-1))}/><Text style={s.label}>{month}</Text>
        <Action title={appText("الشهر التالي")} disabled={month>=thisMonth()} onPress={()=>setMonth(stepMonth(month,1))}/></View>
      {totals?<><Text style={s.label}>{appText("الماس المستلم · ")}{totals.diamonds}</Text>
        {Object.entries({host:'المضيف',agent:'الوكيل',platform:'البرنامج'}).filter(([k])=>totals[k]!=null).map(([k,title])=>
          <Text key={k} style={s.label}>{appText(title)+' · '+totals[k]+appText(' نقطة · ')+(totals[k]/100).toFixed(2)+appText(' دولار تقديري')}</Text>)}</>:
        <Text style={s.label}>{appText("الكشف الخاص متاح لأعضاء الوكالة وإدارتها")}</Text>}
    </>}
    {!!id&&<Action title={appText("قائمة الوكالات")} onPress={()=>go(null)}/>}
  </View>;
}
const s=StyleSheet.create({panel:{gap:12,padding:16,backgroundColor:'#17233B',borderRadius:14},
  heading:{fontSize:19,fontWeight:'700',color:'#FFF',textAlign:'right'},label:{color:'#E2E6EE',fontSize:15,textAlign:'right'},
  button:{alignSelf:'flex-end',paddingHorizontal:14,paddingVertical:10,borderRadius:8,backgroundColor:'#2A3953'},
  action:{color:'#FFE1A1',fontSize:15,fontWeight:'600'},field:{gap:6},input:{backgroundColor:'#22314A',color:'white',padding:10,textAlign:'right',borderRadius:6},
  danger:{backgroundColor:'#853738'},dangerText:{color:'white'},
  overlay:{flex:1,padding:18,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.12)'},
  dialog:{width:'100%',maxWidth:360,gap:14,padding:18,borderRadius:14,backgroundColor:'#fff',borderWidth:1,borderColor:'#d9e5df'},dialogInk:{color:'#173e38'},
  error:{color:'#FFC4B5',textAlign:'right'},row:{flexDirection:'row-reverse',alignItems:'center',gap:8,flexWrap:'wrap'}});
