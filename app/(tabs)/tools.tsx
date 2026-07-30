import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, H1, H2, Pill, Screen } from '@/components/ui';
import { useTheme } from '@/theme';
const tools=[
 {title:'Visa Bulletin',copy:'See current family- and employment-based priority dates.',url:'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html'},
 {title:'USCIS processing times',copy:'Compare your filing with official published time ranges.',url:'https://egov.uscis.gov/processing-times/'},
 {title:'NVC timeframes',copy:'Review current inquiry and case-creation timeframes.',url:'https://travel.state.gov/content/travel/en/us-visas/immigrate/nvc-timeframes.html'},
 {title:'Immigration court status',copy:'Open EOIR’s official Automated Case Information System.',url:'https://acis.eoir.justice.gov/en/'}];
export default function Tools(){const t=useTheme();return <Screen>
  <H1>Tools and learning</H1><Text style={[s.copy,{color:t.muted}]}>Official resources, privacy-safe comparisons, and practice tools without advertising or a noisy community feed.</Text>
  <Card style={{backgroundColor:t.primarySoft}}><Pill tone="accent">NextStep Plus preview</Pill><H2>Cases Like Mine</H2><Text style={[s.copy,{color:t.ink}]}>Compare broad progress and thresholded cohorts without exposing anyone’s receipt number.</Text><Button title="Explore private cohorts" onPress={()=>router.push('/cohorts' as never)}/></Card>
  <Card><Pill tone="good">USCIS public data</Pill><H2>Public case progress</H2><Text style={[s.copy,{color:t.muted}]}>Compare reported decisions, pending workload, and processing time by form category.</Text><Button title="View public progress" secondary onPress={()=>router.push('/progress')}/></Card>
  <Card><Pill>Civics</Pill><H2>Practice citizenship questions</H2><Text style={[s.copy,{color:t.muted}]}>Practice from a versioned starter set and verify your test edition with USCIS.</Text><Button title="Start civics practice" secondary onPress={()=>router.push('/civics' as never)}/></Card>
  <Card><Pill>Updates</Pill><H2>Official source center</H2><Text style={[s.copy,{color:t.muted}]}>Visa Bulletin, NVC timeframes, USCIS news, and EOIR links in one attributable catalog.</Text><Button title="Browse official updates" secondary onPress={()=>router.push('/official-updates' as never)}/></Card>
  {tools.map((x,i)=><Card key={x.title}><View style={s.row}><Pill>{String(i+1).padStart(2,'0')}</Pill><H2>{x.title}</H2></View><Text style={[s.copy,{color:t.muted}]}>{x.copy}</Text><Button title="Open official source ↗" secondary onPress={()=>Linking.openURL(x.url)}/></Card>)}
</Screen>;}
const s=StyleSheet.create({copy:{fontSize:16,lineHeight:23},row:{flexDirection:'row',alignItems:'center',gap:10}});
