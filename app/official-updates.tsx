import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, H1, H2, Pill, Screen } from '@/components/ui';
import { officialContentRelease } from '@/data/officialContent';
import { useTheme } from '@/theme';

export default function OfficialUpdates(){const t=useTheme();return <Screen>
  <Pressable accessibilityRole="button" onPress={()=>router.back()}><Text style={[s.back,{color:t.primary}]}>‹ Tools</Text></Pressable>
  <View style={s.row}><View style={s.grow}><Pill tone="good">Government sources only</Pill><H1>Official updates</H1></View><Pill>v{officialContentRelease.version}</Pill></View>
  <Text style={[s.copy,{color:t.muted}]}>Case alerts remain separate from educational and policy updates so an important case change cannot be buried.</Text>
  {officialContentRelease.sources.map(source=><Card key={source.id}><H2>{source.title}</H2><Text style={[s.copy,{color:t.muted}]}>{source.copy}</Text><Text style={[s.checked,{color:t.muted}]}>Source catalog checked {officialContentRelease.checkedAt}</Text><Button title="Open official source ↗" secondary onPress={()=>Linking.openURL(source.url)}/></Card>)}
</Screen>;}
const s=StyleSheet.create({back:{fontSize:16,fontWeight:'800'},row:{flexDirection:'row',alignItems:'flex-start',gap:8},grow:{flex:1,gap:8},copy:{fontSize:15,lineHeight:22},checked:{fontSize:11}});
