import * as Crypto from 'expo-crypto';
import { CaseEvent, CaseRecord, CaseSource, SourceSnapshot } from '@/types/domain';
import { inferMilestone } from '@/data/guidance';
import { normalizeReceipt, validateIdentifier } from './validation';
import { supabase } from './supabase';
import { apiErrorFromResponse } from './apiErrors';

export interface SourceConnector {
  source: CaseSource;
  validateIdentifier(value: string): boolean;
  fetchStatus(identifier: string, current?: CaseRecord): Promise<{ status:string; formType:string; terminal:boolean; rawEvents: unknown[] }>;
  normalizeEvents(raw: unknown[], caseId: string): Promise<CaseEvent[]>;
  getFreshness(): SourceSnapshot;
}

export class UscisConnector implements SourceConnector {
  source: CaseSource='uscis';
  validateIdentifier(value:string){return validateIdentifier('uscis',value);}
  async fetchStatus(identifier:string,current?:CaseRecord){
    const endpoint=process.env.EXPO_PUBLIC_API_BASE_URL;
    if(!endpoint) return {status:current?.status ?? 'Case Was Received',formType:current?.formType ?? 'USCIS',terminal:false,rawEvents:current?.events ?? []};
    const session=supabase?(await supabase.auth.getSession()).data.session:null;
    const publicKey=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(publicKey?{apikey:publicKey}:{}),...(session?{Authorization:`Bearer ${session.access_token}`}:{})},body:JSON.stringify({action:'status',source:'uscis',identifier:normalizeReceipt(identifier)})});
    if(!response.ok) throw await apiErrorFromResponse(response);
    return response.json();
  }
  async normalizeEvents(raw:unknown[],caseId:string){
    const result:CaseEvent[]=[];
    for(const item of raw as Array<Record<string,unknown>>){const status=String(item.status??item.case_status??'Status update');const occurredAt=String(item.occurredAt??item.case_status_date??new Date().toISOString());const sourceHash=String(item.sourceHash??await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,`${status}|${occurredAt}`));result.push({id:String(item.id??sourceHash.slice(0,20)),caseId,status,description:String(item.description??item.case_status_desc??status),occurredAt,milestone:inferMilestone(status),sourceHash});}
    return result.sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt));
  }
  getFreshness():SourceSnapshot{return {source:'uscis',fetchedAt:new Date().toISOString(),officialUrl:'https://egov.uscis.gov/',freshnessMinutes:0};}
}

export class LinkOnlyConnector implements SourceConnector {
  constructor(public source:'nvc'|'eoir'){}
  validateIdentifier(v:string){return validateIdentifier(this.source,v);}
  async fetchStatus():Promise<{status:string;formType:string;terminal:boolean;rawEvents:unknown[]}>{throw new Error(`${this.source.toUpperCase()} automated updates are not enabled. Open the official source to verify.`);}
  async normalizeEvents(){return [];}
  getFreshness():SourceSnapshot{return {source:this.source,fetchedAt:new Date().toISOString(),officialUrl:this.source==='nvc'?'https://ceac.state.gov/CEACStatTracker/Status.aspx':'https://acis.eoir.justice.gov/en/',freshnessMinutes:0};}
}
