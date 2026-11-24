import {ui as appText} from './interface-language.mjs';
import {theme} from './ClipiTheme';
import GoldFrame from './GoldFrame';
import React from 'react';
import {View,Text,Image,ScrollView,TextInput,TouchableOpacity,StyleSheet} from 'react-native';

export function LoginCover({image}){
 return <View style={s.cover}><GoldFrame/><Image source={image} accessibilityLabel="Clipi" style={s.logo}/><Text style={s.wordmark}>Clipi</Text></View>;
}
export function BalanceCard({icon,label,value,tone='mint',action,onPress}){
 return <View style={[s.card,{backgroundColor:colors[tone]}]}><View style={s.cardBody}><Text style={s.symbol}>{icon}</Text><View style={s.values}><Text style={s.caption}>{label}</Text><Text style={s.amount}>{value}</Text></View></View>
 {action&&<TouchableOpacity accessibilityRole="button" style={s.cardAction} onPress={onPress}><Text style={s.cardActionText}>{action}  ›</Text></TouchableOpacity>}</View>;
}
export function RoomStudio({hostField,name,setName,kind,setKind,onStart,onClose,busy,copy}){
 return <ScrollView keyboardShouldPersistTaps="handled" style={s.studio} contentContainerStyle={s.studioBody}>
 <View style={s.top}><TouchableOpacity accessibilityLabel={appText(copy.close)} accessibilityRole="button" onPress={onClose}><Text style={s.cross}>×</Text></TouchableOpacity><Text style={s.brand}>Clipi</Text></View>
 <Text style={s.heading}>{appText(copy.title)}</Text>
 <View style={s.panel}><GoldFrame/><View style={s.identity}><Text style={s.badge}>{kind==='audio'?'♫':'▶'}</Text><View style={{flex:1}}><Text style={s.pale}>{appText(copy.name)}</Text><TextInput style={s.input} accessibilityLabel={appText(copy.name)} value={name} onChangeText={setName} maxLength={55}/></View></View>
 <Text style={s.pale}>{appText(copy.mode)}</Text><View style={s.modes}>{[['audio','♫',copy.audio],['video','▶',copy.video]].map(([id,icon,title])=><TouchableOpacity key={id} accessibilityRole="button" accessibilityState={{selected:kind===id}} onPress={()=>setKind(id)} style={[s.mode,kind===id&&s.active]}><Text style={[s.modeText,kind===id&&s.activeText]}>{icon}   {title}</Text></TouchableOpacity>)}</View></View>
 <View style={s.bottom}><Text style={s.note}>{appText(copy.note)}</Text>{hostField}<TouchableOpacity accessibilityRole="button" disabled={busy} style={[s.start,busy&&{opacity:.6}]} onPress={onStart}><Text style={s.startText}>{appText(copy.start)}</Text></TouchableOpacity></View>
 </ScrollView>;
}
const colors={mint:theme.mint,sky:theme.sea,sand:theme.sand,rose:theme.peach};
const s=StyleSheet.create({
 cover:{height:177,borderRadius:28,overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:theme.paper,marginBottom:18},tile:{position:'absolute',width:115,height:115,borderRadius:30,transform:[{rotate:'-16deg'}]},left:{left:-24,top:-32,backgroundColor:theme.paper},right:{right:-25,top:14,backgroundColor:theme.paper},lower:{left:24,bottom:-78,backgroundColor:theme.paper},logo:{height:82,width:82,borderRadius:22},wordmark:{fontSize:25,fontWeight:'900',color:theme.ink,marginTop:7},
 card:{borderWidth:1,borderColor:theme.line,borderRadius:19,overflow:'hidden',marginBottom:10},cardBody:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:17},symbol:{fontSize:35,color:theme.accent},values:{flexShrink:1,alignItems:'flex-end'},caption:{color:theme.secondary,fontSize:14,fontWeight:'700'},amount:{color:theme.ink,fontSize:28,fontWeight:'900',marginTop:4},cardAction:{alignSelf:'flex-end',backgroundColor:'transparent',borderRadius:12,paddingVertical:8,paddingHorizontal:14,marginBottom:10},cardActionText:{fontWeight:'800',color:theme.accent},
 studio:{flex:1,backgroundColor:theme.canvas},studioBody:{flexGrow:1,padding:20,paddingTop:45},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},cross:{color:theme.ink,fontSize:29,padding:5},brand:{color:theme.ink,fontSize:19,fontWeight:'900'},heading:{fontSize:29,color:theme.ink,fontWeight:'800',marginVertical:20},panel:{overflow:"hidden",backgroundColor:theme.mint,borderRadius:22,padding:17},identity:{flexDirection:'row',gap:12,alignItems:'center',marginBottom:22},badge:{textAlign:'center',padding:16,borderRadius:18,fontSize:27,backgroundColor:theme.paper,color:theme.gold},pale:{color:theme.ink,fontWeight:'700',marginBottom:6},input:{backgroundColor:theme.paper,color:theme.ink,fontSize:17,borderRadius:12,padding:11},modes:{flexDirection:'row',gap:9},mode:{flex:1,padding:13,borderRadius:13,alignItems:'center',backgroundColor:theme.sea,borderWidth:1,borderColor:theme.line},active:{backgroundColor:theme.paper,borderWidth:1,borderColor:theme.accent},modeText:{color:theme.ink,fontWeight:'700'},activeText:{color:theme.ink},bottom:{flexGrow:1,justifyContent:'flex-end',paddingTop:35},note:{color:theme.secondary,marginBottom:16,lineHeight:20},start:{backgroundColor:theme.accent,minHeight:50,borderRadius:26,alignItems:'center',justifyContent:'center'},startText:{fontSize:18,fontWeight:'800',color:theme.paper}
});
