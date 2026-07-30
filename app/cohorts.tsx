import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, H1, H2, Pill, Screen } from '@/components/ui';
import { milestones } from '@/components/Journey';
import { publicFormMetrics } from '@/data/publicProgress';
import { fetchCohorts } from '@/services/cohorts';
import { CohortInsight, Milestone } from '@/types/domain';
import { useTheme } from '@/theme';

const forms=[...new Set(publicFormMetrics.map(x=>x.formType))];
export default function Cohorts(){
  const t=useTheme();
  const [formType,setFormType]=useState(forms[0]);
  const [milestone,setMilestone]=useState<Milestone>('decision');
  const [cohorts,setCohorts]=useState<CohortInsight[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;setLoading(true);fetchCohorts({formType,milestone}).then(data=>{if(active)setCohorts(data);}).catch(()=>{if(active)setCohorts([]);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[formType,milestone]);
  const official=publicFormMetrics.filter(x=>x.formType===formType);
  return <Screen>
    <Pressable accessibilityRole="button" onPress={()=>router.back()}><Text style={[s.back,{color:t.primary}]}>‹ Tools</Text></Pressable>
    <Pill tone="accent">NextStep Plus preview</Pill><H1>Cases Like Mine</H1>
    <Text style={[s.copy,{color:t.muted}]}>Explore broad public progress and privacy-safe cohorts. No receipt numbers or individual cases are exposed.</Text>
    <H2>Form type</H2>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{forms.map(form=><Chip key={form} label={form} active={form===formType} onPress={()=>setFormType(form)}/>)}</ScrollView>
    <H2>Milestone</H2>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{milestones.map(item=><Chip key={item.key} label={item.label} active={item.key===milestone} onPress={()=>setMilestone(item.key)}/>)}</ScrollView>
    {loading?<Card><Text style={[s.copy,{color:t.muted}]}>Checking the latest cohort release…</Text></Card>:cohorts.length?cohorts.map(cohort=><Card key={cohort.id}>
      <View style={s.row}><H2>{cohort.formType} · {milestones.find(x=>x.key===cohort.milestone)?.label}</H2><Pill>n={cohort.sampleSize}</Pill></View>
      <Text style={[s.range,{color:t.ink}]}>{cohort.p25Days}–{cohort.p75Days} days</Text>
      <Text style={[s.copy,{color:t.ink}]}>Middle observation: {cohort.medianDays} days · moved in last 30 days: {cohort.movedLast30Days??'not reported'}</Text>
      <Text style={[s.note,{color:t.muted}]}>p25–p75 · {cohort.sourceLabel} · release {cohort.sourceDate}. This is not a prediction for an individual case.</Text>
    </Card>):<Card>
      <Pill>Protected threshold</Pill><H2>No publishable cohort yet</H2>
      <Text style={[s.copy,{color:t.muted}]}>NextStep hides groups with fewer than 50 opted-in observations. Broad USCIS operational statistics remain available below.</Text>
    </Card>}
    {official.map(metric=><Card key={metric.id}>
      <Pill tone="good">Official aggregate</Pill><H2>{metric.formType} · {metric.category}</H2>
      <Text style={[s.range,{color:t.ink}]}>{metric.processingMonths} months</Text>
      <Text style={[s.copy,{color:t.muted}]}>Published national median · {metric.pending.toLocaleString()} pending at period end. It does not describe a same-filing-date cohort.</Text>
    </Card>)}
    <Button title="Read full public methodology" secondary onPress={()=>router.push('/progress')}/>
  </Screen>;
}
function Chip({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){const t=useTheme();return <Pressable accessibilityRole="radio" accessibilityState={{checked:active}} onPress={onPress} style={[s.chip,{backgroundColor:active?t.primary:t.surface,borderColor:t.line}]}><Text style={{color:active?'#fff':t.ink,fontWeight:'800'}}>{label}</Text></Pressable>;}
const s=StyleSheet.create({back:{fontSize:16,fontWeight:'800'},copy:{fontSize:15,lineHeight:22},note:{fontSize:12,lineHeight:18},chips:{gap:8,paddingRight:20},chip:{borderWidth:1,borderRadius:999,paddingHorizontal:14,paddingVertical:10},row:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:8},range:{fontSize:29,fontWeight:'900'}});
