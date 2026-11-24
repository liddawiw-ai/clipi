import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Clipboard,Platform,StyleSheet,Text,TextInput,TouchableOpacity,View} from 'react-native';

const labels={name:'اسم الوكالة',area:'الحي أو المنطقة',audio:'بيانات الغرف الصوتية',live:'بيانات البث المباشر'};
const thisMonth=()=>new Date().toISOString().slice(0,7);
function stepMonth(month,offset){
  const [year,m]=month.split('-').map(Number);
  return new Date(Date.UTC(year,m-1+offset)).toISOString().slice(0,7);
}
function Action({title,onPress,disabled}){
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[s.button,disabled&&{opacity:.45}]}><Text style={s.action}>{title}</Text></TouchableOpacity>;
}
function Field({label,value,onChangeText,numeric}){
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label}
    value={value} onChangeText={onChangeText} maxLength={numeric?12:220} keyboardType={numeric?'number-pad':'default'} style={s.input}/></View>;
}
export default function AgencyScreen({request}){
  const [id,setId]=useState(null),[month,setMonth]=useState(thisMonth);
  const [data,setData]=useState(null),[issue,setIssue]=useState(''),[notice,setNotice]=useState('');
  const [creating,setCreating]=useState(false),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false);
  const [form,setForm]=useState({}),[number,setNumber]=useState('');
  const gate=useRef(false),version=useRef(0);
  const api=useCallback((op,more)=>request('/account-number',{op,...more}),[request]);
  const refresh=useCallback(async()=>{
    const ticket=++version.current;
    setData(null);setIssue('');setNotice('');
    try{
      const result=id?await api('agencyDetail',{id,month}):await api('agencyList',{});
      if(ticket===version.current)setData(result);
    }catch(error){if(ticket===version.current)setIssue(error.message||'تعذّر تحميل الوكالات');}
  },[api,id,month]);
  useEffect(()=>{void refresh();return ()=>{version.current++;};},[refresh]);
  function go(next){
    setData(null);setId(next);setMonth(thisMonth());setNumber('');setForm({});setEditing(false);setCreating(false);
  }
  async function mutate(op,params){
    if(gate.current)return;
    gate.current=true;setBusy(true);setIssue('');
    const ticket=version.current;
    try{
      const result=await api(op,{...params,id});
      if(ticket!==version.current)return;
      if(op==='agencyCreate'){go(result.id);return;}
      setEditing(false);setNumber('');await refresh();
    }catch(error){if(ticket===version.current)setIssue(error.message||'تعذّر حفظ التغيير');}
    finally{gate.current=false;setBusy(false);}
  }
  function update(key,value){setForm(f=>({...f,[key]:value}));}
  async function copy(){
    try{
      if(Platform.OS==='web'&&globalThis.navigator?.clipboard)await globalThis.navigator.clipboard.writeText(String(id));
      else Clipboard.setString(String(id));
      setNotice('تم نسخ رقم الوكالة');
    }catch{setNotice('رقم الوكالة '+id);}
  }
  const agency=data?.agency,totals=data?.totals;
  return <View style={s.panel}>
    {issue?<View><Text accessibilityRole="alert" style={s.error}>{issue}</Text><Action title="إعادة المحاولة" onPress={refresh}/></View>:null}
    {!data&&!issue?<Text style={s.label}>جارٍ تحميل الوكالات…</Text>:null}
    {data&&!id&&<>
      {data.agencies.map(a=><Action key={a.id} title={a.name+' · '+a.members+' أعضاء'} onPress={()=>go(a.id)}/>)}
      {!data.agencies.length&&<Text style={s.label}>ما في وكالات مسجّلة حاليًا</Text>}
      {data.canCreate&&<Action title={creating?'إلغاء':'إضافة وكالة'} onPress={()=>{setCreating(!creating);setForm({});}}/>}
      {creating&&<><Field label={labels.name} value={form.name||''} onChangeText={v=>update('name',v)}/>
        <Field label="رقم حساب الوكيل (اختياري)" numeric value={form.agentNumber||''} onChangeText={v=>update('agentNumber',v)}/>
        <Action title="إنشاء الوكالة" disabled={busy||!form.name?.trim()} onPress={()=>mutate('agencyCreate',form)}/></>}
    </>}
    {agency&&<>
      <Text style={s.heading}>{agency.name}</Text>
      <Action title={'نسخ رقم الوكالة · '+id} onPress={copy}/>{!!notice&&<Text style={s.label}>{notice}</Text>}
      {Object.keys(labels).filter(k=>k!=='name').map(k=><Text key={k} style={s.label}>{labels[k]+' · '+(agency[k]||'غير محدد')}</Text>)}
      {data.canManage&&<Action title={editing?'إلغاء التعديل':'إعدادات الوكالة'} onPress={()=>{setEditing(!editing);setForm({...agency});}}/>}
      {editing&&<>{Object.entries(labels).map(([k,label])=><Field key={k} label={label} value={form[k]||''} onChangeText={v=>update(k,v)}/>)}
        {data.canSetRates&&[['host_pct','نسبة المضيف ٪'],['agent_pct','نسبة الوكيل ٪']].map(([k,label])=><Field key={k} numeric label={label} value={String(form[k]??'')} onChangeText={v=>update(k,v)}/>)}
        <Action title="حفظ الإعدادات" disabled={busy} onPress={()=>mutate('agencyEdit',{...form,host_pct:Number(form.host_pct),agent_pct:Number(form.agent_pct)})}/>
      </>}
      {data.roster&&<><Text style={s.heading}>أعضاء الوكالة · {data.roster.length}</Text>
        {data.roster.map(({number:n})=><Text key={n} selectable style={s.label}>{n}</Text>)}
        <Field numeric label="رقم العضو في كليبي" value={number} onChangeText={setNumber}/>
        <View style={s.row}><Action title="إضافة عضو" disabled={busy||!number} onPress={()=>mutate('agencyMemberAdd',{number})}/>
        <Action title="إزالة عضو" disabled={busy||!number} onPress={()=>mutate('agencyMemberRemove',{number})}/></View></>}
      <Text style={s.heading}>كشف الرواتب والألماس</Text>
      <Text style={s.label}>المضيف {agency.host_pct}٪ · الوكيل {agency.agent_pct}٪ · البرنامج {100-agency.host_pct-agency.agent_pct}٪</Text>
      <View style={s.row}><Action title="الشهر السابق" onPress={()=>setMonth(stepMonth(month,-1))}/><Text style={s.label}>{month}</Text>
        <Action title="الشهر التالي" disabled={month>=thisMonth()} onPress={()=>setMonth(stepMonth(month,1))}/></View>
      {totals?<><Text style={s.label}>الماس المستلم · {totals.diamonds}</Text>
        {Object.entries({host:'المضيف',agent:'الوكيل',platform:'البرنامج'}).filter(([k])=>totals[k]!=null).map(([k,title])=>
          <Text key={k} style={s.label}>{title+' · '+totals[k]+' نقطة · '+(totals[k]/100).toFixed(2)+' دولار تقديري'}</Text>)}</>:
        <Text style={s.label}>الكشف الخاص متاح لأعضاء الوكالة وإدارتها</Text>}
    </>}
    {!!id&&<Action title="قائمة الوكالات" onPress={()=>go(null)}/>}
  </View>;
}
const s=StyleSheet.create({panel:{gap:12,padding:16,backgroundColor:'#17233B',borderRadius:14},
  heading:{fontSize:19,fontWeight:'700',color:'#FFF',textAlign:'right'},label:{color:'#E2E6EE',fontSize:15,textAlign:'right'},
  button:{alignSelf:'flex-end',paddingHorizontal:14,paddingVertical:10,borderRadius:8,backgroundColor:'#2A3953'},
  action:{color:'#FFE1A1',fontSize:15,fontWeight:'600'},field:{gap:6},input:{backgroundColor:'#22314A',color:'white',padding:10,textAlign:'right',borderRadius:6},
  error:{color:'#FFC4B5',textAlign:'right'},row:{flexDirection:'row-reverse',alignItems:'center',gap:8,flexWrap:'wrap'}});
