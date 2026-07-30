import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, H1, Screen } from '@/components/ui';
import { useTheme } from '@/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
export default function Welcome(){const t=useTheme();const continueGuest=async()=>{await AsyncStorage.setItem('nextstep_onboarded','1');router.replace('/(tabs)');};return <Screen><View style={s.hero}><Text style={[s.eyebrow,{color:t.primary}]}>NEXTSTEP</Text><H1>Your case, explained one step at a time.</H1><Text style={[s.copy,{color:t.muted}]}>Track official updates, understand what they mean, and keep the next task clear—without ads.</Text></View><Card><Text style={[s.point,{color:t.ink}]}>✓ Receipt numbers are protected on this device</Text><Text style={[s.point,{color:t.ink}]}>✓ No government affiliation or legal advice</Text><Text style={[s.point,{color:t.ink}]}>✓ Verify every update at its official source</Text></Card><Button title="Continue as guest" onPress={continueGuest}/><Button title="Read privacy promise" secondary onPress={()=>router.push('/(tabs)/settings')}/></Screen>}
const s=StyleSheet.create({hero:{gap:14,paddingVertical:24},eyebrow:{fontSize:13,fontWeight:'900',letterSpacing:2},copy:{fontSize:19,lineHeight:28},point:{fontSize:15,lineHeight:22}});
