import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, H1, H2, Pill, Screen } from '@/components/ui';
import { civicsStarter, officialCivicsUrl } from '@/data/officialContent';
import { useTheme } from '@/theme';

export default function Civics(){
  const t=useTheme();const [index,setIndex]=useState(0);const [revealed,setRevealed]=useState(false);const [missed,setMissed]=useState<string[]>([]);
  const question=useMemo(()=>civicsStarter[index],[index]);
  const next=()=>{setIndex((index+1)%civicsStarter.length);setRevealed(false);};
  return <Screen>
    <Pressable accessibilityRole="button" onPress={()=>router.back()}><Text style={[s.back,{color:t.primary}]}>‹ Tools</Text></Pressable>
    <Pill>Official question starter</Pill><H1>Civics practice</H1>
    <Text style={[s.copy,{color:t.muted}]}>Question {index+1} of {civicsStarter.length} · {missed.length} marked to review</Text>
    <Card><H2>{question.question}</H2>
      {revealed?<View style={s.answers}>{question.answers.map(answer=><Text key={answer} style={[s.answer,{color:t.ink}]}>• {answer}</Text>)}</View>:<Text style={[s.hint,{color:t.muted}]}>Say your answer aloud, then reveal accepted answers.</Text>}
      <Button title={revealed?'Hide answers':'Reveal accepted answers'} onPress={()=>setRevealed(!revealed)}/>
      <Button title={missed.includes(question.id)?'Remove from review':'Review this again'} secondary onPress={()=>setMissed(missed.includes(question.id)?missed.filter(x=>x!==question.id):[...missed,question.id])}/>
      <Button title="Next question" secondary onPress={next}/>
    </Card>
    <Card><Pill tone="accent">Test edition matters</Pill><Text style={[s.copy,{color:t.ink}]}>USCIS may assign a civics-test edition based on filing rules. Confirm your edition and use the complete official study materials before your interview.</Text><Button title="Open complete USCIS materials ↗" secondary onPress={()=>Linking.openURL(officialCivicsUrl)}/></Card>
  </Screen>;
}
const s=StyleSheet.create({back:{fontSize:16,fontWeight:'800'},copy:{fontSize:15,lineHeight:22},hint:{fontSize:14,lineHeight:21},answers:{gap:6},answer:{fontSize:17,lineHeight:24,fontWeight:'700'}});
