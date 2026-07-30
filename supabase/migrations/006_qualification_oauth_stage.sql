alter table public.uscis_qualification_runs
  add column if not exists oauth_succeeded boolean;

comment on column public.uscis_qualification_runs.oauth_succeeded is
  'True only after USCIS issues an OAuth access token. Does not store the token or token response.';
