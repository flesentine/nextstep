import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Milestone } from '@/types/domain';
import { useTheme } from '@/theme';

export const milestones: {key:Milestone;label:string}[]=[{key:'filed',label:'Filed'},{key:'biometrics',label:'Biometrics'},{key:'review',label:'Review'},{key:'evidence',label:'Evidence'},{key:'interview',label:'Interview'},{key:'decision',label:'Decision'},{key:'delivery',label:'Delivery'}];

export function Journey({current,detailed=false}: {current:Milestone;detailed?:boolean}){
  const t=useTheme();
  const active=Math.max(0,milestones.findIndex(m=>m.key===current));
  const next=milestones[active+1];
  return <View accessible={false} style={s.container}>
    {detailed&&<View style={s.summary}>
      <View style={[s.summaryCard,{backgroundColor:t.primarySoft,borderColor:t.primary}]}>
        <Text style={[s.summaryEyebrow,{color:t.primary}]}>CURRENT MILESTONE</Text>
        <Text accessibilityRole="header" style={[s.summaryTitle,{color:t.ink}]}>{milestones[active].label}</Text>
      </View>
      <View style={[s.summaryCard,{backgroundColor:t.surface,borderColor:t.line}]}>
        <Text style={[s.summaryEyebrow,{color:t.muted}]}>NEXT MILESTONE</Text>
        <Text style={[s.summaryTitle,{color:t.ink}]}>{next?.label??'Journey complete'}</Text>
      </View>
    </View>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail} accessibilityLabel={`Case journey. Current milestone: ${milestones[active].label}. ${next?`Next milestone: ${next.label}.`:'No remaining milestones.'}`}>
      {milestones.map((m,i)=><View key={m.key} style={s.step}>
        <View style={[s.dot,{backgroundColor:i<=active?t.primary:t.line},i===active&&{borderColor:t.accent,borderWidth:3}]}/>
        <Text allowFontScaling numberOfLines={2} style={[s.label,{color:i===active?t.ink:t.muted,fontWeight:i===active?'800':'600'}]}>{m.label}</Text>
        {i<milestones.length-1&&<View style={[s.line,{backgroundColor:i<active?t.primary:t.line}]}/>}
      </View>)}
    </ScrollView>
  </View>;
}
const s=StyleSheet.create({
  container:{gap:10},
  summary:{flexDirection:'row',flexWrap:'wrap',gap:10},
  summaryCard:{flexGrow:1,flexBasis:140,borderWidth:1,borderRadius:16,padding:14,gap:4},
  summaryEyebrow:{fontSize:11,fontWeight:'900',letterSpacing:.5},
  summaryTitle:{fontSize:20,lineHeight:25,fontWeight:'800'},
  rail:{paddingVertical:8,paddingHorizontal:2},
  step:{width:88,alignItems:'center',gap:7,position:'relative'},
  dot:{width:18,height:18,borderRadius:10,zIndex:2},
  line:{height:3,position:'absolute',top:8,left:53,width:70},
  label:{fontSize:12,lineHeight:16,textAlign:'center',width:84,minHeight:32}
});
