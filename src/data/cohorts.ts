import { CaseEvent, CohortInsight } from '@/types/domain';

export const MIN_PUBLIC_COHORT=50;

export interface CohortObservation {
  formType:string;
  filingMonth:string;
  receiptPrefix:string;
  milestone:string;
  durationDays:number;
  outcome?:'approved'|'denied';
  movedAt:string;
}

const percentile=(sorted:number[],p:number)=>{
  if(!sorted.length)return 0;
  const index=(sorted.length-1)*p;
  const lower=Math.floor(index);
  const weight=index-lower;
  return Math.round(sorted[lower]+((sorted[lower+1]??sorted[lower])-sorted[lower])*weight);
};

export function buildCohortInsight(id:string,observations:CohortObservation[],sourceDate:string):CohortInsight|null{
  if(observations.length<MIN_PUBLIC_COHORT)return null;
  const durations=observations.map(x=>x.durationDays).filter(x=>Number.isFinite(x)&&x>=0).sort((a,b)=>a-b);
  if(durations.length<MIN_PUBLIC_COHORT)return null;
  const first=observations[0];
  const recentCutoff=new Date(sourceDate);recentCutoff.setUTCDate(recentCutoff.getUTCDate()-30);
  return {
    id,formType:first.formType,filingMonth:first.filingMonth,receiptPrefix:first.receiptPrefix,
    milestone:first.milestone as CohortInsight['milestone'],sampleSize:durations.length,
    p25Days:percentile(durations,.25),medianDays:percentile(durations,.5),p75Days:percentile(durations,.75),
    approvals:observations.filter(x=>x.outcome==='approved').length,
    denials:observations.filter(x=>x.outcome==='denied').length,
    movedLast30Days:observations.filter(x=>new Date(x.movedAt)>=recentCutoff).length,
    sourceDate,sourceLabel:'Opted-in, de-identified NextStep observations'
  };
}

export function eventDurationDays(from:CaseEvent,to:CaseEvent){return Math.max(0,Math.round((new Date(to.occurredAt).getTime()-new Date(from.occurredAt).getTime())/86400000));}

export function safeObservationShape(value:CohortObservation){
  return {
    formType:value.formType,
    filingMonth:value.filingMonth,
    receiptPrefix:value.receiptPrefix,
    milestone:value.milestone,
    durationDays:value.durationDays,
    outcome:value.outcome,
    movedMonth:value.movedAt.slice(0,7)
  };
}
