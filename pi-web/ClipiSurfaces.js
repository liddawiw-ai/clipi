import React from 'react';
import {View,Text,Image,ScrollView,TextInput,TouchableOpacity,StyleSheet} from 'react-native';

export function LoginCover({image}){
 return <View style={s.cover}><View style={[s.tile,s.left]}/><View style={[s.tile,s.right]}/><View style={[s.tile,s.lower]}/>
   <Image source={image} accessibilityLabel="Clipi" style={s.logo}/><Text style={s.wordmark}>Clipi</Text></View>;
}
export function BalanceCard({icon,label,value,tone='mint',action,onPress}){
 return <View style={[s.card,{backgroundColor:colors[tone]}]}><View style={s.cardBody}><Text style={s.symbol}>{icon}</Text><View style={s.values}><Text style={s.caption}>{label}</Text><Text style={s.amount}>{value}</Text></View></View>
 {action&&<TouchableOpacity accessibilityRole="button" style={s.cardAction} onPress={onPress}><Text style={s.caption}>{action}  ›</Text></TouchableOpacity>}</View>;
}
export function RoomStudio({name,setName,kind,setKind,onStart,onClose,busy,copy}){
 return <ScrollView keyboardShouldPersistTaps="handled" style={s.studio} contentContainerStyle={s.studioBody}>
 <View style={s.top}><TouchableOpacity accessibilityLabel={copy.close} accessibilityRole="button" onPress={onClose}><Text style={s.cross}>×</Text></TouchableOpacity><Text style={s.brand}>Clipi</Text></View>
 <Text style={s.heading}>{copy.title}</Text>
 <View style={s.panel}><View style={s.identity}><Text style={s.badge}>{kind==='audio'?'♫':'▶'}</Text><View style={{flex:1}}><Text style={s.pale}>{copy.name}</Text><TextInput style={s.input} accessibilityLabel={copy.name} value={name} onChangeText={setName} maxLength={55}/></View></View>
 <Text style={s.pale}>{copy.mode}</Text><View style={s.modes}>{[['audio','♫',copy.audio],['video','▶',copy.video]].map(([id,icon,title])=><TouchableOpacity key={id} accessibilityRole="button" accessibilityState={{selected:kind===id}} onPress={()=>setKind(id)} style={[s.mode,kind===id&&s.active]}><Text style={[s.modeText,kind===id&&s.activeText]}>{icon}   {title}</Text></TouchableOpacity>)}</View></View>
 <View style={s.bottom}><Text style={s.note}>{copy.note}</Text><TouchableOpacity accessibilityRole="button" disabled={busy} style={[s.start,busy&&{opacity:.6}]} onPress={onStart}><Text style={s.startText}>{copy.start}</Text></TouchableOpacity></View>
 </ScrollView>;
}
const colors={mint:'#ccebdd',sky:'#d6e9fa',sand:'#f6e4c8',rose:'#f5dce6'};
const s=StyleSheet.create({
 cover:{height:200,borderRadius:28,overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:'#dbece9',marginBottom:18},tile:{position:'absolute',width:115,height:115,borderRadius:30,transform:[{rotate:'-16deg'}]},left:{left:-24,top:-32,backgroundColor:'#add8cc'},right:{right:-25,top:14,backgroundColor:'#c3c1ed'},lower:{left:24,bottom:-78,backgroundColor:'#e0bcd6'},logo:{height:82,width:82,borderRadius:22},wordmark:{fontSize:25,fontWeight:'900',color:'#173f3b',marginTop:7},
 card:{borderRadius:20,overflow:'hidden',marginBottom:10},cardBody:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:17},symbol:{fontSize:35,color:'#215c58'},values:{flexShrink:1,alignItems:'flex-end'},caption:{color:'#26483f',fontSize:14,fontWeight:'700'},amount:{color:'#122e2a',fontSize:25,fontWeight:'900',marginTop:4},cardAction:{backgroundColor:'#173c3210',padding:10,alignItems:'center'},
 studio:{flex:1,backgroundColor:'#223e50'},studioBody:{flexGrow:1,padding:20,paddingTop:45},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},cross:{color:'white',fontSize:29,padding:5},brand:{color:'#b2e2d7',fontSize:19,fontWeight:'900'},heading:{fontSize:29,color:'white',fontWeight:'800',marginVertical:20},panel:{backgroundColor:'#183442',borderRadius:22,padding:17},identity:{flexDirection:'row',gap:12,alignItems:'center',marginBottom:22},badge:{textAlign:'center',padding:16,borderRadius:18,fontSize:27,backgroundColor:'#b5e4d7',color:'#1b4b46'},pale:{color:'#dcf3ea',fontWeight:'700',marginBottom:6},input:{backgroundColor:'#f4faf6',color:'#12342f',fontSize:17,borderRadius:12,padding:11},modes:{flexDirection:'row',gap:9},mode:{flex:1,padding:13,borderRadius:13,alignItems:'center',backgroundColor:'#304d5a'},active:{backgroundColor:'#c3efdd'},modeText:{color:'white',fontWeight:'700'},activeText:{color:'#16473e'},bottom:{flexGrow:1,justifyContent:'flex-end',paddingTop:35},note:{color:'#daeae5',marginBottom:16,lineHeight:20},start:{backgroundColor:'#ffda84',minHeight:50,borderRadius:26,alignItems:'center',justifyContent:'center'},startText:{fontSize:18,fontWeight:'800',color:'#342e1c'}
});
