import {ui as appText} from './interface-language.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {Image,Pressable,Text,TextInput,View} from 'react-native';
import {games,seatsFor,match,move,choices} from './TableRules.mjs';
import {Board,colorForSeat} from './RaceBoards';
import BilliardTable from './BilliardTable';
import {credits} from './vendor/table-notices.mjs';
import {practiceAction} from './PracticeOpponent.mjs';
import {Die,PlayingCard,LastCard} from './TableArt';

const practice=new Map();
const colors={surface:'#F4EEE2',ink:'#282D29',line:'#CDBEAA',green:'#164C41'};
const styles={panel:{backgroundColor:colors.surface,padding:14,gap:10,borderRadius:14},row:{flexDirection:'row-reverse',flexWrap:'wrap',gap:6,alignItems:'center'},heading:{fontSize:20,fontWeight:'800',color:colors.ink,textAlign:'right'},text:{fontSize:15,color:colors.ink,textAlign:'right'},input:{backgroundColor:'#FFFCF6',borderColor:colors.line,borderWidth:1,borderRadius:8,padding:10,textAlign:'center',color:colors.ink}};
// The game engine sends these labels as fixed move tokens plus card and piece numbers.
function moveLabel(label){
  return typeof label==='string'?label.replace(/نتيجة النرد|إنزال حجر|حجر|تمرير/g,part=>appText(part)):label;
}
function Action({children,onPress,disabled,selected}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled:!!disabled,selected:!!selected}} disabled={disabled} onPress={onPress} style={{paddingVertical:10,paddingHorizontal:13,borderRadius:8,backgroundColor:selected?colors.green:'#FFFDF8',borderWidth:1,borderColor:colors.line,opacity:disabled?.52:1}}>
    <Text style={{textAlign:'center',fontWeight:'700',color:selected?'#FFFDF8':colors.ink}}>{children}</Text></Pressable>;
}
const about={ludo:'من لاعبين إلى أربعة · نرد وأربعة أحجار لكل لاعب',jackaroo:'أربعة لاعبين · كل لاعبين متقابلين فريق',pool:'لاعبان · بلياردو الثماني كرات'};
const rules={ludo:'نزّل الحجر بالستة. ارجع حجر الخصم إذا وصلت لخانته خارج الخانات الآمنة. الستة تعطي رمية إضافية. يلزم العدد الدقيق لإيصال الأحجار الأربعة.',jackaroo:'على نفس الجهاز، اختر ورقة تمرّرها لشريكك عند التوزيع. الآس والملك ينزّلان حجرًا أو يتحركان ١ و١٣. الأربعة ترجع للخلف، السبعة تُقسَم بين حجرين، والجاك يبدّل حجرين. باقي الأوراق تتحرك بقيمتها والملكة ١٢. بعد تأمين أحجارك تلعب بأحجار زميلك.',pool:'المس القماش لتوجيه العصا، واختر القوة ثم اضرب. أول كرة ملوّنة تدخل بضربة صحيحة تحدد مجموعتك. بعد إنهاء مجموعتك أدخل الثمانية. الخطأ يعطي الخصم الكرة البيضاء باليد. إدخال الثمانية مبكرًا يخسّر الجولة.'};
function Play({g,me,names,send,busy}){
  const [cardIndex,setCardIndex]=useState(null),[piece,setPiece]=useState(null),[rollKey,setRollKey]=useState(0);
  const card=cardIndex===null?null:g.hands?.[me]?.[cardIndex];
  const jack=g.kind==='jackaroo',pool=g.kind==='pool',myTurn=me===g.turn&&g.winner===null,locked=busy||!myTurn;
  useEffect(()=>{setCardIndex(null);setPiece(null);},[g.turn,g.die,g.note,g.winner,!!g.exchange]);
  const valid=React.useMemo(()=>myTurn?choices(g):[],[myTurn,g]);
  const eligible=valid.filter(o=>!jack||Number(o.id.split('/')[0])===card);
  const matches=eligible.filter(o=>piece==null||o.id.split('/')[2]===String(piece));
  const winning=jack?[names[g.winner],names[g.winner+2]].join(' و'):names[g.winner];
  const secured=(seat)=>g.pieces[seat].filter(p=>jack?p>=64:p===56).length;
  const actor=jack&&secured(g.turn)===4?(g.turn+2)%4:g.turn;
  function playOption(id){if(locked)return;setCardIndex(null);setPiece(null);send(jack?{type:'move',id,cardIndex}:{type:'move',id});}
  function tapPawn(seat,index){
    if(locked||seat!==actor)return;
    const available=eligible.filter(o=>Number(o.id.split('/')[2])===index);
    if(available.length===1){playOption(available[0].id);return;}
    if(available.length)setPiece(index);
  }
  const lastDie=g.die||Number(g.note?.match(/نتيجة النرد ([1-6])/)?.[1])||0;
  return <View style={{gap:10}}>
    <Text accessibilityLiveRegion="polite" style={styles.heading}>{g.winner!==null?appText('فاز ')+winning:g.turn===me?appText('دورك · ')+names[me]:appText('الدور · ')+names[g.turn]}</Text>
    {pool?<BilliardTable game={g} me={me} locked={locked} send={send}/>:<>
      <View style={styles.row}>{names.map((name,i)=><View key={i} style={{flexDirection:'row-reverse',alignItems:'center',gap:4,paddingVertical:4,paddingHorizontal:8,borderRadius:9,backgroundColor:i===g.turn?'#e5e8d9':'#f7f3e9'}}>
        <View style={{width:9,height:9,borderRadius:5,backgroundColor:colorForSeat(g,i)}}/><Text style={{color:'#283d32',fontSize:12}}>{name+'  '+secured(i)+'/4'}</Text></View>)}</View>
      <Board game={g} selectedPiece={piece} legalOptions={locked?[]:eligible} hintOption={piece!=null&&matches.length===1?matches[0].id:null} onPiece={tapPawn}/>
      {!jack&&<View style={styles.row}><Die value={lastDie} rollKey={rollKey}/>
        {myTurn&&!g.die&&<Action selected disabled={busy} onPress={()=>{setRollKey(n=>n+1);send({type:'roll'});}}>{appText("ارمِ النرد")}</Action>}
        {!!g.die&&myTurn&&<Text style={styles.text}>{appText("المس الحجر المضيء لتحريكه")}</Text>}</View>}
      {jack&&<>{!!g.lastCard&&<LastCard card={g.lastCard} player={names[g.lastCard.seat]}/>}<Text style={styles.text}>{myTurn?(g.exchange?appText('اختر ورقة تمرّرها إلى شريكك'):card==null?appText('اختر ورقة من يدك'):eligible.some(o=>o.id.endsWith('/pass'))?appText('مرّر الورقة لإنهاء الدور'):appText('المس الحجر المضيء لاختيار الحركة')):appText('أوراقك')}</Text>
        <View style={styles.row}>{(g.hands[me]||[]).map((c,i)=><PlayingCard key={i} rank={c} suit={g.handSuits?.[me]?.[i]} selected={cardIndex===i} enabled={!locked&&(!!g.exchange||valid.some(o=>Number(o.id.split('/')[0])===c))} onPress={()=>{
          if(g.exchange){send({type:'exchange',cardIndex:i});return;}
          setCardIndex(i);setPiece(null);}}/>)}</View></>}
      {jack&&card!=null&&<View style={styles.row}>{matches.filter(o=>piece!=null||o.id.endsWith('/pass')).map(o=><Action key={o.id} disabled={locked} onPress={()=>playOption(o.id)}>{moveLabel(o.label)}</Action>)}</View>}
    </>}
    {!!g.note&&<Text accessibilityLiveRegion="polite" style={styles.text}>{moveLabel(appText(g.note))}</Text>}
  </View>;
}
function Table({kind,uid,name,request,onBack}){
  const localKey=uid+'/'+kind;
  const [local,setLocal]=useState(()=>practice.get(localKey)||null),[count,setCount]=useState(seatsFor(kind)[0]),[privateTurn,setPrivateTurn]=useState(true);
  const soloKey=localKey+'/solo';
  const [solo,setSolo]=useState(()=>!!practice.get(soloKey)),[onlineMenu,setOnlineMenu]=useState(false);
  const [table,setTable]=useState(null),[lobbies,setLobbies]=useState([]),[code,setCode]=useState('');
  const [issue,setIssue]=useState(''),[offline,setOffline]=useState(false),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[showRules,setShowRules]=useState(false);
  const [creditsOpen,setCreditsOpen]=useState(false);
  const active=useRef(true),lock=useRef(false),sequence=useRef(0);
  function update(data){
    if(!data||!Object.hasOwn(data,'table'))throw Error(appText('خدمة الطاولات غير متاحة الآن'));
    setTable(data.table);if(data.lobbies)setLobbies(data.lobbies);setOffline(false);
  }
  async function refresh(){
    if(!request||lock.current||!active.current)return;
    const stamp=++sequence.current;
    try{
      const data=await request('/account-number',{op:'tableList',kind});
      if(active.current&&stamp===sequence.current){update(data);setIssue('');}
    }catch{if(active.current&&stamp===sequence.current){setOffline(true);setIssue(appText('تعذّر الاتصال بالطاولات. اللعب على نفس الجهاز متاح.'));}}
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
      if(active.current){setOffline(true);setIssue(e.message||appText('تعذّر تسجيل العملية'));}
    }finally{lock.current=false;if(active.current)setBusy(false);}
  }
  function localSave(g){if(g)practice.set(localKey,g);else practice.delete(localKey);setLocal(g);setConfirm(false);}
  function send(action){
    if(!local){void command('tableMove',{action});return;}
    if(solo&&local.turn!==0)return;
    try{const next=move(local,action);if(!solo&&next.turn!==local.turn)setPrivateTurn(true);localSave(next);setIssue('');}
    catch(e){setIssue(e.message);}
  }
  function startLocal(withBot){
    setIssue('');setSolo(withBot);practice.set(soloKey,withBot);setPrivateTurn(!withBot);localSave(match(kind,count,Math.random,{partnerExchange:kind==='jackaroo'}));
  }
  useEffect(()=>{
    if(!local||!solo||local.turn===0||local.winner!==null||confirm)return;
    const timer=setTimeout(()=>{
      try{const action=practiceAction(local);if(action)localSave(move(local,action));}
      catch(e){setIssue(e.message||appText('تعذرت حركة الكمبيوتر'));}
    },kind==='pool'&&local.shot?2700:650);
    return ()=>clearTimeout(timer);
  },[local,solo,confirm]);
  const game=local||table?.game,me=local?(solo?0:local.turn):table?.me;
  const names=local?Array.from({length:local.count},(_,i)=>!solo?'لاعب '+(i+1):i===0?'أنت':kind==='jackaroo'&&i===2?'شريكك':'الكمبيوتر '+i):table?.players||[];
  return <View style={styles.panel}>
    <View style={styles.row}><Action onPress={onBack}>{appText("رجوع للألعاب")}</Action><Action onPress={()=>setShowRules(!showRules)}>{appText("قواعد الطاولة")}</Action></View>
    <Text style={styles.heading}>{appText(games[kind])}</Text>{showRules&&<><Text style={styles.text}>{appText(rules[kind])}</Text>
      {!!credits[kind]&&<Action onPress={()=>setCreditsOpen(v=>!v)}>{appText("حقوق ملفات اللعبة")}</Action>}
      {creditsOpen&&!!credits[kind]&&<Text selectable style={[styles.text,{fontSize:12,textAlign:'left',writingDirection:'ltr'}]}>{'Kenney Boardgame Pack (CC0)\n'+credits[kind]}</Text>}</>}
    {(issue&&(local?!offline:onlineMenu||table))?<Text accessibilityLiveRegion="polite" style={styles.text}>{appText(issue)}</Text>:null}
    {offline&&!local&&(onlineMenu||table)&&<Action onPress={refresh}>{appText("إعادة الاتصال")}</Action>}
    {!local&&!table&&<>
      {seatsFor(kind).length>1&&<View style={styles.row}>{seatsFor(kind).map(n=><Action key={n} selected={count===n} onPress={()=>setCount(n)}>{n+appText(' لاعبين')}</Action>)}</View>}
      <Action selected onPress={()=>startLocal(true)}>{appText("تدريب ضد الكمبيوتر")}</Action>
      <Action onPress={()=>startLocal(false)}>{appText("العب مع أصحابك على نفس الجهاز")}</Action>
      <Action selected={onlineMenu} onPress={()=>setOnlineMenu(v=>!v)}>{appText("طاولات الأونلاين")}</Action>
      {onlineMenu&&<><View style={styles.row}><Action selected disabled={busy||!request} onPress={()=>command('tableCreate')}>{appText("إنشاء طاولة")}</Action></View>
      <TextInput value={code} autoCapitalize="characters" autoCorrect={false} maxLength={10} onChangeText={setCode} placeholder={appText("رمز الطاولة")} accessibilityLabel={appText("رمز الطاولة")} style={styles.input}/>
      <Action disabled={busy||!request||code.trim().length!==10} onPress={()=>command('tableJoin',{code})}>{appText("انضم بالرمز")}</Action>
      {lobbies.map(t=><Action key={t.code} disabled={busy} onPress={()=>command('tableJoin',{code:t.code})}>{appText('انضم إلى ')+t.host+' · '+t.seats+' / '+Math.max(...seatsFor(kind))}</Action>)}</>}
    </>}
    {!!table&&!local&&<><Text selectable style={styles.text}>{appText('رمز الطاولة · ')+table.code}</Text><Text style={styles.text}>{names.join('  ·  ')}</Text>
      {table.phase==='lobby'&&(table.me===0?<Action selected disabled={busy||offline||!seatsFor(kind).includes(names.length)} onPress={()=>command('tableStart')}>{appText("ابدأ الجولة")}</Action>:<Text style={styles.text}>{appText("بانتظار المضيف لبدء الجولة")}</Text>)}</>}
    {!!game&&(local&&!solo&&kind==='jackaroo'&&privateTurn&&game.winner===null?<Action selected onPress={()=>setPrivateTurn(false)}>{appText('مرّر الجهاز إلى ')+names[me]+appText(' · اعرض أوراقي')}</Action>:
      <Play g={game} me={me} names={names} send={send} busy={busy||(!local&&offline)}/>)}
    {(local||table)&&<>{confirm?<><Text style={styles.text}>{game?appText('إنهاء الجولة لكل اللاعبين؟'):appText('مغادرة الطاولة؟')}</Text><View style={styles.row}><Action onPress={()=>setConfirm(false)}>{appText("متابعة اللعب")}</Action><Action disabled={busy} onPress={()=>local?localSave(null):command('tableLeave')}>{appText("تأكيد المغادرة")}</Action></View></>:<Action onPress={()=>setConfirm(true)}>{appText("مغادرة الطاولة")}</Action>}</>}
  </View>;
}
export default function ProfileGames({uid,name,request}){
  const [kind,setKind]=useState(null);
  if(kind)return <Table key={uid+kind} kind={kind} uid={uid} name={name} request={request} onBack={()=>setKind(null)}/>;
  const covers={ludo:require('./assets/tables37/ludo-inlay.jpg'),jackaroo:require('./assets/tables37/jackaroo-walnut.jpg')};
  return <View style={{gap:12}}>{Object.entries(games).map(([key,label],i)=><Pressable key={key} accessibilityRole="button" accessibilityLabel={appText(label)} onPress={()=>setKind(key)} style={{minHeight:108,overflow:'hidden',backgroundColor:['#203c34','#3a2920','#123d3d'][i],borderWidth:1,borderColor:'#a78c60',borderRadius:15,alignItems:'center',flexDirection:'row',direction:'ltr'}}>
    <View accessible={false} style={{width:'34%',height:108,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
      {covers[key]?<Image source={covers[key]} resizeMode="cover" style={{width:132,height:132,transform:[{rotate:'-12deg'}]}}/>:<View style={{width:85,height:134,transform:[{rotate:'-24deg'}],backgroundColor:'#117966',borderWidth:6,borderRadius:8,borderColor:'#956640',alignItems:'center',justifyContent:'center'}}>
        <View style={{width:24,height:24,borderRadius:12,backgroundColor:'#171921',alignItems:'center',justifyContent:'center'}}><Text style={{color:'white',fontWeight:'bold'}}>8</Text></View><View style={{marginTop:14,marginLeft:20,width:14,height:14,borderRadius:7,backgroundColor:'#fffbe8'}}/></View>}
    </View><View style={{flex:1,paddingHorizontal:12,gap:5}}><Text style={[styles.heading,{color:'#fff4dc',fontSize:25}]}>{appText(label)}</Text><Text style={[styles.text,{color:'#e7ddca',fontSize:14}]}>{appText(about[key])}</Text></View></Pressable>)}</View>;
}
