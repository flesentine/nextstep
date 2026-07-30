import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, H1, H2, Pill, Screen } from '@/components/ui';
import { decisionApprovalShare, progressInterpretation, publicFormMetrics, publicProgressRelease, workloadPace } from '@/data/publicProgress';
import { fetchLatestPublicProgress } from '@/services/publicProgress';
import { useTheme } from '@/theme';

const percent=(value:number)=>`${Math.round(value*100)}%`;
const count=(value:number)=>value.toLocaleString();

export default function PublicProgress(){
  const t=useTheme();
  const [metrics,setMetrics]=useState(publicFormMetrics);
  const [release,setRelease]=useState(publicProgressRelease);
  const [selectedId,setSelectedId]=useState(publicFormMetrics[0].id);
  useEffect(()=>{let active=true;fetchLatestPublicProgress().then(result=>{if(active&&result){setMetrics(result.metrics);setRelease(result.release);setSelectedId(result.metrics[0].id);}}).catch(()=>{});return()=>{active=false;};},[]);
  const metric=metrics.find(x=>x.id===selectedId)??metrics[0];
  const approvalShare=decisionApprovalShare(metric);
  const pace=workloadPace(metric);
  return <Screen>
    <Pressable accessibilityRole="button" onPress={()=>router.back()} hitSlop={10}><Text style={[s.back,{color:t.primary}]}>‹ Tools</Text></Pressable>
    <View style={s.titleRow}><View style={s.grow}><Pill tone="good">Official aggregate data</Pill><H1>Public case progress</H1></View><Pill>{release.period}</Pill></View>
    <Text style={[s.intro,{color:t.muted}]}>See how USCIS-reported decisions and workload are moving by form type. These are public operational totals—not a prediction of any individual result.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} accessibilityRole="radiogroup">
      {metrics.map(x=><Pressable key={x.id} accessibilityRole="radio" accessibilityState={{checked:x.id===selectedId}} onPress={()=>setSelectedId(x.id)} style={[s.chip,{borderColor:t.line,backgroundColor:x.id===selectedId?t.primary:t.surface}]}><Text style={[s.chipForm,{color:x.id===selectedId?'#fff':t.ink}]}>{x.formType}</Text><Text numberOfLines={1} style={[s.chipCategory,{color:x.id===selectedId?'#fff':t.muted}]}>{x.category}</Text></Pressable>)}
    </ScrollView>
    <Card>
      <View style={s.titleRow}><View style={s.grow}><H2>{metric.formType} · {metric.category}</H2><Text style={[s.description,{color:t.muted}]}>{metric.description}</Text></View></View>
      <Text style={[s.bigNumber,{color:t.ink}]}>{percent(approvalShare)}</Text>
      <Text style={[s.bigLabel,{color:t.ink}]}>of reported decisions were approvals</Text>
      <View accessibilityLabel={`${percent(approvalShare)} approvals and ${percent(1-approvalShare)} denials among reported decisions`} style={[s.bar,{backgroundColor:t.line}]}><View style={[s.barFill,{backgroundColor:t.good,width:`${approvalShare*100}%`}]}/></View>
      <View style={s.legend}><Text style={[s.legendText,{color:t.muted}]}>Approved {count(metric.approved)}</Text><Text style={[s.legendText,{color:t.muted}]}>Denied {count(metric.denied)}</Text></View>
      <Text style={[s.caveat,{color:t.muted}]}>This is the share of decisions reported during the quarter. It is not an approval probability because those cases were not necessarily filed in the same period.</Text>
    </Card>
    <View style={s.metrics}>
      <Card style={s.metricCard}><Text style={[s.metricLabel,{color:t.muted}]}>Median processing</Text><Text style={[s.metricValue,{color:t.ink}]}>{metric.processingMonths} mo</Text></Card>
      <Card style={s.metricCard}><Text style={[s.metricLabel,{color:t.muted}]}>Pending at quarter end</Text><Text style={[s.metricValue,{color:t.ink}]}>{count(metric.pending)}</Text></Card>
    </View>
    <Card style={{backgroundColor:t.primarySoft}}>
      <Pill>Workload pace</Pill>
      <Text style={[s.pace,{color:t.ink}]}>{percent(pace)}</Text>
      <Text style={[s.description,{color:t.ink}]}>{count(metric.completions)} completions compared with {count(metric.received)} new receipts.</Text>
      <Text style={[s.description,{color:t.muted}]}>{progressInterpretation(metric)}</Text>
    </Card>
    <Card>
      <Pill>Source and limits</Pill>
      <Text style={[s.description,{color:t.ink}]}>{release.sourceLabel}</Text>
      <Text style={[s.description,{color:t.muted}]}>{release.periodDetail} · published {release.publishedAt}</Text>
      <Text style={[s.caveat,{color:t.muted}]}>National aggregate data can combine service centers and case circumstances. Government notices remain authoritative. NextStep does not use these totals to decide whether a person will be approved.</Text>
      <Button title="Open the USCIS workbook ↗" secondary onPress={()=>Linking.openURL(release.sourceUrl)}/>
    </Card>
  </Screen>;
}

const s=StyleSheet.create({back:{fontSize:16,fontWeight:'800'},titleRow:{flexDirection:'row',alignItems:'flex-start',gap:10},grow:{flex:1,gap:8},intro:{fontSize:16,lineHeight:23},chips:{gap:8,paddingRight:20},chip:{width:132,borderWidth:1,borderRadius:15,paddingHorizontal:12,paddingVertical:10,gap:2},chipForm:{fontSize:14,fontWeight:'900'},chipCategory:{fontSize:11},description:{fontSize:15,lineHeight:21},bigNumber:{fontSize:48,lineHeight:54,fontWeight:'900',letterSpacing:-1.5},bigLabel:{fontSize:17,fontWeight:'800'},bar:{height:11,borderRadius:999,overflow:'hidden'},barFill:{height:'100%',borderRadius:999},legend:{flexDirection:'row',justifyContent:'space-between'},legendText:{fontSize:12,fontWeight:'700'},caveat:{fontSize:12,lineHeight:18},metrics:{flexDirection:'row',gap:10},metricCard:{flex:1},metricLabel:{fontSize:12,lineHeight:17,fontWeight:'700'},metricValue:{fontSize:22,fontWeight:'900'},pace:{fontSize:36,fontWeight:'900'}});
