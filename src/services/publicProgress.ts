import { PublicFormMetric, PublicProgressRelease } from '@/data/publicProgress';
import { supabase } from './supabase';

interface ReleaseRow {id:string;title:string;period_label:string;period_start:string;period_end:string;published_at:string;source_url:string;source_sha256:string;}
interface MetricRow {metric_id:string;form_type:string;category:string;description:string;received:number;approved:number;denied:number;completions:number;pending:number;processing_months:number;}

export async function fetchLatestPublicProgress():Promise<{release:PublicProgressRelease;metrics:PublicFormMetric[]}|null>{
  if(!supabase)return null;
  const {data:releaseRows,error:releaseError}=await supabase.from('data_releases').select('id,title,period_label,period_start,period_end,published_at,source_url,source_sha256').eq('agency','USCIS').order('period_end',{ascending:false}).limit(1);
  if(releaseError||!releaseRows?.length)return null;
  const row=releaseRows[0] as ReleaseRow;
  const {data:metricRows,error:metricError}=await supabase.from('form_progress_metrics').select('metric_id,form_type,category,description,received,approved,denied,completions,pending,processing_months').eq('release_id',row.id).order('form_type');
  if(metricError||!metricRows?.length)return null;
  const release:PublicProgressRelease={id:row.id,period:row.period_label,periodDetail:`${row.period_start}–${row.period_end}`,publishedAt:row.published_at,sourceLabel:row.title,sourceUrl:row.source_url,sourceSha256:row.source_sha256};
  const metrics=(metricRows as MetricRow[]).map(x=>({id:x.metric_id,formType:x.form_type,category:x.category,description:x.description,received:x.received,approved:x.approved,denied:x.denied,completions:x.completions,pending:x.pending,processingMonths:Number(x.processing_months)}));
  return {release,metrics};
}
