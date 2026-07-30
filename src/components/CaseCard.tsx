import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CaseRecord } from '@/types/domain';
import { Card, Pill } from './ui';
import { Journey } from './Journey';
import { useTheme } from '@/theme';

const elapsed=(date:string)=>{const days=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/86400000));return days===0?'Updated today':`Updated ${days} day${days===1?'':'s'} ago`;};
export function CaseCard({record}: {record:CaseRecord}){const t=useTheme();return <Pressable accessibilityRole="button" accessibilityLabel={`${record.nickname}, ${record.applicant}, ${record.formType}, ${record.status}`} accessibilityHint="Opens the case journey" onPress={()=>router.push(`/case/${record.id}`)}><Card><View style={s.row}><View style={s.grow}><Text style={[s.name,{color:t.ink}]}>{record.nickname}</Text><Text style={[s.meta,{color:t.muted}]}>{record.applicant} · {record.formType}</Text></View><Pill>{record.source}</Pill></View><Text style={[s.status,{color:t.ink}]}>{record.status}</Text><Text style={[s.meta,{color:t.muted}]}>{elapsed(record.lastUpdatedAt)}</Text><Journey current={record.milestone}/></Card></Pressable>}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'flex-start',gap:12},grow:{flex:1},name:{fontSize:20,fontWeight:'800'},meta:{fontSize:13,lineHeight:19},status:{fontSize:15,lineHeight:21,fontWeight:'600'}});
