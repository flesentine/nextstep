import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptIdentifier, encryptIdentifier, fingerprintIdentifier } from '../_shared/caseCrypto.ts';
import { fetchUscisStatus, OfficialApiError } from '../_shared/uscisClient.ts';

const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type','access-control-allow-methods':'GET, POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});
const required=(name:string)=>{const value=Deno.env.get(name);if(!value)throw new Error(`Missing ${name}`);return value;};
const normalizeReceipt=(value:unknown)=>String(value??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const validReceipt=(value:string)=>/^(EAC|IOE|LIN|MCT|MGL|MSC|NBC|SRC|WAC|YSC|ZAR|ZCH|ZHN)\d{10}$/.test(value);
const terminal=(status:string)=>/denied|approved|delivered|closed|withdrawn/i.test(status);
const milestone=(status:string)=>{const s=status.toLowerCase();if(/card|document.*mailed|delivered|produced/.test(s))return'delivery';if(/approved|denied|decision|closed/.test(s))return'decision';if(/interview|oath|ceremony/.test(s))return'interview';if(/evidence|rfe|request for/.test(s))return'evidence';if(/fingerprint|biometric/.test(s))return'biometrics';if(/review|transferred|office/.test(s))return'review';return'filed';};
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');

const guidance:Record<string,unknown>={
  filed:{version:1,changed:'Your application was received and assigned a receipt number.',meaning:'USCIS accepted the filing into its system. This is not an approval.',nextSteps:['Save the receipt notice.','Confirm your mailing address.','Watch for an appointment notice.'],reviewedAt:'2026-07-18'},
  biometrics:{version:1,changed:'USCIS recorded a biometrics-related update.',meaning:'Fingerprints, a photograph, or a signature may be required or reused.',nextSteps:['Read the official notice.','Bring accepted identification.','Use the official rescheduling process if needed.'],reviewedAt:'2026-07-18'},
  review:{version:1,changed:'Your case is under review.',meaning:'The public status does not reveal internal activity or timing.',nextSteps:['Keep contact information current.','Gather originals.','Check official processing times.'],reviewedAt:'2026-07-18'},
  evidence:{version:1,changed:'Additional evidence may be needed.',meaning:'The official notice contains the exact request and deadline.',nextSteps:['Open the notice immediately.','List every requested item.','Consider qualified legal help if unclear.'],reviewedAt:'2026-07-18'},
  interview:{version:1,changed:'An interview-related update was posted.',meaning:'The official appointment notice controls.',nextSteps:['Confirm the notice details.','Prepare originals and translations.','Plan accessibility needs.'],reviewedAt:'2026-07-18'},
  decision:{version:1,changed:'USCIS posted a decision-related update.',meaning:'Read the exact official notice before acting.',nextSteps:['Keep the official notice.','Follow notice deadlines.','Seek prompt qualified advice for an adverse decision.'],reviewedAt:'2026-07-18'},
  delivery:{version:1,changed:'A document or card moved into production or delivery.',meaning:'USCIS may provide tracking after mailing.',nextSteps:['Confirm your address.','Use official tracking.','Follow USCIS instructions if it does not arrive.'],reviewedAt:'2026-07-18'}
};

function admin(){return createClient(required('SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});}
async function quotaControlledStatus(db:ReturnType<typeof admin>,identifier:string){
  const dailyLimit=Number(Deno.env.get('USCIS_DAILY_QUOTA')??(required('USCIS_API_BASE_URL').includes('api-int.uscis.gov')?'1000':'400000'));
  const {data:reserved,error}=await db.rpc('reserve_uscis_request',{daily_limit:dailyLimit});
  if(error)throw error;
  if(!reserved)throw new OfficialApiError(429,'The daily USCIS request budget has been reached. Try again after the quota resets.');
  return fetchUscisStatus(identifier);
}
async function authenticatedUser(req:Request){
  const auth=req.headers.get('authorization');
  if(!auth)return null;
  const client=createClient(required('SUPABASE_URL'),required('PROJECT_PUBLIC_KEY'),{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  return (await client.auth.getUser()).data.user;
}

async function insertEvents(db:ReturnType<typeof admin>,caseId:string,rawEvents:Array<{status:string;description:string;occurredAt:string}>){
  if(!rawEvents.length)return;
  const rows=await Promise.all(rawEvents.map(async event=>({case_id:caseId,source_hash:await hash(`${event.status}|${event.occurredAt}`),status:event.status,description:event.description,milestone:milestone(event.status),occurred_at:event.occurredAt})));
  const {error}=await db.from('case_events').upsert(rows,{onConflict:'case_id,source_hash',ignoreDuplicates:true});
  if(error)throw error;
}

const publicCase=(row:Record<string,unknown>,events:Array<Record<string,unknown>>=[])=>({
  id:row.id,source:row.source,nickname:row.nickname,applicant:row.applicant,formType:row.form_type,status:row.status,
  milestone:row.milestone,lastSourceUpdate:row.last_source_update,lastPolledAt:row.last_polled_at,nextPollAt:row.next_poll_at,
  terminal:row.terminal,createdAt:row.created_at,sourceSnapshot:row.source_snapshot,
  events:events.map(event=>({id:event.id,status:event.status,description:event.description,milestone:event.milestone,occurredAt:event.occurred_at,sourceHash:event.source_hash}))
});

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  try{
    const url=new URL(req.url);
    const path=url.pathname.replace(/^.*\/case-api/,'');
    const db=admin();
    const sandbox=required('USCIS_API_BASE_URL').includes('api-int.uscis.gov');
    const guestSandbox=sandbox&&Deno.env.get('ALLOW_GUEST_SANDBOX')==='true';
    const user=await authenticatedUser(req);

    // Compatibility endpoint used only by the staging-receipt guest build.
    if(req.method==='POST'&&(path.endsWith('/v1/cases/status')||path===''||path==='/')){
      const body=await req.json();
      if(body.action!=='status'&&!path.endsWith('/v1/cases/status'))return json({error:'Not found'},404);
      if(!user&&!guestSandbox)return json({error:'Unauthorized'},401);
      const identifier=normalizeReceipt(body.identifier);
      if(body.source!=='uscis'||!validReceipt(identifier))return json({error:'Invalid identifier'},400);
      return json(await quotaControlledStatus(db,identifier));
    }

    if(!user)return json({error:'Unauthorized'},401);

    if(req.method==='POST'&&path==='/v1/cases'){
      const body=await req.json();
      const source=String(body.source??'uscis');
      if(source!=='uscis')return json({error:'Only USCIS automated creation is enabled. Use the official-link journey for NVC or EOIR.'},422);
      const identifier=normalizeReceipt(body.identifier);
      if(!validReceipt(identifier))return json({error:'Invalid USCIS receipt number.'},422);
      const official=await quotaControlledStatus(db,identifier);
      const now=new Date().toISOString();
      const row={
        owner_id:user.id,source,identifier_ciphertext:await encryptIdentifier(identifier),
        identifier_fingerprint:await fingerprintIdentifier(source,identifier),nickname:String(body.nickname??official.formType),
        applicant:String(body.applicant??'Me'),form_type:String(body.formType??official.formType),status:official.status,
        milestone:milestone(official.status),last_source_update:official.rawEvents[0]?.occurredAt??now,last_polled_at:now,
        next_poll_at:new Date(Date.now()+4*3600000).toISOString(),terminal:official.terminal,
        source_snapshot:{source:'uscis',fetchedAt:now,officialUrl:'https://egov.uscis.gov/',freshnessMinutes:0}
      };
      const {data,error}=await db.from('cases').insert(row).select('*').single();
      if(error?.code==='23505')return json({error:'This case is already tracked.'},409);
      if(error)throw error;
      await insertEvents(db,data.id,official.rawEvents);
      const events=(await db.from('case_events').select('id,status,description,milestone,occurred_at,source_hash').eq('case_id',data.id).order('occurred_at',{ascending:false})).data??[];
      return json(publicCase(data,events),201);
    }

    const caseMatch=path.match(/^\/v1\/cases\/([0-9a-f-]+)(?:\/(refresh|guidance))?$/i);
    if(caseMatch){
      const caseId=caseMatch[1],action=caseMatch[2];
      const {data:caseRow,error}=await db.from('cases').select('*').eq('id',caseId).eq('owner_id',user.id).maybeSingle();
      if(error)throw error;if(!caseRow)return json({error:'Case not found'},404);
      if(req.method==='GET'&&!action){
        const events=(await db.from('case_events').select('id,status,description,milestone,occurred_at,source_hash').eq('case_id',caseId).order('occurred_at',{ascending:false})).data??[];
        return json(publicCase(caseRow,events));
      }
      if(req.method==='GET'&&action==='guidance')return json({statusKey:caseRow.milestone,...(guidance[caseRow.milestone] as Record<string,unknown>)});
      if(req.method==='POST'&&action==='refresh'){
        if(caseRow.terminal)return json({error:'Polling has stopped because this case has a terminal status.'},409);
        const official=await quotaControlledStatus(db,await decryptIdentifier(caseRow.identifier_ciphertext));
        const now=new Date().toISOString();
        await insertEvents(db,caseId,official.rawEvents);
        const {data:updated,error:updateError}=await db.from('cases').update({
          status:official.status,form_type:official.formType,milestone:milestone(official.status),terminal:terminal(official.status),
          last_source_update:official.rawEvents[0]?.occurredAt??now,last_polled_at:now,
          next_poll_at:official.terminal?null:new Date(Date.now()+4*3600000).toISOString(),poll_failures:0,
          source_snapshot:{source:'uscis',fetchedAt:now,officialUrl:'https://egov.uscis.gov/',freshnessMinutes:0}
        }).eq('id',caseId).select('*').single();
        if(updateError)throw updateError;
        const events=(await db.from('case_events').select('id,status,description,milestone,occurred_at,source_hash').eq('case_id',caseId).order('occurred_at',{ascending:false})).data??[];
        return json(publicCase(updated,events));
      }
      return json({error:'Method not allowed'},405);
    }

    if(req.method==='GET'&&path==='/v1/cohorts'){
      let query=db.from('public_cohort_insights').select('id,form_type,filing_month,receipt_prefix,milestone,sample_size,p25_days,median_days,p75_days,approvals,denials,moved_last_30_days,source_date,source_label').gte('sample_size',50);
      for(const [key,column] of [['formType','form_type'],['receiptPrefix','receipt_prefix'],['milestone','milestone']] as const){const value=url.searchParams.get(key);if(value)query=query.eq(column,value);}
      const {data,error}=await query.order('source_date',{ascending:false}).limit(100);if(error)throw error;return json({cohorts:data??[]});
    }
    return json({error:'Not found'},404);
  }catch(error){
    if(error instanceof OfficialApiError)return json({error:error.safeMessage,details:{category:error.category,reference:error.reference,traceId:error.traceId}},error.status);
    console.error(error instanceof Error?error.message:'Unhandled server error');
    return json({error:'Unexpected server error'},500);
  }
});
