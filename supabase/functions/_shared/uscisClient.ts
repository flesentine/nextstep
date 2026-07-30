import { normalizeUscisPayload, NormalizedUscisPayload } from './uscisPayload.ts';

export class OfficialApiError extends Error {
  constructor(public status:number,public safeMessage:string,public category?:string,public reference?:string,public traceId?:string){
    super(safeMessage);
  }
}

let tokenCache:{value:string;expiresAt:number}|null=null;
let tokenPromise:Promise<string>|null=null;
const required=(name:string)=>{const value=Deno.env.get(name);if(!value)throw new Error(`Missing ${name}`);return value;};

async function requestToken(){
  const response=await fetch(required('USCIS_TOKEN_URL'),{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:required('USCIS_CLIENT_ID'),client_secret:required('USCIS_CLIENT_SECRET')})});
  if(!response.ok){
    const rejected=response.status===400||response.status===401||response.status===403;
    throw new OfficialApiError(
      response.status,
      rejected?'USCIS rejected the configured sandbox client credentials.':'USCIS authorization is temporarily unavailable.',
      rejected?'oauth_credentials_rejected':'oauth_unavailable'
    );
  }
  const data=await response.json();
  if(!data.access_token)throw new OfficialApiError(
    401,
    'USCIS did not issue an access token for the configured sandbox credentials.',
    'oauth_access_token_missing'
  );
  tokenCache={value:String(data.access_token),expiresAt:Date.now()+Number(data.expires_in??1799)*1000};
  return tokenCache.value;
}

export async function uscisAccessToken(){
  if(tokenCache&&tokenCache.expiresAt>Date.now()+60_000)return tokenCache.value;
  if(!tokenPromise)tokenPromise=requestToken().finally(()=>{tokenPromise=null;});
  return tokenPromise;
}

async function officialError(response:Response){
  let payload:{errors?:Array<Record<string,unknown>>}={};
  try{payload=await response.json();}catch{}
  const error=payload.errors?.[0]??{};
  const fallback=response.status===429?'USCIS is busy. Try again later.':response.status===404?'USCIS did not recognize this receipt number.':response.status===422?'USCIS did not accept this receipt-number format.':response.status>=500?'The official source is temporarily unavailable.':'USCIS could not process this request.';
  return new OfficialApiError(response.status,String(error.message??fallback),String(error.category??''),String(error.reference??''),String(error.traceId??''));
}

export async function fetchUscisStatus(identifier:string):Promise<NormalizedUscisPayload>{
  const response=await fetch(`${required('USCIS_API_BASE_URL')}/${encodeURIComponent(identifier)}`,{headers:{authorization:`Bearer ${await uscisAccessToken()}`}});
  if(!response.ok)throw await officialError(response);
  const normalized=normalizeUscisPayload(await response.json());
  if(normalized.status==='Status unavailable')throw new OfficialApiError(404,'USCIS did not return case data for this receipt number in the selected environment.');
  return normalized;
}

export function resetTokenForTests(){tokenCache=null;tokenPromise=null;}
