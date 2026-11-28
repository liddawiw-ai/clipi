import {uiError,ui as appText} from './interface-language.mjs';
import {LudoBadge} from './ClipiLudoArt';
import React,{useEffect,useRef,useState} from 'react';
import {Image,Pressable,Text,TextInput,View} from 'react-native';
import {games,seatsFor,match,move,choices} from './TableRules.mjs';
import {Board,colorForSeat} from './RaceBoards';
import BilliardTable from './BilliardTable';
import {credits} from './vendor/table-notices.mjs';
import {practiceAction} from './PracticeOpponent.mjs';
import {Die,PlayingCard,LastCard} from './TableArt';
import {gameSound,unlockGameAudio,soundEnabled,setGameSound} from './GameAudio';

const practice=new Map();
const colors={surface:'#101a29',ink:'#f8e8c6',line:'#785d35',green:'#e5bd69'};
const styles={panel:{backgroundColor:colors.surface,padding:14,gap:12,borderRadius:22,borderWidth:1,borderColor:'#785d35'},row:{flexDirection:'row-reverse',flexWrap:'wrap',gap:6,alignItems:'center'},heading:{fontSize:20,fontWeight:'800',color:colors.ink,textAlign:'right'},text:{fontSize:15,color:colors.ink,textAlign:'right'},input:{backgroundColor:'#1b2b3f',borderColor:colors.line,borderWidth:1,borderRadius:8,padding:10,textAlign:'center',color:colors.ink}};
// The game engine sends these labels as fixed move tokens plus card and piece numbers.
function moveLabel(label){
  return typeof label==='string'?label.replace(/نتيجة النرد|إنزال حجر|حجر|تمرير/g,part=>appText(part)):label;
}
function Action({children,onPress,disabled,selected}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled:!!disabled,selected:!!selected}} disabled={disabled} onPress={onPress} style={{minHeight:44,paddingVertical:12,paddingHorizontal:14,borderRadius:12,backgroundColor:selected?colors.green:'#21354a',borderWidth:1,borderColor:colors.line,opacity:disabled?.52:1}}>
    <Text style={{textAlign:'center',fontWeight:'700',color:selected?'#20170c':colors.ink}}>{children}</Text></Pressable>;
}
const about={ludo:'من لاعبين إلى أربعة · نرد وأربعة أحجار لكل لاعب',jackaroo:'أربعة لاعبين · كل لاعبين متقابلين فريق',pool:'لاعبان · بلياردو الثماني كرات'};
const rules={ludo:'نزّل الحجر بالستة. ارجع حجر الخصم إذا وصلت لخانته خارج الخانات الآمنة. الستة تعطي رمية إضافية. يلزم العدد الدقيق لإيصال الأحجار الأربعة.',jackaroo:'على نفس الجهاز، اختر ورقة تمرّرها لشريكك عند التوزيع. الآس والملك ينزّلان حجرًا أو يتحركان ١ و١٣. الأربعة ترجع للخلف، السبعة تُقسَم بين حجرين، والجاك يبدّل حجرين. باقي الأوراق تتحرك بقيمتها والملكة ١٢. بعد تأمين أحجارك تلعب بأحجار زميلك.',pool:'المس القماش لتوجيه العصا، واختر القوة ثم اضرب. أول كرة ملوّنة تدخل بضربة صحيحة تحدد مجموعتك. بعد إنهاء مجموعتك أدخل الثمانية. الخطأ يعطي الخصم الكرة البيضاء باليد. إدخال الثمانية مبكرًا يخسّر الجولة.'};
function Play({g,me,names,send,busy,theme}){
  const [cardIndex,setCardIndex]=useState(null),[piece,setPiece]=useState(null),[rollKey,setRollKey]=useState(0);
  const card=cardIndex===null?null:g.hands?.[me]?.[cardIndex];
  const previous=useRef(g);
  useEffect(()=>{
    const old=previous.current;previous.current=g;
    if(old.winner===null&&g.winner!==null){gameSound('win');return;}
    if(g.kind==='pool')return;
    if(JSON.stringify(old.pieces)!==JSON.stringify(g.pieces)){
      const captured=g.pieces.some((row,s)=>row.some((p,i)=>p===-1&&old.pieces[s][i]>=0));gameSound(captured?'capture':'piece');
    }else if(g.kind==='jackaroo'&&JSON.stringify(old.lastCard)!==JSON.stringify(g.lastCard))gameSound('card');
    else if(g.kind==='ludo'&&g.note!==old.note&&g.note?.startsWith('نتيجة النرد')){gameSound('dice');setRollKey(n=>n+1);}
    else if(old.turn!==g.turn&&g.turn===me)gameSound('turn');
  },[g,me]);
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
    <Text accessibilityLiveRegion="polite" style={[styles.heading,{padding:12,borderRadius:12,backgroundColor:g.winner!==null?'#805c20':myTurn?'#176348':'#28394f'}]}>{g.winner!==null?appText('فاز ')+winning:g.turn===me?appText('دورك · ')+names[me]:appText('الدور · ')+names[g.turn]}</Text>
    {pool?<BilliardTable theme={theme} game={g} me={me} locked={locked} send={send}/>:<>
      <View style={styles.row}>{names.map((name,i)=><View key={i} style={{flexDirection:'row-reverse',alignItems:'center',gap:4,paddingVertical:4,paddingHorizontal:8,borderRadius:9,borderWidth:1,borderColor:i===g.turn?'#BB872F':'#ded6c8',backgroundColor:i===g.turn?'#f9e8af':'#f7f3e9'}}>
        <View style={{width:9,height:9,borderRadius:5,backgroundColor:colorForSeat(g,i)}}/><Text style={{color:'#283d32',fontSize:12}}>{name+'  '+secured(i)+'/4'}</Text></View>)}</View>
      <Board theme={theme} game={g} selectedPiece={piece} legalOptions={locked?[]:eligible} hintOption={piece!=null&&matches.length===1?matches[0].id:null} onPiece={tapPawn}/>
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
  const [creditsOpen,setCreditsOpen]=useState(false),[sound,setSound]=useState(soundEnabled);
  const active=useRef(true),lock=useRef(false),sequence=useRef(0);
  const [shopOpen,setShopOpen]=useState(false),[shop,setShop]=useState(null),[shopBusy,setShopBusy]=useState(false),[shopError,setShopError]=useState('');
  const shopLock=useRef(false);
  async function shopAction(op,item){
    if(!request||shopLock.current)return;
    shopLock.current=true;setShopBusy(true);setShopError('');
    try{const v=await request('/account-number',{op,kind,item});if(active.current)setShop(v);}
    catch(e){if(active.current)setShopError(uiError(e,'تعذّر تحميل متجر الألعاب'));}
    finally{shopLock.current=false;if(active.current)setShopBusy(false);}
  }
  useEffect(()=>{void shopAction('tableCosmetics');},[kind]);
  const theme=shop?.catalog?.find(x=>x.id===shop.equipped);
  const [ranking,setRanking]=useState(null),[rankOpen,setRankOpen]=useState(false),[rankError,setRankError]=useState(false);
  useEffect(()=>{
    if(!rankOpen||!request)return;
    let live=true;setRankError(false);
    request('/account-number',{op:'tableRanking',kind}).then(value=>{if(live)setRanking(value)}).catch(()=>{if(live)setRankError(true)});
    return()=>{live=false};
  },[rankOpen,kind,request,table?.phase]);

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
    unlockGameAudio();lock.current=true;sequence.current++;setBusy(true);setIssue('');
    try{
      const data=await request('/account-number',{kind,op,name,code:table?.code,rev:table?.rev,...extra});
      if(active.current){update(data);setConfirm(false);}
    }catch(e){
      if(active.current){setOffline(true);setIssue(e.message||appText('تعذّر تسجيل العملية'));}
    }finally{lock.current=false;if(active.current)setBusy(false);}
  }
  function localSave(g){if(g)practice.set(localKey,g);else practice.delete(localKey);setLocal(g);setConfirm(false);}
  function send(action){
    unlockGameAudio();if(action.type==='roll')gameSound('dice');
    if(!local){void command('tableMove',{action});return;}
    if(solo&&local.turn!==0)return;
    try{const next=move(local,action);if(!solo&&next.turn!==local.turn)setPrivateTurn(true);localSave(next);setIssue('');}
    catch(e){setIssue(uiError(e));}
  }
  function startLocal(withBot){
    unlockGameAudio();setIssue('');setSolo(withBot);practice.set(soloKey,withBot);setPrivateTurn(!withBot);localSave(match(kind,count,Math.random,{partnerExchange:kind==='jackaroo'}));
  }
  useEffect(()=>{
    if(!local||!solo||local.turn===0||local.winner!==null||confirm)return;
    const timer=setTimeout(()=>{
      try{const action=practiceAction(local);if(action)localSave(move(local,action));}
      catch(e){setIssue(e.message||appText('تعذرت حركة الكمبيوتر'));}
    },kind==='pool'&&local.shot?2700:650);
    return ()=>clearTimeout(timer);
  },[local,solo,confirm]);
  const [seconds,setSeconds]=useState(60);
  useEffect(()=>{
    if(local||!table?.deadline)return;
    const end=Date.now()+Math.max(0,table.deadline-table.serverTime);
    const tick=()=>setSeconds(Math.max(0,Math.ceil((end-Date.now())/1000)));
    tick();const timer=setInterval(tick,250);return()=>clearInterval(timer);
  },[local,table?.deadline,table?.serverTime]);
  const game=local||table?.game,me=local?(solo?0:local.turn):table?.me;
  const names=local?Array.from({length:local.count},(_,i)=>!solo?'لاعب '+(i+1):i===0?'أنت':kind==='jackaroo'&&i===2?'شريكك':'الكمبيوتر '+i):table?.players||[];
  return <View style={[styles.panel,theme&&{borderWidth:3,borderColor:theme.color}]}>
    <View style={styles.row}><Action onPress={onBack}>{appText("رجوع للألعاب")}</Action><Action onPress={()=>setShowRules(!showRules)}>{appText("قواعد الطاولة")}</Action><Action selected={sound} onPress={()=>{setGameSound(!sound);setSound(!sound)}}>{appText(sound?'كتم أصوات اللعبة':'تشغيل أصوات اللعبة')}</Action></View>
    <Text style={styles.heading}>{appText(games[kind])}</Text>{showRules&&<><Text style={styles.text}>{appText(rules[kind])}</Text>
      {!!credits[kind]&&<Action onPress={()=>setCreditsOpen(v=>!v)}>{appText("حقوق ملفات اللعبة")}</Action>}
      {creditsOpen&&!!credits[kind]&&<Text selectable style={[styles.text,{fontSize:12,textAlign:'left',writingDirection:'ltr'}]}>{'Kenney Boardgame Pack (CC0)\n'+credits[kind]}</Text>}</>}
    <Action selected={shopOpen} onPress={()=>{setShopOpen(v=>!v);void shopAction('tableCosmetics')}}>{appText('متجر ثيمات الألعاب')}</Action>
    {shopOpen&&<View style={{gap:8,padding:12,backgroundColor:'#18283b',borderRadius:12}}>
      {!!shopError&&<Text style={styles.text}>{shopError}</Text>}
      {shop&&<><Text style={styles.heading}>💎 {shop.diamonds}</Text>
      {[{id:'classic',label:'كلاسيكي',cost:0,color:'#cdbeaa'},...shop.catalog].map(item=>{
        const owned=item.id==='classic'||shop.owned.includes(item.id);
        return <View key={item.id} style={{padding:8,borderWidth:2,borderColor:item.color,borderRadius:10,gap:5}}>
          <Text style={styles.heading}>{appText(item.label)} · {item.cost} 💎</Text>
          <Action disabled={shopBusy||shop.equipped===item.id||(!owned&&shop.diamonds<item.cost)} selected={shop.equipped===item.id} onPress={()=>shopAction(owned?'tableEquipCosmetic':'tableBuyCosmetic',item.id)}>{appText(shop.equipped===item.id?'مفعّل':owned?'تفعيل الثيم':'شراء وتفعيل الثيم')}</Action>
        </View>;
      })}</>}
    </View>}
    <Action selected={rankOpen} onPress={()=>setRankOpen(v=>!v)}>{appText('التصنيف العالمي')}</Action>
    {rankOpen&&<View style={{gap:8,padding:12,borderRadius:12,backgroundColor:'#18283b'}}>
      {rankError?<Text style={styles.text}>{appText('تعذّر تحميل التصنيف')}</Text>:!ranking?<Text style={styles.text}>…</Text>:<>
        <Text style={styles.heading}>{appText('مستواك')} {1+Math.floor(ranking.personal.xp/100)} · {ranking.personal.xp} XP</Text>
        <Text style={styles.text}>{appText('المباريات')} {ranking.personal.played} · {appText('الانتصارات')} {ranking.personal.wins}</Text>
        {ranking.ranking.map((row,i)=><View key={i} style={[styles.row,{justifyContent:'space-between',padding:8,borderRadius:8,backgroundColor:row.me?'#1d604c':i<3?'#594422':'#26384c'}]}><Text style={styles.text}>{i+1}. {row.name}</Text><Text style={styles.text}>{row.xp} XP</Text></View>)}
        {!ranking.ranking.length&&<Text style={styles.text}>{appText('لا توجد نتائج بعد')}</Text>}
      </>}
    </View>}
    {(issue&&(local?!offline:onlineMenu||table))?<Text accessibilityLiveRegion="polite" style={styles.text}>{appText(issue)}</Text>:null}
    {offline&&!local&&(onlineMenu||table)&&<Action onPress={refresh}>{appText("إعادة الاتصال")}</Action>}
    {!local&&!table&&<>
      {seatsFor(kind).length>1&&<View style={styles.row}>{seatsFor(kind).map(n=><Action key={n} selected={count===n} onPress={()=>setCount(n)}>{n+appText(' لاعبين')}</Action>)}</View>}
      <Action selected onPress={()=>startLocal(true)}>{appText("تدريب ضد الكمبيوتر")}</Action>
      <Action onPress={()=>startLocal(false)}>{appText("العب مع أصحابك على نفس الجهاز")}</Action>
      <Action selected={onlineMenu} onPress={()=>setOnlineMenu(v=>!v)}>{appText("طاولات الأونلاين")}</Action>
      {onlineMenu&&<><Action selected disabled={busy||!request} onPress={()=>command('tableMatch')}>{appText('بحث عن لاعبين أونلاين')}</Action><View style={styles.row}><Action selected disabled={busy||!request} onPress={()=>command('tableCreate')}>{appText("إنشاء طاولة")}</Action></View>
      <TextInput value={code} autoCapitalize="characters" autoCorrect={false} maxLength={10} onChangeText={setCode} placeholder={appText("رمز الطاولة")} accessibilityLabel={appText("رمز الطاولة")} style={styles.input}/>
      <Action disabled={busy||!request||code.trim().length!==10} onPress={()=>command('tableJoin',{code})}>{appText("انضم بالرمز")}</Action>
      {lobbies.map(t=><Action key={t.code} disabled={busy} onPress={()=>command('tableJoin',{code:t.code})}>{appText('انضم إلى ')+t.host+' · '+t.seats+' / '+Math.max(...seatsFor(kind))}</Action>)}</>}
    </>}
    {!!table&&!local&&<><Text selectable style={styles.text}>{appText('رمز الطاولة · ')+table.code}</Text><Text style={styles.text}>{names.join('  ·  ')}</Text>
      {table.phase==='lobby'&&(table.me===0?<Action selected disabled={busy||offline||!seatsFor(kind).includes(names.length)} onPress={()=>command('tableStart')}>{appText("ابدأ الجولة")}</Action>:<Text style={styles.text}>{appText("بانتظار المضيف لبدء الجولة")}</Text>)}</>}
    {!local&&table?.phase==='playing'&&<View style={{padding:10,borderRadius:12,backgroundColor:'#1d2d40',gap:6}}><Text style={styles.heading}>{appText('وقت الدور')} · {seconds}s</Text><View style={{height:6,borderRadius:3,backgroundColor:'#35485e',overflow:'hidden'}}><View style={{height:6,width:(seconds/60*100)+'%',backgroundColor:seconds<=10?'#ec725e':'#e5bd69'}}/></View></View>}
    {!!game&&(local&&!solo&&kind==='jackaroo'&&privateTurn&&game.winner===null?<Action selected onPress={()=>setPrivateTurn(false)}>{appText('مرّر الجهاز إلى ')+names[me]+appText(' · اعرض أوراقي')}</Action>:
      <Play theme={theme} g={game} me={me} names={names} send={send} busy={busy||(!local&&(offline||seconds===0))}/>)}
    {local&&game?.winner!==null&&game&&<Action selected onPress={()=>startLocal(solo)}>{appText('العب مرة أخرى')}</Action>}
    {!local&&table?.phase==='finished'&&<Action selected disabled={busy||table.rematchReady} onPress={()=>command('tableRematch')}>{appText('العب مرة أخرى')} · {table.rematchCount||0}/{table.players.length}</Action>}
    {(local||table)&&<>{confirm?<><Text style={styles.text}>{game?appText('إنهاء الجولة لكل اللاعبين؟'):appText('مغادرة الطاولة؟')}</Text><View style={styles.row}><Action onPress={()=>setConfirm(false)}>{appText("متابعة اللعب")}</Action><Action disabled={busy} onPress={()=>local?localSave(null):command('tableLeave')}>{appText("تأكيد المغادرة")}</Action></View></>:<Action onPress={()=>setConfirm(true)}>{appText("مغادرة الطاولة")}</Action>}</>}
  </View>;
}
export default function ProfileGames({uid,name,request}){
  const [kind,setKind]=useState(null);
  if(kind)return <Table key={uid+kind} kind={kind} uid={uid} name={name} request={request} onBack={()=>setKind(null)}/>;
  const covers={jackaroo:require('./assets/tables37/jackaroo-walnut.jpg')};
  return <View style={{gap:12,backgroundColor:'#101a29',padding:12,borderRadius:22}}>
    <View style={{flexDirection:'row',justifyContent:'space-around',alignItems:'flex-start',gap:8}}>
      {Object.entries(games).map(([key,label],i)=><Pressable key={key} accessibilityRole="button" accessibilityLabel={appText(label)} onPress={()=>setKind(key)} style={{flex:1,minWidth:0,alignItems:'center',gap:6,paddingVertical:6}}>
        <View accessible={false} style={{width:64,height:64,overflow:'hidden',borderRadius:15,borderWidth:1,borderColor:'#a78c60',backgroundColor:['#203c34','#3a2920','#123d3d'][i],alignItems:'center',justifyContent:'center'}}>
          {key==='ludo'?<View style={{width:58,height:58}}><LudoBadge/></View>:covers[key]?<Image source={covers[key]} resizeMode="cover" style={{width:64,height:64}}/>:<View style={{width:36,height:52,backgroundColor:'#117966',borderWidth:3,borderRadius:5,borderColor:'#956640',alignItems:'center',justifyContent:'center'}}><View style={{width:22,height:22,borderRadius:11,backgroundColor:'#171921',alignItems:'center',justifyContent:'center'}}><Text style={{color:'white',fontWeight:'bold'}}>8</Text></View></View>}
        </View>
        <Text numberOfLines={2} style={{fontSize:13,color:'#fff4dc',fontWeight:'700',textAlign:'center'}}>{appText(label)}</Text>
      </Pressable>)}
    </View>
  </View>;
}
