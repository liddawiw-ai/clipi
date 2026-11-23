import React,{useEffect,useRef,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {games,seatsFor,match,move,choices,cardName} from './TableRules.mjs';
import {Board,PoolBoard} from './TableBoard';

const practice=new Map();
const colors={surface:'#F4EEE2',ink:'#282D29',line:'#CDBEAA',green:'#164C41'};
const styles={panel:{backgroundColor:colors.surface,padding:14,gap:10,borderRadius:14},row:{flexDirection:'row-reverse',flexWrap:'wrap',gap:6,alignItems:'center'},heading:{fontSize:20,fontWeight:'800',color:colors.ink,textAlign:'right'},text:{fontSize:15,color:colors.ink,textAlign:'right'},input:{backgroundColor:'#FFFCF6',borderColor:colors.line,borderWidth:1,borderRadius:8,padding:10,textAlign:'center',color:colors.ink}};
function Action({children,onPress,disabled,selected}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled:!!disabled,selected:!!selected}} disabled={disabled} onPress={onPress} style={{paddingVertical:10,paddingHorizontal:13,borderRadius:8,backgroundColor:selected?colors.green:'#FFFDF8',borderWidth:1,borderColor:colors.line,opacity:disabled?.52:1}}>
    <Text style={{textAlign:'center',fontWeight:'700',color:selected?'#FFFDF8':colors.ink}}>{children}</Text></Pressable>;
}
const about={ludo:'من لاعبين إلى أربعة · نرد وأربعة أحجار لكل لاعب',jackaroo:'أربعة لاعبين · كل لاعبين متقابلين فريق',pool:'لاعبان · بلياردو الثماني كرات'};
const rules={ludo:'نزّل الحجر بالستة. ارجع حجر الخصم إذا وصلت لخانته خارج الخانات الآمنة. الستة تعطي رمية إضافية. يلزم العدد الدقيق لإيصال الأحجار الأربعة.',jackaroo:'قواعد طاولة كليبي: الآس والملك ينزّلان حجرًا أو يتحركان ١ و١٣. الأربعة ترجع للخلف، السبعة تُقسَم بين حجرين، والجاك يبدّل حجرين. باقي الأوراق تتحرك بقيمتها والملكة ١٢. بعد تأمين أحجارك تلعب بأحجار زميلك.',pool:'المس القماش لتوجيه العصا، واختر القوة ثم اضرب. أول كرة ملوّنة تدخل بضربة صحيحة تحدد مجموعتك. بعد إنهاء مجموعتك أدخل الثمانية. الخطأ يعطي الخصم الكرة البيضاء باليد. إدخال الثمانية مبكرًا يخسّر الجولة.'};
function Play({g,me,names,send,busy}){
  const [card,setCard]=useState(null),[piece,setPiece]=useState(null),[angle,setAngle]=useState(-Math.PI/2),[power,setPower]=useState(85),[placing,setPlacing]=useState(false);
  const myTurn=me===g.turn&&g.winner===null,locked=busy||!myTurn;
  useEffect(()=>{setCard(null);setPiece(null);setPlacing(false);},[g.turn,g.die,g.note,g.shot?.number]);
  const valid=React.useMemo(()=>myTurn?choices(g):[],[myTurn,g]);
  const activeCards=g.kind==='jackaroo'?[...new Set(g.hands[me]||[])]:[];
  const matches=valid.filter(o=>(card===null||Number(o.id.split('/')[0])===card)&&(piece===null||o.id.split('/')[2]===String(piece)));
  const winner=g.kind==='jackaroo'?[names[g.winner],names[g.winner+2]].join(' و'):names[g.winner];
  return <View style={{gap:9}}>
    <Text style={styles.heading}>{g.winner!==null?'الفائز · '+winner:'الدور · '+names[g.turn]}</Text>
    {g.kind==='pool'?<>
      <PoolBoard game={g} angle={angle} placing={placing} onPoint={(x,y)=>{
        if(locked)return;
        if(placing){send({type:'place',x,y});setPlacing(false);return;}
        const cue=g.balls.find(b=>!b.n);if(cue)setAngle(Math.atan2(y-cue.y,x-cue.x));
      }}/>
      {g.groups[me]&&<Text style={styles.text}>{'كراتك · '+(g.groups[me]==='solid'?'السادة':'المخططة')}</Text>}
      {myTurn&&<><View style={styles.row}>{[35,60,85,100].map(n=><Action key={n} selected={power===n} onPress={()=>setPower(n)}>{n+'٪'}</Action>)}</View>
        <View style={styles.row}><Action selected disabled={locked||placing} onPress={()=>send({type:'shot',angle,power})}>اضرب</Action>
        {g.inHand&&<Action selected={placing} onPress={()=>setPlacing(!placing)}>حرّك الكرة البيضاء</Action>}
        <Action onPress={()=>setAngle(a=>a-Math.PI/90)}>↶</Action><Action onPress={()=>setAngle(a=>a+Math.PI/90)}>↷</Action></View></>}
    </>:<>
      <Board game={g} onPiece={(s,i)=>{if(!locked&&valid.some(o=>o.id.split('/')[2]===String(i))&&(s===me||g.kind==='jackaroo'&&s===(me+2)%4))setPiece(p=>p===i?null:i);}}/>
      {g.kind==='ludo'&&myTurn&&!g.die&&<Action selected disabled={busy} onPress={()=>send({type:'roll'})}>ارمِ النرد</Action>}
      {activeCards.length>0&&<View style={styles.row}>{activeCards.map(c=><Action key={c} selected={card===c} disabled={locked} onPress={()=>{setCard(c);setPiece(null);}}>{cardName(c)}</Action>)}</View>}
      {piece!==null&&<Action onPress={()=>setPiece(null)}>كل الأحجار</Action>}
      {(g.kind!=='jackaroo'||card!==null)&&<View style={styles.row}>{matches.map(o=><Action key={o.id} disabled={locked} onPress={()=>{setCard(null);setPiece(null);send({type:'move',id:o.id});}}>{o.label}</Action>)}</View>}
    </>}
    {!!g.note&&<Text accessibilityLiveRegion="polite" style={styles.text}>{g.note}</Text>}
  </View>;
}
function Table({kind,uid,name,request,onBack}){
  const localKey=uid+'/'+kind;
  const [local,setLocal]=useState(()=>practice.get(localKey)||null),[count,setCount]=useState(seatsFor(kind)[0]),[privateTurn,setPrivateTurn]=useState(true);
  const [table,setTable]=useState(null),[lobbies,setLobbies]=useState([]),[code,setCode]=useState('');
  const [issue,setIssue]=useState(''),[offline,setOffline]=useState(false),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[showRules,setShowRules]=useState(false);
  const active=useRef(true),lock=useRef(false),sequence=useRef(0);
  function update(data){
    if(!data||!Object.hasOwn(data,'table'))throw Error('خدمة الطاولات غير متاحة الآن');
    setTable(data.table);if(data.lobbies)setLobbies(data.lobbies);setOffline(false);
  }
  async function refresh(){
    if(!request||lock.current||!active.current)return;
    const stamp=++sequence.current;
    try{
      const data=await request('/account-number',{op:'tableList',kind});
      if(active.current&&stamp===sequence.current){update(data);setIssue('');}
    }catch{if(active.current&&stamp===sequence.current){setOffline(true);setIssue('تعذّر الاتصال بالطاولات. اللعب على نفس الجهاز متاح.');}}
  }
  useEffect(()=>{
    active.current=true;return ()=>{active.current=false;sequence.current++;};
  },[]);
  useEffect(()=>{
    if(local)return;
    let cancelled=false,timer;
    async function poll(){await refresh();if(!cancelled)timer=setTimeout(poll,3000);}
    void poll();return ()=>{cancelled=true;clearTimeout(timer);};
  },[!!local]);
  async function command(op,extra={}){
    if(lock.current)return;
    lock.current=true;sequence.current++;setBusy(true);setIssue('');
    try{
      const data=await request('/account-number',{kind,op,name,code:table?.code,rev:table?.rev,...extra});
      if(active.current){update(data);setConfirm(false);}
    }catch(e){
      if(active.current){setOffline(true);setIssue(e.message||'تعذّر تسجيل العملية');}
    }finally{lock.current=false;if(active.current)setBusy(false);}
  }
  function localSave(g){if(g)practice.set(localKey,g);else practice.delete(localKey);setLocal(g);setConfirm(false);}
  function send(action){
    if(!local){void command('tableMove',{action});return;}
    try{const next=move(local,action);if(next.turn!==local.turn)setPrivateTurn(true);localSave(next);setIssue('');}
    catch(e){setIssue(e.message);}
  }
  const game=local||table?.game,me=local?local.turn:table?.me,names=local?Array.from({length:local.count},(_,i)=>'لاعب '+(i+1)):table?.players||[];
  return <View style={styles.panel}>
    <View style={styles.row}><Action onPress={onBack}>رجوع للألعاب</Action><Action onPress={()=>setShowRules(!showRules)}>قواعد الطاولة</Action></View>
    <Text style={styles.heading}>{games[kind]}</Text>{showRules&&<Text style={styles.text}>{rules[kind]}</Text>}
    {(issue&&(!local||!offline))?<Text accessibilityLiveRegion="polite" style={styles.text}>{issue}</Text>:null}
    {offline&&!local&&<Action onPress={refresh}>إعادة الاتصال</Action>}
    {!local&&!table&&<>
      <View style={styles.row}><Action selected disabled={busy||!request} onPress={()=>command('tableCreate')}>إنشاء طاولة</Action></View>
      <TextInput value={code} autoCapitalize="characters" autoCorrect={false} maxLength={10} onChangeText={setCode} placeholder="رمز الطاولة" accessibilityLabel="رمز الطاولة" style={styles.input}/>
      <Action disabled={busy||!request||code.trim().length!==10} onPress={()=>command('tableJoin',{code})}>انضم بالرمز</Action>
      {lobbies.map(t=><Action key={t.code} disabled={busy} onPress={()=>command('tableJoin',{code:t.code})}>{'انضم إلى '+t.host+' · '+t.seats+' / '+Math.max(...seatsFor(kind))}</Action>)}
      <Text style={styles.text}>اللعب على نفس الجهاز</Text>
      <View style={styles.row}>{seatsFor(kind).map(n=><Action key={n} selected={count===n} onPress={()=>setCount(n)}>{n+' لاعبين'}</Action>)}<Action onPress={()=>{setIssue('');setPrivateTurn(true);localSave(match(kind,count));}}>ابدأ اللعب</Action></View>
    </>}
    {!!table&&!local&&<><Text selectable style={styles.text}>{'رمز الطاولة · '+table.code}</Text><Text style={styles.text}>{names.join('  ·  ')}</Text>
      {table.phase==='lobby'&&(table.me===0?<Action selected disabled={busy||offline||!seatsFor(kind).includes(names.length)} onPress={()=>command('tableStart')}>ابدأ الجولة</Action>:<Text style={styles.text}>بانتظار المضيف لبدء الجولة</Text>)}</>}
    {!!game&&(local&&kind==='jackaroo'&&privateTurn&&game.winner===null?<Action selected onPress={()=>setPrivateTurn(false)}>{'مرّر الجهاز إلى '+names[me]+' · اعرض أوراقي'}</Action>:
      <Play g={game} me={me} names={names} send={send} busy={busy||(!local&&offline)}/>)}
    {(local||table)&&<>{confirm?<><Text style={styles.text}>{game?'إنهاء الجولة لكل اللاعبين؟':'مغادرة الطاولة؟'}</Text><View style={styles.row}><Action onPress={()=>setConfirm(false)}>متابعة اللعب</Action><Action disabled={busy} onPress={()=>local?localSave(null):command('tableLeave')}>تأكيد المغادرة</Action></View></>:<Action onPress={()=>setConfirm(true)}>مغادرة الطاولة</Action>}</>}
  </View>;
}
export default function ProfileGames({uid,name,request}){
  const [kind,setKind]=useState(null);
  if(kind)return <Table key={uid+kind} kind={kind} uid={uid} name={name} request={request} onBack={()=>setKind(null)}/>;
  return <View style={{gap:12}}>{Object.entries(games).map(([key,label],i)=><Pressable key={key} accessibilityRole="button" accessibilityLabel={label} onPress={()=>setKind(key)} style={{padding:19,gap:8,borderRadius:13,backgroundColor:['#273D4A','#593D2F','#175344'][i],borderWidth:1,borderColor:'#B49970'}}>
    <Text style={[styles.heading,{color:'#FFF2D6'}]}>{label}</Text><Text style={[styles.text,{color:'#E0D8C6'}]}>{about[key]}</Text></Pressable>)}</View>;
}
