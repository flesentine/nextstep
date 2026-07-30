export interface ApiErrorPayload {error?:string;details?:{category?:string;reference?:string;traceId?:string};}
export async function apiErrorFromResponse(response:Response){
  let payload:ApiErrorPayload={};
  try{payload=await response.json();}catch{}
  const fallback=response.status===401?'Sign in to use cloud tracking.':response.status===409?'This request conflicts with an existing case.':response.status===422?'Check the information and try again.':response.status===429?'USCIS is busy. Try again later.':response.status>=500?'The tracking service is temporarily unavailable.':'Unable to complete this request.';
  const error=new Error(payload.error||fallback) as Error&{status?:number;reference?:string;traceId?:string};
  error.status=response.status;error.reference=payload.details?.reference;error.traceId=payload.details?.traceId;
  return error;
}
