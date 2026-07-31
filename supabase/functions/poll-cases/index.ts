import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptIdentifier } from '../_shared/caseCrypto.ts';
import { fetchUscisStatus, OfficialApiError } from '../_shared/uscisClient.ts';
import { syncResearchObservations } from '../_shared/research.ts';

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const required=(name:string)=>{const value=Deno.env.get(name);if(!value)throw new Error(`Missing ${name}`);return value;};
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const milestone=(status:string)=>{const s=status.toLowerCase();if(/card|document.*mailed|delivered|produced/.test(s))return'delivery';if(/approved|denied|decision|closed/.test(s))return'decision';if(/interview|oath|ceremony/.test(s))return'interview';if(/evidence|rfe|request for/.test(s))return'evidence';if(/fingerprint|biometric/.test(s))return'biometrics';if(/review|transferred|office/.test(s))return'review';return'filed';};

async function sendPush(tokens:string[],title:string,body:string,caseId:string){
  if(!tokens.length)return true;
  const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(tokens.map(to=>({to,title,body,sound:'default',channelId:'case-updates',data:{kind:'case-update',caseId}})))});
  return response.ok;
}

Deno.serve(async req=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(Deno.env.get('POLLING_ENABLED')!=='true')return json({enabled:false,reason:'Set POLLING_ENABLED=true only after production credentials, encryption, and quota monitoring are ready.'},503);
  if(req.headers.get('x-poll-secret')!==required('POLLING_SHARED_SECRET'))return json({error:'Unauthorized'},401);
  const db=createClient(required('SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
  const dailyLimit=Number(Deno.env.get('USCIS_DAILY_QUOTA')??(required('USCIS_API_BASE_URL').includes('api-int.uscis.gov')?'1000':'400000'));
  const {data:due,error}=await db.from('cases').select('*').eq('source','uscis').eq('terminal',false).lte('next_poll_at',new Date().toISOString()).order('next_poll_at').limit(100);
  if(error)return json({error:'Unable to load due cases'},500);
  const summary={due:due?.length??0,checked:0,changed:0,notified:0,failed:0,quotaStopped:false};

  for(const row of due??[]){
    const {data:reserved}=await db.rpc('reserve_uscis_request',{daily_limit:dailyLimit});
    if(!reserved){summary.quotaStopped=true;break;}
    await wait(110+Math.floor(Math.random()*40)); // stay below 10 TPS with jitter
    try{
      const official=await fetchUscisStatus(await decryptIdentifier(row.identifier_ciphertext));
      summary.checked++;
      const now=new Date();
      const current=official.rawEvents[0];
      let insertedEvent:{id:string}|null=null;
      if(current){
        const sourceHash=await hash(`${current.status}|${current.occurredAt}`);
        const inserted=await db.from('case_events').insert({case_id:row.id,source_hash:sourceHash,status:current.status,description:current.description,milestone:milestone(current.status),occurred_at:current.occurredAt}).select('id').maybeSingle();
        if(!inserted.error)insertedEvent=inserted.data;
        else if(inserted.error.code!=='23505')throw inserted.error;
        for(const historical of official.rawEvents.slice(1)){
          const historicalHash=await hash(`${historical.status}|${historical.occurredAt}`);
          await db.from('case_events').upsert({case_id:row.id,source_hash:historicalHash,status:historical.status,description:historical.description,milestone:milestone(historical.status),occurred_at:historical.occurredAt},{onConflict:'case_id,source_hash',ignoreDuplicates:true});
        }
      }
      const changed=Boolean(insertedEvent);
      if(changed)summary.changed++;
      const quietSince=changed?null:(row.quiet_since??now.toISOString());
      const quietDays=quietSince?(now.getTime()-new Date(quietSince).getTime())/86400000:0;
      const nextHours=quietDays>=30?24:4;
      await db.from('cases').update({
        status:official.status,form_type:official.formType,milestone:milestone(official.status),terminal:official.terminal,
        last_source_update:current?.occurredAt??row.last_source_update,last_polled_at:now.toISOString(),
        next_poll_at:official.terminal?null:new Date(now.getTime()+nextHours*3600000+Math.random()*15*60000).toISOString(),
        quiet_since:quietSince,poll_failures:0,
        source_snapshot:{source:'uscis',fetchedAt:now.toISOString(),officialUrl:'https://egov.uscis.gov/',freshnessMinutes:0}
      }).eq('id',row.id);
      await syncResearchObservations(db,row.id).catch(()=>console.error('Research observation sync failed.'));

      if(insertedEvent){
        const householdKey=row.household_id??row.owner_id;
        const delivery=await db.from('notification_deliveries').insert({case_event_id:insertedEvent.id,household_key:householdKey,status:'queued'}).select('id').maybeSingle();
        if(!delivery.error&&delivery.data){
          let userIds=[row.owner_id];
          if(row.household_id){const members=(await db.from('household_members').select('user_id').eq('household_id',row.household_id)).data??[];userIds=[...new Set(members.map(x=>x.user_id))];}
          const installations=(await db.from('installations').select('expo_push_token').in('user_id',userIds).eq('enabled',true).eq('case_alerts',true)).data??[];
          const ok=await sendPush([...new Set(installations.map(x=>x.expo_push_token))],row.nickname,current?.status??official.status,row.id);
          await db.from('notification_deliveries').update({status:ok?'sent':'failed',attempted_at:new Date().toISOString()}).eq('id',delivery.data.id);
          if(ok)summary.notified++;
        }
      }
    }catch(error){
      summary.failed++;
      const failures=Number(row.poll_failures??0)+1;
      const retryHours=Math.min(24,Math.pow(2,Math.min(failures,5))/4);
      await db.from('cases').update({poll_failures:failures,last_polled_at:new Date().toISOString(),next_poll_at:new Date(Date.now()+retryHours*3600000+Math.random()*15*60000).toISOString()}).eq('id',row.id);
      const bucket=error instanceof OfficialApiError?(error.status===429?'rate_limits':error.status>=500?'server_errors':'client_errors'):'server_errors';
      const usage=(await db.from('api_usage_daily').select(bucket).eq('usage_date',new Date().toISOString().slice(0,10)).maybeSingle()).data;
      await db.from('api_usage_daily').update({[bucket]:Number(usage?.[bucket]??0)+1,updated_at:new Date().toISOString()}).eq('usage_date',new Date().toISOString().slice(0,10));
    }
  }
  return json(summary);
});
