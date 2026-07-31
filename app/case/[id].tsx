import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Button, Card, Divider, H1, H2, Pill, Screen } from '@/components/ui';
import { Journey } from '@/components/Journey';
import { guidanceByMilestone } from '@/data/guidance';
import { scheduleReminder } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme';

const daysBetween=(start:string,end=new Date().toISOString())=>Math.max(0,Math.floor((new Date(end).getTime()-new Date(start).getTime())/86400000));
const calendarText=(title:string,date:Date)=>[
  'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//NextStep//Case Tracker//EN','BEGIN:VEVENT',
  `UID:${Crypto.randomUUID()}@nextstep.local`,
  `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,
  `DTSTART:${date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,
  `SUMMARY:${title.replace(/[,\n]/g,' ')}`,
  'DESCRIPTION:Educational reminder from NextStep. Verify all deadlines in the official government notice.',
  'END:VEVENT','END:VCALENDAR'
].join('\r\n');

export default function CaseDetail(){
  const t=useTheme();
  const {id}=useLocalSearchParams<{id:string}>();
  const record=useAppStore(s=>s.cases.find(c=>c.id===id));
  const refresh=useAppStore(s=>s.refreshCase);
  const updateCase=useAppStore(s=>s.updateCase);
  const remove=useAppStore(s=>s.removeCase);
  const [busy,setBusy]=useState(false);
  const [notes,setNotes]=useState(record?.documentNotes??'');
  const filedAt=useMemo(()=>record?.events.length?record.events.reduce((oldest,event)=>event.occurredAt<oldest?event.occurredAt:oldest,record.events[0].occurredAt):record?.createdAt,[record]);

  if(!record)return <Screen><H1>Case unavailable</H1><Button title="Back to journey" onPress={()=>router.replace('/(tabs)')}/></Screen>;
  const guidance=guidanceByMilestone[record.milestone];
  const reminders=record.reminders??[];

  const doRefresh=async()=>{try{setBusy(true);await refresh(record.id);}catch(e){Alert.alert('Refresh unavailable',e instanceof Error?e.message:'Try again later.');}finally{setBusy(false);}};
  const addReminder=async()=>{
    const due=new Date(Date.now()+7*86400000);
    const reminder={id:Crypto.randomUUID(),caseId:record.id,title:`Review ${record.nickname}`,dueAt:due.toISOString(),complete:false};
    await updateCase(record.id,{reminders:[...reminders,reminder]});
    try{await scheduleReminder(reminder.title,due);}catch{}
    Alert.alert('Reminder added',`Scheduled for ${due.toLocaleDateString()}. You can change system notification permissions in Settings.`);
  };
  const exportCalendar=async()=>{
    const due=reminders.find(x=>!x.complete)?.dueAt;
    if(!due){Alert.alert('Add a reminder first','Calendar export uses the next incomplete reminder date.');return;}
    await Share.share({title:`${record.nickname} reminder`,message:calendarText(`NextStep: ${record.nickname}`,new Date(due))});
  };

  return <Screen>
    <View style={s.top}><Pressable accessibilityRole="button" onPress={()=>router.back()}><Text style={[s.back,{color:t.primary}]}>‹ Journey</Text></Pressable><Pill>{record.source}</Pill></View>
    <H1>{record.nickname}</H1>
    <Text style={[s.meta,{color:t.muted}]}>{record.applicant} · {record.formType}</Text>
    <Card>
      <Pill tone={record.terminal?'good':'soft'}>{record.terminal?'Terminal status':'Official status'}</Pill>
      <Text style={[s.status,{color:t.ink}]}>{record.status}</Text>
      <Journey current={record.milestone} detailed/>
      <View style={s.factRow}>
        <View style={s.fact}><Text style={[s.factLabel,{color:t.muted}]}>FILED</Text><Text style={[s.factValue,{color:t.ink}]}>{filedAt?new Date(filedAt).toLocaleDateString():'Unknown'}</Text></View>
        <View style={s.fact}><Text style={[s.factLabel,{color:t.muted}]}>ELAPSED</Text><Text style={[s.factValue,{color:t.ink}]}>{filedAt?`${daysBetween(filedAt)} days`:'Unknown'}</Text></View>
        <View style={s.fact}><Text style={[s.factLabel,{color:t.muted}]}>CHECKED</Text><Text style={[s.factValue,{color:t.ink}]}>{new Date(record.snapshot.fetchedAt).toLocaleDateString()}</Text></View>
      </View>
      <Text style={[s.fresh,{color:t.muted}]}>Source checked {new Date(record.snapshot.fetchedAt).toLocaleString()} · freshness {record.snapshot.freshnessMinutes} min</Text>
      <Button title={busy?'Checking…':'Check for an update'} disabled={busy||record.source!=='uscis'} onPress={doRefresh}/>
      <Button title="Verify at official source ↗" secondary onPress={()=>Linking.openURL(record.snapshot.officialUrl)}/>
    </Card>

    <H2>Your next step</H2>
    <InfoCard title="What changed" body={guidance.changed}/>
    <InfoCard title="What it means" body={guidance.meaning}/>
    <Card>
      <Pill tone="accent">What you can do now</Pill>
      {guidance.nextSteps.map(step=><View key={step} style={s.task}><View style={[s.check,{borderColor:t.primary}]}/><Text style={[s.taskText,{color:t.ink}]}>{step}</Text></View>)}
      <Text style={[s.reviewed,{color:t.muted}]}>Educational guidance v{guidance.version} · reviewed {guidance.reviewedAt}</Text>
      <Button title="Open guidance source ↗" secondary onPress={()=>Linking.openURL(guidance.officialUrl)}/>
    </Card>

    <H2>Reminders and notes</H2>
    <Card>
      {reminders.length===0?<Text style={[s.meta,{color:t.muted}]}>No reminders yet. Dates in official notices always control.</Text>:reminders.map(reminder=><Pressable key={reminder.id} accessibilityRole="checkbox" accessibilityState={{checked:reminder.complete}} onPress={()=>updateCase(record.id,{reminders:reminders.map(x=>x.id===reminder.id?{...x,complete:!x.complete}:x)})} style={s.reminder}><View style={[s.check,{borderColor:t.primary,backgroundColor:reminder.complete?t.primary:'transparent'}]}/><View style={s.grow}><Text style={[s.taskText,{color:t.ink,textDecorationLine:reminder.complete?'line-through':'none'}]}>{reminder.title}</Text><Text style={[s.meta,{color:t.muted}]}>{new Date(reminder.dueAt).toLocaleString()}</Text></View></Pressable>)}
      <Button title="Remind me in 7 days" onPress={addReminder}/>
      <Button title="Export next reminder to calendar" secondary onPress={exportCalendar}/>
      <Text style={[s.label,{color:t.ink}]}>Private document notes</Text>
      <TextInput multiline value={notes} onChangeText={setNotes} placeholder="For example: notice stored in blue folder" placeholderTextColor={t.muted} style={[s.notes,{color:t.ink,borderColor:t.line,backgroundColor:t.background}]}/>
      <Button title="Save notes on this device" secondary onPress={async()=>{await updateCase(record.id,{documentNotes:notes});Alert.alert('Notes saved','These notes stay in the local case record and are excluded from public analytics.');}}/>
    </Card>

    {record.estimate&&<Card>
      <View style={s.top}><H2>Observed range</H2><Pill tone="accent">Free during launch</Pill></View>
      <Text style={[s.range,{color:t.ink}]}>{new Date(record.estimate.earliest).toLocaleDateString()} – {new Date(record.estimate.latest).toLocaleDateString()}</Text>
      <Text style={[s.meta,{color:t.muted}]}>p{record.estimate.percentileLow??25}–p{record.estimate.percentileHigh??75} · {record.estimate.cohortLabel??'similar public observations'} · n={record.estimate.sampleSize.toLocaleString()} · source {record.estimate.sourceDate} · confidence {record.estimate.confidence}. This is not a government estimate or promised decision date.</Text>
    </Card>}

    <H2>Complete case timeline</H2>
    <Card>{record.events.map((event,index)=><View key={event.id}>
      <Text style={[s.eventTitle,{color:t.ink}]}>{event.status}</Text>
      <Text style={[s.meta,{color:t.muted}]}>{new Date(event.occurredAt).toLocaleString()} · {event.milestone}</Text>
      {event.description!==event.status&&<Text style={[s.meta,{color:t.ink}]}>{event.description}</Text>}
      {index<record.events.length-1&&<Divider/>}
    </View>)}</Card>

    <Button title="Remove case" secondary onPress={()=>Alert.alert('Remove this case?','The protected identifier and local history will be deleted from this device.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:async()=>{await remove(record.id);router.replace('/(tabs)');}}])}/>
    <Text style={[s.disclaimer,{color:t.muted}]}>NextStep is independent and is not affiliated with USCIS, the Department of State, or EOIR. Official notices control.</Text>
  </Screen>;
}

function InfoCard({title,body}:{title:string;body:string}){const t=useTheme();return <Card><Pill>{title}</Pill><Text style={[s.body,{color:t.ink}]}>{body}</Text></Card>;}
const s=StyleSheet.create({
  top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  back:{fontSize:16,fontWeight:'800'},grow:{flex:1},meta:{fontSize:14,lineHeight:21},status:{fontSize:20,lineHeight:27,fontWeight:'800'},
  fresh:{fontSize:12,textAlign:'center'},body:{fontSize:17,lineHeight:25},task:{flexDirection:'row',gap:10,alignItems:'flex-start'},
  reminder:{flexDirection:'row',gap:10,alignItems:'center',minHeight:44},check:{width:20,height:20,borderRadius:6,borderWidth:2,marginTop:2},
  taskText:{flex:1,fontSize:15,lineHeight:22},reviewed:{fontSize:11,marginTop:5},range:{fontSize:21,fontWeight:'800'},
  eventTitle:{fontSize:16,lineHeight:22,fontWeight:'700'},disclaimer:{fontSize:12,lineHeight:18,textAlign:'center'},
  factRow:{flexDirection:'row',flexWrap:'wrap',gap:8},fact:{flexGrow:1,flexBasis:88,padding:10,borderRadius:12},factLabel:{fontSize:10,fontWeight:'900',letterSpacing:.5},factValue:{fontSize:14,fontWeight:'800'},
  label:{fontSize:14,fontWeight:'800',marginTop:4},notes:{minHeight:96,borderWidth:1,borderRadius:14,padding:12,textAlignVertical:'top',fontSize:15,lineHeight:21}
});
