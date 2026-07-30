import { CohortInsight } from '@/types/domain';
import { MIN_PUBLIC_COHORT } from '@/data/cohorts';
import { supabase } from './supabase';

export async function fetchCohorts(filters?:{formType?:string;receiptPrefix?:string;milestone?:string}){
  if(!supabase)return [] as CohortInsight[];
  let query=supabase.from('public_cohort_insights').select('id,form_type,filing_month,receipt_prefix,milestone,sample_size,p25_days,median_days,p75_days,approvals,denials,moved_last_30_days,source_date,source_label').gte('sample_size',MIN_PUBLIC_COHORT);
  if(filters?.formType)query=query.eq('form_type',filters.formType);
  if(filters?.receiptPrefix)query=query.eq('receipt_prefix',filters.receiptPrefix);
  if(filters?.milestone)query=query.eq('milestone',filters.milestone);
  const {data,error}=await query.order('source_date',{ascending:false}).limit(100);
  if(error)throw error;
  return (data??[]).map(row=>({
    id:row.id,formType:row.form_type,filingMonth:row.filing_month??undefined,receiptPrefix:row.receipt_prefix??undefined,
    milestone:row.milestone,sampleSize:row.sample_size,p25Days:row.p25_days,medianDays:row.median_days,p75Days:row.p75_days,
    approvals:row.approvals??undefined,denials:row.denials??undefined,movedLast30Days:row.moved_last_30_days??undefined,
    sourceDate:row.source_date,sourceLabel:row.source_label
  })) as CohortInsight[];
}
