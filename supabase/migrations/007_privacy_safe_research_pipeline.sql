-- Privacy-safe community research pipeline.
--
-- Raw case data stays in the normal encrypted case tables. Only service-role
-- code can write keyed, de-identified observations into the private schema.
-- Public releases are suppressed until at least 50 observations exist.

alter table private.case_observations
  add column if not exists case_key_hash text;

update private.case_observations
set case_key_hash = contribution_hash
where case_key_hash is null;

alter table private.case_observations
  alter column case_key_hash set not null;

create index if not exists case_observations_case_key_hash_idx
  on private.case_observations(case_key_hash);

-- Retire the earlier identifiable staging table from client use. It remains
-- temporarily for migration compatibility, but the app and jobs do not write it.
drop policy if exists "owners manage observations" on public.cohort_observations;
revoke all on table public.cohort_observations from anon, authenticated;

create or replace function public.record_research_observation(
  p_case_key_hash text,
  p_contribution_hash text,
  p_form_type text,
  p_filed_month date,
  p_milestone text,
  p_event_month date,
  p_elapsed_days integer,
  p_terminal_outcome text default null
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_case_key_hash is null or length(p_case_key_hash) < 32
    or p_contribution_hash is null or length(p_contribution_hash) < 32 then
    raise exception 'Invalid keyed research identifier';
  end if;
  if p_form_type is null or length(trim(p_form_type)) = 0
    or p_milestone not in ('biometrics','review','evidence','interview','decision','delivery')
    or p_elapsed_days < 0
    or p_filed_month <> date_trunc('month', p_filed_month)::date
    or p_event_month <> date_trunc('month', p_event_month)::date then
    raise exception 'Invalid de-identified observation';
  end if;

  insert into private.case_observations(
    case_key_hash,
    contribution_hash,
    form_type,
    filed_month,
    milestone,
    event_month,
    elapsed_days,
    terminal_outcome,
    observed_at
  ) values (
    p_case_key_hash,
    p_contribution_hash,
    upper(trim(p_form_type)),
    p_filed_month,
    p_milestone,
    p_event_month,
    p_elapsed_days,
    p_terminal_outcome,
    now()
  )
  on conflict(contribution_hash) do update set
    form_type = excluded.form_type,
    filed_month = excluded.filed_month,
    event_month = excluded.event_month,
    elapsed_days = excluded.elapsed_days,
    terminal_outcome = excluded.terminal_outcome,
    observed_at = now();
end;
$$;

create or replace function public.delete_research_case_observations(
  p_case_key_hash text
) returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  removed integer;
begin
  delete from private.case_observations
  where case_key_hash = p_case_key_hash;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create or replace function public.publish_research_cohorts(
  p_minimum_size integer default 50,
  p_release_version text default 'community-v1'
) returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  published integer;
begin
  if p_minimum_size < 50 then
    raise exception 'Public cohort threshold cannot be below 50';
  end if;

  delete from public.cohort_estimates
  where model_version = p_release_version;

  insert into public.cohort_estimates(
    cohort_key,
    form_type,
    category,
    service_center,
    milestone,
    sample_size,
    p25_days,
    p50_days,
    p75_days,
    p90_days,
    confidence,
    model_version,
    source_start,
    source_end,
    refreshed_at
  )
  select
    encode(digest(concat_ws('|', upper(form_type), milestone, p_release_version), 'sha256'), 'hex'),
    upper(form_type),
    null,
    null,
    milestone,
    count(*)::integer,
    round(percentile_cont(0.25) within group(order by elapsed_days))::integer,
    round(percentile_cont(0.50) within group(order by elapsed_days))::integer,
    round(percentile_cont(0.75) within group(order by elapsed_days))::integer,
    round(percentile_cont(0.90) within group(order by elapsed_days))::integer,
    case when count(*) >= 500 then 'high'
         when count(*) >= 150 then 'medium'
         else 'low' end,
    p_release_version,
    min(filed_month),
    max(event_month),
    now()
  from private.case_observations
  group by upper(form_type), milestone
  having count(*) >= p_minimum_size;

  delete from public.public_cohort_insights
  where release_version = p_release_version;

  insert into public.public_cohort_insights(
    form_type,
    filing_month,
    receipt_prefix,
    milestone,
    sample_size,
    p25_days,
    median_days,
    p75_days,
    approvals,
    denials,
    moved_last_30_days,
    source_date,
    source_label,
    release_version
  )
  select
    upper(form_type),
    null,
    null,
    milestone,
    count(*)::integer,
    round(percentile_cont(0.25) within group(order by elapsed_days))::integer,
    round(percentile_cont(0.50) within group(order by elapsed_days))::integer,
    round(percentile_cont(0.75) within group(order by elapsed_days))::integer,
    count(*) filter(where terminal_outcome = 'approved')::integer,
    count(*) filter(where terminal_outcome = 'denied')::integer,
    count(*) filter(where event_month >= date_trunc('month', current_date - interval '30 days')::date)::integer,
    current_date,
    'Opted-in, de-identified NextStep observations',
    p_release_version
  from private.case_observations
  group by upper(form_type), milestone
  having count(*) >= p_minimum_size;

  get diagnostics published = row_count;
  return published;
end;
$$;

revoke all on function public.record_research_observation(text,text,text,date,text,date,integer,text)
  from public, anon, authenticated;
revoke all on function public.delete_research_case_observations(text)
  from public, anon, authenticated;
revoke all on function public.publish_research_cohorts(integer,text)
  from public, anon, authenticated;
grant execute on function public.record_research_observation(text,text,text,date,text,date,integer,text)
  to service_role;
grant execute on function public.delete_research_case_observations(text)
  to service_role;
grant execute on function public.publish_research_cohorts(integer,text)
  to service_role;

comment on column private.case_observations.case_key_hash is
  'Keyed, one-way server hash used only to honor consent withdrawal; it is not a case UUID or receipt number.';
comment on function public.record_research_observation is
  'Service-role boundary for month-bucketed, opt-in research data. Never pass identifiers, names, free text, or exact event dates.';

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'nextstep-publish-research-cohorts';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'nextstep-publish-research-cohorts',
    '15 9 * * *',
    $cron$select public.publish_research_cohorts(50, 'community-v1');$cron$
  );
end;
$$;
