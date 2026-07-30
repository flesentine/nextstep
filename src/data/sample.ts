import { CaseRecord } from '@/types/domain';

const now = new Date().toISOString();
export const sampleCases: CaseRecord[] = [{
  id:'sample-i485',source:'uscis',nickname:'Green card',applicant:'Alex',formType:'I-485',status:'Case Is Being Actively Reviewed By USCIS',milestone:'review',lastUpdatedAt:'2026-07-12T16:30:00.000Z',createdAt:now,terminal:false,
  events:[
    {id:'evt-2',caseId:'sample-i485',status:'Case Is Being Actively Reviewed By USCIS',description:'USCIS is actively reviewing the case.',occurredAt:'2026-07-12T16:30:00.000Z',milestone:'review',sourceHash:'sample-2'},
    {id:'evt-1',caseId:'sample-i485',status:'Case Was Received',description:'USCIS received the application.',occurredAt:'2026-03-08T15:00:00.000Z',milestone:'filed',sourceHash:'sample-1'}],
  snapshot:{source:'uscis',fetchedAt:now,officialUrl:'https://egov.uscis.gov/',freshnessMinutes:4}
}];
