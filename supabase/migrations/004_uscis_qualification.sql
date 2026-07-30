-- Redacted evidence for the USCIS production-access qualification period.
-- No receipt numbers, access tokens, response bodies, or case descriptions belong here.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table public.uscis_qualification_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null unique,
  started_at timestamptz not null,
  finished_at timestamptz,
  environment text not null check(environment = 'sandbox'),
  outcome text not null check(outcome in ('running','complete','partial','failed')),
  request_count integer not null default 0 check(request_count between 0 and 10),
  success_http_status integer,
  success_duration_ms integer,
  success_has_history boolean,
  error_http_status integer,
  error_duration_ms integer,
  error_category text,
  error_reference text,
  error_trace_id text,
  recovery_note text,
  function_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(success_http_status is null or success_http_status between 200 and 299),
  check(error_http_status is null or error_http_status between 400 and 499)
);

alter table public.uscis_qualification_runs enable row level security;
revoke all on public.uscis_qualification_runs from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.invoke_uscis_qualification()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  function_url text;
  invocation_secret text;
  request_id bigint;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'nextstep_qualification_function_url';

  select decrypted_secret into invocation_secret
  from vault.decrypted_secrets
  where name = 'nextstep_qualification_invocation_secret';

  if function_url is null or invocation_secret is null then
    raise exception 'Qualification scheduler secrets are not configured';
  end if;

  select net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-qualification-secret', invocation_secret
    ),
    body := jsonb_build_object('trigger', 'supabase-cron'),
    timeout_milliseconds := 30000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function private.invoke_uscis_qualification() from public, anon, authenticated;

comment on table public.uscis_qualification_runs is
  'Redacted USCIS sandbox qualification evidence. Never store identifiers, tokens, response payloads, or status descriptions.';
comment on function private.invoke_uscis_qualification() is
  'Invokes the sandbox-only qualification Edge Function using URL and invocation secret values held in Supabase Vault.';
