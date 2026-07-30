export interface PublicFormMetric {
  id: string;
  formType: string;
  category: string;
  description: string;
  received: number;
  approved: number;
  denied: number;
  completions: number;
  pending: number;
  processingMonths: number;
}

export interface PublicProgressRelease {
  id: string;
  period: string;
  periodDetail: string;
  publishedAt: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceSha256: string;
}

export const publicProgressRelease: PublicProgressRelease = {
  id: 'uscis-fy2025-q2-all-forms',
  period: 'FY2025 Q2',
  periodDetail: 'January 1–March 31, 2025',
  publishedAt: '2025-06-30',
  sourceLabel: 'USCIS All Application and Petition Form Types',
  sourceUrl: 'https://www.uscis.gov/sites/default/files/document/data/quarterly_all_forms_fy2025_q2.xlsx',
  sourceSha256: 'b404c16ce97bbb2438b9ee86c5858ac036994b56c09716a362275e3ef2900120',
};

// Values are copied from the official FY2025 Q2 All Forms workbook. “Approved”
// and “denied” describe decisions reported during the period; they are not a
// filing cohort and must never be presented as an applicant's probability.
export const publicFormMetrics: PublicFormMetric[] = [
  {id:'i485-family',formType:'I-485',category:'Family adjustment',description:'Green card adjustment based on a family category',received:132064,approved:77139,denied:14216,completions:91355,pending:588723,processingMonths:9.7},
  {id:'i485-asylum',formType:'I-485',category:'Asylum adjustment',description:'Green card adjustment based on asylum',received:19340,approved:24426,denied:695,completions:25121,pending:68389,processingMonths:10},
  {id:'i485-refugee',formType:'I-485',category:'Refugee adjustment',description:'Green card adjustment based on refugee admission',received:19776,approved:17114,denied:455,completions:17569,pending:45779,processingMonths:6.9},
  {id:'i130-immediate',formType:'I-130',category:'Immediate relative',description:'Petition for an immediate relative',received:203682,approved:147093,denied:12734,completions:159827,pending:902455,processingMonths:15.7},
  {id:'i130-other',formType:'I-130',category:'Other relative',description:'Other family-preference relative petition',received:66182,approved:15023,denied:8931,completions:23954,pending:1493382,processingMonths:35.3},
  {id:'i129f',formType:'I-129F',category:'Fiancé(e)',description:'Petition for an alien fiancé(e)',received:12269,approved:7169,denied:3393,completions:10562,pending:31019,processingMonths:5.7},
  {id:'i751',formType:'I-751',category:'Remove conditions',description:'Petition to remove conditions on residence',received:45246,approved:24360,denied:1100,completions:25460,pending:236839,processingMonths:21.7},
  {id:'n400',formType:'N-400',category:'Naturalization',description:'Application for naturalization, excluding the separate military row',received:260621,approved:231696,denied:22610,completions:254306,pending:527837,processingMonths:5.6},
  {id:'i765-adjustment',formType:'I-765',category:'Adjustment applicant',description:'Employment authorization based on adjustment of status',received:195971,approved:151981,denied:8520,completions:160501,pending:191393,processingMonths:2},
  {id:'i140',formType:'I-140',category:'Alien worker',description:'Immigrant petition for an alien worker',received:57947,approved:36476,denied:4926,completions:41402,pending:150112,processingMonths:7.5},
  {id:'i90',formType:'I-90',category:'Replace green card',description:'Application to replace a permanent resident card',received:285794,approved:180864,denied:12938,completions:193802,pending:356184,processingMonths:8.3},
  {id:'i539',formType:'I-539',category:'Extend/change status',description:'Application to extend or change nonimmigrant status',received:68251,approved:72249,denied:6840,completions:79089,pending:59994,processingMonths:2.8},
];

export const decisionApprovalShare = (metric: PublicFormMetric) => metric.approved / (metric.approved + metric.denied);
export const workloadPace = (metric: PublicFormMetric) => metric.completions / metric.received;
export const progressInterpretation = (metric: PublicFormMetric) => {
  const pace = workloadPace(metric);
  if (pace >= 1.05) return 'USCIS reported more completions than new receipts in this category during the quarter.';
  if (pace >= 0.95) return 'Reported completions roughly kept pace with new receipts during the quarter.';
  return 'New receipts outpaced reported completions during the quarter, which can add pressure to the pending workload.';
};
