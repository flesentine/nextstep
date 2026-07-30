import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchUscisStatus, OfficialApiError } from '../_shared/uscisClient.ts';

const FUNCTION_VERSION='1';
const SUCCESS_STAGING_RECEIPT='EAC9999103403';
const ERROR_TEST_INPUT='INVALID';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{'content-type':'application/json','cache-control':'no-store'}
});
const required=(name:string)=>{
  const value=Deno.env.get(name);
  if(!value)throw new Error(`Missing ${name}`);
  return value;
};
const elapsed=(started:number)=>Math.max(0,Math.round(performance.now()-started));
const safeOperationalText=(value:unknown)=>String(value??'').replace(/[A-Z]{3}\d{10}/gi,'[redacted]').slice(0,160);

Deno.serve(async req=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(req.headers.get('x-qualification-secret')!==required('QUALIFICATION_SHARED_SECRET'))return json({error:'Unauthorized'},401);

  const apiBase=required('USCIS_API_BASE_URL');
  const tokenUrl=required('USCIS_TOKEN_URL');
  if(!apiBase.startsWith('https://api-int.uscis.gov/')||!tokenUrl.startsWith('https://api-int.uscis.gov/')){
    return json({error:'Qualification traffic is restricted to the USCIS sandbox.'},503);
  }

  const db=createClient(required('SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
  const runDate=new Date().toISOString().slice(0,10);
  const existing=(await db.from('uscis_qualification_runs').select('outcome').eq('run_date',runDate).maybeSingle()).data;
  if(existing?.outcome==='complete')return json({runDate,outcome:'already-complete'});

  const startedAt=new Date().toISOString();
  const {error:startError}=await db.from('uscis_qualification_runs').upsert({
    run_date:runDate,started_at:startedAt,finished_at:null,environment:'sandbox',outcome:'running',
    request_count:0,success_http_status:null,success_duration_ms:null,success_has_history:null,
    error_http_status:null,error_duration_ms:null,error_category:null,error_reference:null,error_trace_id:null,
    recovery_note:null,function_version:FUNCTION_VERSION,updated_at:startedAt
  },{onConflict:'run_date'});
  if(startError)return json({error:'Unable to create qualification evidence row.'},500);

  const evidence:{
    request_count:number;
    success_http_status?:number;
    success_duration_ms?:number;
    success_has_history?:boolean;
    error_http_status?:number;
    error_duration_ms?:number;
    error_category?:string;
    error_reference?:string;
    error_trace_id?:string;
    recovery_note?:string;
  }={request_count:0};

  try{
    const quotaLimit=Number(Deno.env.get('USCIS_DAILY_QUOTA')??'1000');
    const reserve=async()=>{
      const {data,error}=await db.rpc('reserve_uscis_request',{daily_limit:quotaLimit});
      if(error)throw error;
      if(!data)throw new Error('USCIS sandbox quota budget is exhausted.');
      evidence.request_count++;
    };

    await reserve();
    const successStarted=performance.now();
    const success=await fetchUscisStatus(SUCCESS_STAGING_RECEIPT);
    evidence.success_http_status=200;
    evidence.success_duration_ms=elapsed(successStarted);
    evidence.success_has_history=success.rawEvents.length>1;

    await reserve();
    const errorStarted=performance.now();
    try{
      await fetchUscisStatus(ERROR_TEST_INPUT);
      evidence.error_duration_ms=elapsed(errorStarted);
      evidence.recovery_note='The controlled invalid input unexpectedly returned a success response.';
    }catch(error){
      evidence.error_duration_ms=elapsed(errorStarted);
      if(error instanceof OfficialApiError&&error.status>=400&&error.status<500){
        evidence.error_http_status=error.status;
        evidence.error_category=safeOperationalText(error.category);
        evidence.error_reference=safeOperationalText(error.reference);
        evidence.error_trace_id=safeOperationalText(error.traceId);
        evidence.recovery_note='The controlled client error was captured without retrying or storing its response body.';
      }else{
        throw error;
      }
    }

    const complete=evidence.success_http_status===200&&Boolean(evidence.error_http_status);
    const finishedAt=new Date().toISOString();
    const {error:updateError}=await db.from('uscis_qualification_runs').update({
      ...evidence,outcome:complete?'complete':'partial',finished_at:finishedAt,updated_at:finishedAt
    }).eq('run_date',runDate);
    if(updateError)throw updateError;
    return json({runDate,outcome:complete?'complete':'partial',requestCount:evidence.request_count});
  }catch(error){
    const finishedAt=new Date().toISOString();
    await db.from('uscis_qualification_runs').update({
      ...evidence,outcome:evidence.success_http_status?'partial':'failed',finished_at:finishedAt,updated_at:finishedAt,
      recovery_note:safeOperationalText(error instanceof Error?error.message:'Qualification run failed safely.')
    }).eq('run_date',runDate);
    return json({runDate,outcome:'failed',error:'Qualification run failed safely. Check protected operational evidence.'},502);
  }
});
