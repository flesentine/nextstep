-- Feature-parity data model. Identifiers remain encrypted in public.cases and
-- must only be decrypted inside trusted Edge Functions.

alter table public.profiles add column if not exists analytics_opt_in boolean not null default false;
alter table public.cases add column if not exists quiet_since timestamptz;
alter table public.cases add column if not exists poll_failures integer not null default 0;
alter table public.cases add column if not exists source_snapshot jsonb not null default '{}'::jsonb;
alter table public.installations add column if not exists quiet_hours_start time;
alter table public.installations add column if not exists quiet_hours_end time;
alter table public.installations add column if not exists case_alerts boolean not null default true;
alter table public.installations add column if not exists bulletin_alerts boolean not null default false;

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  due_at timestamptz not null,
  completed_at timestamptz,
  calendar_exported_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.case_shares (
  case_id uuid references public.cases(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(case_id,household_id)
);

create table public.content_releases (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check(content_type in ('visa_bulletin','nvc_timeframes','official_updates','civics','guidance')),
  version text not null,
  source_url text not null,
  source_published_at date,
  fetched_at timestamptz not null,
  checksum text not null,
  locale text not null default 'en',
  payload jsonb not null,
  active boolean not null default false,
  unique(content_type,version,locale)
);

create table public.cohort_observations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  form_type text not null,
  filing_month date not null check(extract(day from filing_month)=1),
  receipt_prefix text check(receipt_prefix is null or receipt_prefix ~ '^[A-Z]{3}$'),
  milestone text not null,
  duration_days integer not null check(duration_days>=0),
  outcome text check(outcome is null or outcome in ('approved','denied')),
  moved_month date not null check(extract(day from moved_month)=1),
  created_at timestamptz not null default now(),
  unique(case_id,milestone,moved_month)
);

create table public.public_cohort_insights (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  filing_month date,
  receipt_prefix text,
  milestone text not null,
  sample_size integer not null check(sample_size>=50),
  p25_days integer not null,
  median_days integer not null,
  p75_days integer not null,
  approvals integer,
  denials integer,
  moved_last_30_days integer,
  source_date date not null,
  source_label text not null,
  release_version text not null,
  unique(form_type,filing_month,receipt_prefix,milestone,release_version)
);

create table public.estimate_releases (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  cohort_insight_id uuid not null references public.public_cohort_insights(id) on delete restrict,
  earliest date not null,
  latest date not null,
  confidence text not null check(confidence in ('low','medium','high')),
  created_at timestamptz not null default now()
);

create table public.store_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  store text not null check(store in ('app_store','play_store')),
  product_id text not null,
  original_transaction_id text,
  status text not null check(status in ('trial','active','grace','expired','refunded')),
  expires_at timestamptz,
  last_verified_at timestamptz not null,
  raw_fingerprint text
);

create table public.api_usage_daily (
  usage_date date primary key,
  requests integer not null default 0,
  successes integer not null default 0,
  client_errors integer not null default 0,
  rate_limits integer not null default 0,
  server_errors integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  case_event_id uuid not null references public.case_events(id) on delete cascade,
  household_key uuid not null,
  status text not null check(status in ('queued','sent','failed')),
  attempted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(case_event_id,household_key)
);

alter table public.reminders enable row level security;
alter table public.household_invitations enable row level security;
alter table public.case_shares enable row level security;
alter table public.content_releases enable row level security;
alter table public.cohort_observations enable row level security;
alter table public.public_cohort_insights enable row level security;
alter table public.estimate_releases enable row level security;
alter table public.store_entitlements enable row level security;
alter table public.api_usage_daily enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "owners manage reminders" on public.reminders for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "owners manage invitations" on public.household_invitations for all using(invited_by=auth.uid()) with check(invited_by=auth.uid());
create policy "household members read shares" on public.case_shares for select using(public.is_household_member(household_id));
create policy "case owners manage shares" on public.case_shares for all using(exists(select 1 from public.cases c where c.id=case_id and c.owner_id=auth.uid())) with check(exists(select 1 from public.cases c where c.id=case_id and c.owner_id=auth.uid()));
create policy "read active content" on public.content_releases for select using(active=true);
create policy "owners manage observations" on public.cohort_observations for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "read thresholded cohorts" on public.public_cohort_insights for select using(sample_size>=50);
create policy "case owners read estimates" on public.estimate_releases for select using(exists(select 1 from public.cases c where c.id=case_id and (c.owner_id=auth.uid() or (c.household_id is not null and public.is_household_member(c.household_id)))));
create policy "owners read entitlements" on public.store_entitlements for select using(user_id=auth.uid());

create or replace function public.create_profile_for_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'name',''))
  on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_new_user();

create or replace function public.reserve_uscis_request(daily_limit integer) returns boolean
language plpgsql security definer set search_path=public as $$
declare reserved boolean;
begin
  insert into public.api_usage_daily(usage_date,requests)
  values((now() at time zone 'UTC')::date,1)
  on conflict(usage_date) do update
    set requests=public.api_usage_daily.requests+1,updated_at=now()
    where public.api_usage_daily.requests<daily_limit
  returning true into reserved;
  return coalesce(reserved,false);
end $$;
revoke all on function public.reserve_uscis_request(integer) from public,anon,authenticated;
grant execute on function public.reserve_uscis_request(integer) to service_role;

comment on table public.public_cohort_insights is 'Contains only aggregate groups of at least 50 observations; never store receipt numbers, user IDs, exact event dates, or free text here.';
comment on table public.api_usage_daily is 'Operational counts only. Never add receipt numbers, access tokens, or response bodies.';
