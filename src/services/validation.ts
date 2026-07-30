import { CaseSource } from '@/types/domain';
export const USCIS_PREFIXES=['EAC','IOE','LIN','MCT','MGL','MSC','NBC','SRC','WAC','YSC','ZAR','ZCH','ZHN'] as const;
export const normalizeReceipt=(value:string)=>value.toUpperCase().replace(/[^A-Z0-9]/g,'');
export function validateIdentifier(source:CaseSource,value:string){const compact=value.replace(/\s/g,'');if(source==='uscis'){const v=normalizeReceipt(value);return USCIS_PREFIXES.some(p=>v.startsWith(p))&&/^[A-Z]{3}\d{10}$/.test(v);}if(source==='eoir')return /^A?\d{8,9}$/i.test(compact);return value.trim().length>=8;}
export function extractReceiptNumbers(text:string){
  const normalized=text.toUpperCase().replace(/[^A-Z0-9]+/g,' ');
  const candidates=[...normalized.matchAll(/\b([A-Z]{3})\s*(\d(?:\s*\d){9})\b/g)].map(match=>normalizeReceipt(`${match[1]}${match[2]}`));
  return [...new Set(candidates.filter(value=>validateIdentifier('uscis',value)))];
}
