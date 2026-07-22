-- Runs the delivery worker every five minutes.
--
-- The service role key is read from Vault rather than written here, so this
-- migration stays safe to commit. Create the secrets once per project before
-- applying it:
--
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>',        'service_role_key');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

create or replace function public.invoke_delivery_worker()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  project_url text;
  service_key text;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into service_key from vault.decrypted_secrets where name = 'service_role_key';

  if project_url is null or service_key is null then
    raise exception 'Vault secrets project_url and service_role_key must both be set';
  end if;

  perform net.http_post(
    url     := project_url || '/functions/v1/deliver-capsules',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || service_key
               ),
    body    := '{}'::jsonb
  );
end;
$$;

revoke all on function public.invoke_delivery_worker() from public, anon, authenticated;

select cron.unschedule('deliver-capsules')
 where exists (select 1 from cron.job where jobname = 'deliver-capsules');

select cron.schedule('deliver-capsules', '*/5 * * * *', 'select public.invoke_delivery_worker()');
