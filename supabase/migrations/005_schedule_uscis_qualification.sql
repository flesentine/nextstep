-- Four daily retry windows protect the five-day evidence period from a
-- transient sandbox outage. The Edge Function exits without USCIS traffic
-- after the UTC date already has a complete evidence row.

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'nextstep-uscis-sandbox-qualification';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'nextstep-uscis-sandbox-qualification',
    '30 0,6,12,18 * * *',
    'select private.invoke_uscis_qualification();'
  );
end;
$$;
