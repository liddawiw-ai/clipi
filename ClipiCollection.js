import {ui as appText} from './interface-language.mjs';
import {entranceNames,entranceOverrides,equippedEntrance} from './entranceStyles.mjs';
import {theme} from './ClipiTheme';
import React,{useState} from 'react';
import {View,Text,TouchableOpacity,StyleSheet} from 'react-native';

export default function ClipiCollection({copy,goods,identity,inventory,equipped,onBuy,onEquip,onEntranceStyle,onNumber,error}){
  const [tab,select]=useState('frame');
  const tabs=['frame','ride','numbers','owned'];
  const numbers=tab==='numbers';
  const items=numbers?(identity?.offers||[]).map(o=>({key:o.number,icon:'#',name:o.number,detail:o.cost+' 💎',action:copy.buy,press:()=>onNumber('buy',o.number)})):
    goods.filter(g=>tab==='owned'?inventory.includes(g[1]):g[3]===tab).map(g=>{
      const owned=inventory.includes(g[1]),active=equipped[g[3]]===g[1];
      return {key:g[1],icon:g[0],name:appText(g[1])+(g[3]==='ride'?' · '+appText(entranceNames[equippedEntrance({ride:g[1]})]):''),detail:g[2]+' 💎',action:owned?(active?copy.remove:copy.equip):copy.buy,press:()=>owned?onEquip(g):onBuy(g)};
    });
  if(numbers||tab==='owned')for(const n of identity?.owned||[])items.push({key:'id-'+n,icon:'#',name:n,detail:copy.numbers,action:identity.number===n?'✓':copy.equip,press:()=>onNumber('equip',n)});
  return <View><View style={s.strip}><Text style={s.title}>{appText(copy.store)}</Text><Text style={s.light}>{identity?.balance??'…'} 💎</Text></View>
    <View style={s.tabs}>{tabs.map(k=><TouchableOpacity key={k} accessibilityRole="tab" accessibilityState={{selected:k===tab}} onPress={()=>select(k)} style={[s.tab,k===tab&&s.selected]}><Text style={[s.label,k===tab&&s.light]}>{appText(copy[k])}</Text></TouchableOpacity>)}</View>
    {tab==='ride'&&!!equipped.ride&&<View><Text style={s.label}>{copy.translate('شكل دخولك')}</Text><View style={s.tabs}>
      {entranceOverrides.map(id=>{
        const chosen=(equipped.entryStyle||0)===id;
        const label=id?entranceNames[id]:entranceNames[equippedEntrance({ride:equipped.ride})];
        return <TouchableOpacity key={id} accessibilityRole="button" accessibilityState={{selected:chosen}} onPress={()=>onEntranceStyle(id)} style={[s.tab,chosen&&s.selected]}>
          <Text style={s.label}>{copy.translate(label)}</Text></TouchableOpacity>;
      })}
    </View></View>}
    {!!error&&numbers&&<TouchableOpacity onPress={()=>onNumber('read')}><Text>{appText(copy.retry)}</Text></TouchableOpacity>}
    <View style={s.grid}>{items.map(item=><View style={s.card} key={item.key}><View style={s.art}><Text style={s.icon}>{item.icon}</Text></View><Text style={s.label}>{item.name}</Text><Text style={s.detail}>{appText(item.detail)}</Text><TouchableOpacity style={s.button} accessibilityRole="button" onPress={item.press}><Text style={s.light}>{appText(item.action)}</Text></TouchableOpacity></View>)}</View></View>;
}
const s=StyleSheet.create({
 strip:{borderRadius:20,backgroundColor:theme.mint,padding:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{fontSize:19,color:theme.ink,fontWeight:'800'},light:{color:theme.ink,fontWeight:'700'},tabs:{flexDirection:'row',flexWrap:'wrap',gap:6,marginVertical:13},tab:{paddingVertical:10,paddingHorizontal:10,borderRadius:14,backgroundColor:'transparent'},selected:{backgroundColor:theme.mint,borderColor:theme.accent},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},card:{width:'48%',marginBottom:12,padding:10,borderRadius:17,backgroundColor:theme.paper,borderColor:theme.line,borderWidth:1},art:{backgroundColor:theme.sand,height:70,borderRadius:12,alignItems:'center',justifyContent:'center',marginBottom:7},icon:{fontSize:30,color:theme.ink},label:{fontWeight:'700',color:theme.secondary},detail:{fontSize:13,color:theme.secondary,marginVertical:5},button:{backgroundColor:theme.sea,padding:9,borderRadius:10,alignItems:'center'}
});
