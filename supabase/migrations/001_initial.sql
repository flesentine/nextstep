create extension if not exists pgcrypto;

create type public.case_source as enum ('uscis','nvc','eoir');
create type public.subscription_tier as enum ('free','premium');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.household_members (
  household_id uuid references public.households(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  primary key (household_id,user_id)
);
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  source public.case_source not null,
  identifier_ciphertext text not null,
  identifier_fingerprint text not null,
  nickname text not null,
  applicant text not null,
  form_type text not null,
  status text not null,
  milestone text not null,
  last_source_update timestamptz,
  last_polled_at timestamptz,
  next_poll_at timestamptz,
  terminal boolean not null default false,
  created_at timestamptz not null default now(),
  unique(owner_id,source,identifier_fingerprint)
);
create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  source_hash text not null,
  status text not null,
  description text not null,
  milestone text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(case_id,source_hash)
);
create table public.installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  timezone text not null default 'UTC',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  store text,
  product_id text,
  entitlement_expires_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.cases enable row level security;
alter table public.case_events enable row level security;
alter table public.installations enable row level security;
alter table public.subscriptions enable row level security;

create function public.is_household_member(target uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from household_members where household_id=target and user_id=auth.uid()) $$;
create policy "own profile" on public.profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy "household members read" on public.households for select using (public.is_household_member(id));
create policy "owners manage households" on public.households for all using (owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "members read membership" on public.household_members for select using (user_id=auth.uid() or public.is_household_member(household_id));
create policy "owners manage membership" on public.household_members for all using (exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid()));
create policy "case access" on public.cases for select using (owner_id=auth.uid() or (household_id is not null and public.is_household_member(household_id)));
create policy "owners manage cases" on public.cases for all using (owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "event access" on public.case_events for select using (exists(select 1 from public.cases c where c.id=case_id and (c.owner_id=auth.uid() or (c.household_id is not null and public.is_household_member(c.household_id)))));
create policy "own installations" on public.installations for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "own subscription" on public.subscriptions for select using(user_id=auth.uid());

comment on column public.cases.identifier_ciphertext is 'Encrypt/decrypt only inside trusted server functions with CASE_ENCRYPTION_KEY; never return it to analytics or logs.';
