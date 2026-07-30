import { CaseRecord } from '@/types/domain';
import { apiErrorFromResponse } from './apiErrors';
import { supabase } from './supabase';

const base=()=>process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/,'');
async function headers(){const session=supabase?(await supabase.auth.getSession()).data.session:null;if(!session)throw new Error('Sign in before syncing cases.');return {'content-type':'application/json',Authorization:`Bearer ${session.access_token}`,...(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?{apikey:process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}:{})};}

export async function createCloudCase(record:CaseRecord,identifier:string){
  const endpoint=base();if(!endpoint)throw new Error('Cloud case API is not configured.');
  const response=await fetch(`${endpoint}/v1/cases`,{method:'POST',headers:await headers(),body:JSON.stringify({source:record.source,identifier,nickname:record.nickname,applicant:record.applicant,formType:record.formType})});
  if(!response.ok)throw await apiErrorFromResponse(response);
  return response.json() as Promise<{id:string}>;
}

export async function saveInstallation(expoPushToken:string,timezone:string){
  if(!supabase)throw new Error('Cloud sync is not configured.');
  const user=(await supabase.auth.getUser()).data.user;if(!user)throw new Error('Sign in before enabling server alerts.');
  const {error}=await supabase.from('installations').upsert({user_id:user.id,expo_push_token:expoPushToken,timezone,enabled:true,case_alerts:true},{onConflict:'expo_push_token'});
  if(error)throw error;
}
