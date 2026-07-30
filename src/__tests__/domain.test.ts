import { describe, expect, it } from 'vitest';
import { inferMilestone } from '../data/guidance';
import { extractReceiptNumbers, normalizeReceipt, USCIS_PREFIXES, validateIdentifier } from '../services/validation';
import { decisionApprovalShare, progressInterpretation, publicFormMetrics, workloadPace } from '../data/publicProgress';
import { normalizeUscisPayload } from '../../supabase/functions/_shared/uscisPayload';
import { buildCohortInsight, MIN_PUBLIC_COHORT, safeObservationShape } from '../data/cohorts';
import { apiErrorFromResponse } from '../services/apiErrors';

describe('case identifiers',()=>{
  it('normalizes and validates supported USCIS receipt numbers',()=>{expect(normalizeReceipt('ioe-0912345678')).toBe('IOE0912345678');expect(validateIdentifier('uscis','IOE0912345678')).toBe(true);expect(validateIdentifier('uscis','ABC0912345678')).toBe(false);});
  it('accepts eight or nine digit EOIR A-numbers',()=>{expect(validateIdentifier('eoir','A123456789')).toBe(true);expect(validateIdentifier('eoir','12345678')).toBe(true);expect(validateIdentifier('eoir','123')).toBe(false);});
  it('accepts every documented app prefix and rejects unknown prefixes',()=>{for(const prefix of USCIS_PREFIXES)expect(validateIdentifier('uscis',`${prefix}0912345678`)).toBe(true);expect(validateIdentifier('uscis','ABC0912345678')).toBe(false);});
  it('extracts and deduplicates OCR-like receipt text',()=>{expect(extractReceiptNumbers('Receipt Number: ioe 091 234 5678\nAgain IOE0912345678')).toEqual(['IOE0912345678']);expect(extractReceiptNumbers('IOE09I234S678')).toEqual([]);});
});
describe('status normalization',()=>{
  it.each([['Case Was Received','filed'],['Fingerprints Were Taken','biometrics'],['Request for Evidence Was Sent','evidence'],['Interview Was Scheduled','interview'],['Case Was Approved','decision'],['Card Was Delivered','delivery']])('maps %s to %s',(status,milestone)=>expect(inferMilestone(status)).toBe(milestone));
});
describe('public progress metrics',()=>{
  const familyI485=publicFormMetrics.find(x=>x.id==='i485-family')!;
  it('calculates decision share from reported approvals and denials',()=>expect(decisionApprovalShare(familyI485)).toBeCloseTo(77139/(77139+14216),8));
  it('calculates workload pace from completions and receipts',()=>expect(workloadPace(familyI485)).toBeCloseTo(91355/132064,8));
  it('does not describe a below-pace quarter as backlog reduction',()=>expect(progressInterpretation(familyI485)).toContain('outpaced'));
  it('keeps every published category tied to nonzero decision totals',()=>expect(publicFormMetrics.every(x=>x.approved+x.denied>0)).toBe(true));
});
describe('USCIS API payload',()=>{
  it('normalizes the documented nested status and history response',()=>{
    const normalized=normalizeUscisPayload({case_status:{formType:'I-130',modifiedDate:'09-05-2023 14:28:46',current_case_status_text_en:'Case Was Approved',current_case_status_desc_en:'USCIS approved the petition.',hist_case_status:[{date:'2023-08-01',completed_text_en:'We received your petition.'}]}},'2026-01-01T00:00:00.000Z');
    expect(normalized.status).toBe('Case Was Approved');
    expect(normalized.formType).toBe('I-130');
    expect(normalized.terminal).toBe(true);
    expect(normalized.rawEvents).toEqual([{status:'Case Was Approved',description:'USCIS approved the petition.',occurredAt:'2023-09-05T14:28:46.000Z'},{status:'We received your petition.',description:'We received your petition.',occurredAt:'2023-08-01T00:00:00.000Z'}]);
  });
  it('normalizes a response without history and strips invalid dates to the supplied fallback',()=>{
    const normalized=normalizeUscisPayload({case_status:{formType:'I-765',modifiedDate:'not-a-date',current_case_status_text_en:'Case Was Received',hist_case_status:null}},'2026-01-02T00:00:00.000Z');
    expect(normalized.rawEvents).toHaveLength(1);expect(normalized.rawEvents[0].occurredAt).toBe('2026-01-02T00:00:00.000Z');expect(normalized.terminal).toBe(false);
  });
  it('sanitizes HTML and removes receipt numbers before local persistence',()=>{
    const normalized=normalizeUscisPayload({case_status:{formType:'I-130',current_case_status_text_en:'Case Was Received',current_case_status_desc_en:'Receipt IOE0912345678 <a href="https://example.com">open &amp; verify</a>'}},'2026-01-02T00:00:00.000Z');
    expect(normalized.rawEvents[0].description).toBe('Receipt your case open & verify');expect(normalized.rawEvents[0].description).not.toContain('<a');expect(normalized.rawEvents[0].description).not.toContain('IOE0912345678');
  });
});
describe('privacy-safe cohorts',()=>{
  const make=(count:number)=>Array.from({length:count},(_,index)=>({formType:'I-485',filingMonth:'2026-01-01',receiptPrefix:'IOE',milestone:'decision',durationDays:index+1,outcome:index%5===0?'denied' as const:'approved' as const,movedAt:'2026-07-15'}));
  it('suppresses groups below fifty observations',()=>expect(buildCohortInsight('small',make(MIN_PUBLIC_COHORT-1),'2026-07-29')).toBeNull());
  it('publishes percentile ranges only after the threshold',()=>{const insight=buildCohortInsight('ready',make(100),'2026-07-29');expect(insight?.sampleSize).toBe(100);expect(insight?.p25Days).toBe(26);expect(insight?.medianDays).toBe(51);expect(insight?.p75Days).toBe(75);});
  it('removes exact movement dates and identifiers from aggregate input',()=>{const safe=safeObservationShape(make(1)[0]);expect(safe.movedMonth).toBe('2026-07');expect(safe).not.toHaveProperty('ownerId');expect(safe).not.toHaveProperty('caseId');expect(safe).not.toHaveProperty('receiptNumber');});
});
describe('safe API errors',()=>{
  it('shows the government-safe message without requiring response bodies in logs',async()=>{const error=await apiErrorFromResponse(new Response(JSON.stringify({error:'USCIS did not accept this receipt-number format.',details:{traceId:'trace-safe'}}),{status:422}));expect(error.message).toContain('did not accept');expect((error as Error&{traceId?:string}).traceId).toBe('trace-safe');});
});
