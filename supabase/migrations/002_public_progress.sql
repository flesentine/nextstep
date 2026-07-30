create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.data_releases (
  id text primary key,
  agency text not null,
  title text not null,
  period_label text not null,
  period_start date not null,
  period_end date not null,
  published_at date not null,
  source_url text not null,
  source_sha256 text not null,
  imported_at timestamptz not null default now()
);

create table public.form_progress_metrics (
  release_id text not null references public.data_releases(id) on delete cascade,
  metric_id text not null,
  form_type text not null,
  category text not null,
  description text not null,
  received integer not null check (received >= 0),
  approved integer not null check (approved >= 0),
  denied integer not null check (denied >= 0),
  completions integer not null check (completions >= 0),
  pending integer not null check (pending >= 0),
  processing_months numeric(6,1) check (processing_months >= 0),
  primary key (release_id, metric_id)
);

create table public.research_consent (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  consent_version integer not null default 1,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Service-role jobs may write only de-identified observations here. The keyed
-- contribution hash prevents duplicate contributions without retaining a user,
-- case UUID, or receipt number. Never expose this schema through the API.
create table private.case_observations (
  id uuid primary key default gen_random_uuid(),
  contribution_hash text not null unique,
  form_type text not null,
  category text,
  service_center text,
  filed_month date not null check (date_trunc('month', filed_month)::date = filed_month),
  milestone text not null,
  event_month date not null check (date_trunc('month', event_month)::date = event_month),
  elapsed_days integer not null check (elapsed_days >= 0),
  terminal_outcome text check (terminal_outcome in ('approved','denied','withdrawn','other')),
  observed_at timestamptz not null default now()
);

create table public.cohort_estimates (
  cohort_key text primary key,
  form_type text not null,
  category text,
  service_center text,
  milestone text not null,
  sample_size integer not null check (sample_size >= 50),
  p25_days integer not null check (p25_days >= 0),
  p50_days integer not null check (p50_days >= p25_days),
  p75_days integer not null check (p75_days >= p50_days),
  p90_days integer not null check (p90_days >= p75_days),
  confidence text not null check (confidence in ('low','medium','high')),
  model_version text not null,
  source_start date not null,
  source_end date not null,
  refreshed_at timestamptz not null default now()
);

alter table public.data_releases enable row level security;
alter table public.form_progress_metrics enable row level security;
alter table public.research_consent enable row level security;
alter table public.cohort_estimates enable row level security;

create policy "public reads data releases" on public.data_releases for select using (true);
create policy "public reads form metrics" on public.form_progress_metrics for select using (true);
create policy "users manage research consent" on public.research_consent for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "public reads qualified cohort estimates" on public.cohort_estimates for select using (sample_size >= 50);

insert into public.data_releases (id,agency,title,period_label,period_start,period_end,published_at,source_url,source_sha256) values
('uscis-fy2025-q2-all-forms','USCIS','All USCIS Application and Petition Form Types','FY2025 Q2','2025-01-01','2025-03-31','2025-06-30','https://www.uscis.gov/sites/default/files/document/data/quarterly_all_forms_fy2025_q2.xlsx','b404c16ce97bbb2438b9ee86c5858ac036994b56c09716a362275e3ef2900120')
on conflict (id) do update set published_at=excluded.published_at, source_url=excluded.source_url, source_sha256=excluded.source_sha256;

insert into public.form_progress_metrics (release_id,metric_id,form_type,category,description,received,approved,denied,completions,pending,processing_months) values
('uscis-fy2025-q2-all-forms','i485-family','I-485','Family adjustment','Green card adjustment based on a family category',132064,77139,14216,91355,588723,9.7),
('uscis-fy2025-q2-all-forms','i485-asylum','I-485','Asylum adjustment','Green card adjustment based on asylum',19340,24426,695,25121,68389,10.0),
('uscis-fy2025-q2-all-forms','i485-refugee','I-485','Refugee adjustment','Green card adjustment based on refugee admission',19776,17114,455,17569,45779,6.9),
('uscis-fy2025-q2-all-forms','i130-immediate','I-130','Immediate relative','Petition for an immediate relative',203682,147093,12734,159827,902455,15.7),
('uscis-fy2025-q2-all-forms','i130-other','I-130','Other relative','Other family-preference relative petition',66182,15023,8931,23954,1493382,35.3),
('uscis-fy2025-q2-all-forms','i129f','I-129F','Fiancé(e)','Petition for an alien fiancé(e)',12269,7169,3393,10562,31019,5.7),
('uscis-fy2025-q2-all-forms','i751','I-751','Remove conditions','Petition to remove conditions on residence',45246,24360,1100,25460,236839,21.7),
('uscis-fy2025-q2-all-forms','n400','N-400','Naturalization','Application for naturalization, excluding the separate military row',260621,231696,22610,254306,527837,5.6),
('uscis-fy2025-q2-all-forms','i765-adjustment','I-765','Adjustment applicant','Employment authorization based on adjustment of status',195971,151981,8520,160501,191393,2.0),
('uscis-fy2025-q2-all-forms','i140','I-140','Alien worker','Immigrant petition for an alien worker',57947,36476,4926,41402,150112,7.5),
('uscis-fy2025-q2-all-forms','i90','I-90','Replace green card','Application to replace a permanent resident card',285794,180864,12938,193802,356184,8.3),
('uscis-fy2025-q2-all-forms','i539','I-539','Extend/change status','Application to extend or change nonimmigrant status',68251,72249,6840,79089,59994,2.8)
on conflict (release_id,metric_id) do update set
received=excluded.received, approved=excluded.approved, denied=excluded.denied,
completions=excluded.completions, pending=excluded.pending, processing_months=excluded.processing_months;

comment on table public.form_progress_metrics is 'Official aggregate operational data. Approval share is not an individual probability because decisions and receipts are not a filing cohort.';
comment on table private.case_observations is 'De-identified, opt-in research observations. No receipt numbers, case UUIDs, user IDs, exact event dates, names, or free text.';
