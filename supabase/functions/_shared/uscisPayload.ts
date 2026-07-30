export interface NormalizedUscisPayload {status:string;formType:string;terminal:boolean;rawEvents:Array<{status:string;description:string;occurredAt:string}>;}

const terminal=(status:string)=>/denied|approved|delivered|closed|withdrawn/i.test(status);
const parseDate=(value:unknown,fallback:string)=>{if(typeof value!=='string'||!value)return fallback;const match=value.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);if(match)return new Date(Date.UTC(Number(match[3]),Number(match[1])-1,Number(match[2]),Number(match[4]??0),Number(match[5]??0),Number(match[6]??0))).toISOString();const parsed=new Date(value);return Number.isNaN(parsed.getTime())?fallback:parsed.toISOString();};
const text=(value:unknown,fallback:string)=>{const result=String(value??'').trim();return result||fallback;};
const safeDescription=(value:unknown,fallback:string)=>text(value,fallback)
  .replace(/<[^>]*>/g,' ')
  .replace(/&nbsp;/gi,' ')
  .replace(/&amp;/gi,'&')
  .replace(/&lt;/gi,'<')
  .replace(/&gt;/gi,'>')
  .replace(/\b(?:EAC|IOE|LIN|MCT|MGL|MSC|NBC|SRC|WAC|YSC|ZAR|ZCH|ZHN)\d{10}\b/gi,'your case')
  .replace(/\s+/g,' ')
  .trim();

export function normalizeUscisPayload(data:Record<string,unknown>,fallbackNow=new Date().toISOString()):NormalizedUscisPayload{
  const caseStatus=(data.case_status&&typeof data.case_status==='object'?data.case_status:{}) as Record<string,unknown>;
  const status=text(caseStatus.current_case_status_text_en,'Status unavailable');
  const currentEvent={status,description:safeDescription(caseStatus.current_case_status_desc_en,status),occurredAt:parseDate(caseStatus.modifiedDate??caseStatus.submittedDate,fallbackNow)};
  const history=Array.isArray(caseStatus.hist_case_status)?caseStatus.hist_case_status.map((value:unknown)=>{const event=(value&&typeof value==='object'?value:{}) as Record<string,unknown>;const eventText=safeDescription(event.completed_text_en,'Case history update');return {status:eventText,description:eventText,occurredAt:parseDate(event.date,fallbackNow)};}):[];
  return {status,formType:text(caseStatus.formType,'USCIS'),terminal:terminal(status),rawEvents:[currentEvent,...history]};
}
