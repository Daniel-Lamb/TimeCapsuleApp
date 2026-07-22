-- Core schema for scheduled capsule delivery.
--
-- The browser client is anonymous, so it never touches these tables directly:
-- RLS is enabled with no policies at all, which denies anon and authenticated
-- outright. Every read and write goes through an edge function running as the
-- service role, where input can be validated in one place.

create table if not exists public.capsules (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null check (char_length(name) between 1 and 120),
  description       text        check (char_length(description) <= 2000),
  recipient_email   text        not null check (recipient_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  unlock_at         timestamptz not null,
  status            text        not null default 'scheduled'
                                check (status in ('scheduled', 'delivering', 'delivered', 'failed', 'cancelled')),
  delivery_attempts integer     not null default 0,
  last_error        text,
  delivered_at      timestamptz,
  created_at        timestamptz not null default now(),
  constraint capsules_unlock_after_creation check (unlock_at > created_at)
);

create table if not exists public.capsule_files (
  id           uuid        primary key default gen_random_uuid(),
  capsule_id   uuid        not null references public.capsules (id) on delete cascade,
  storage_path text        not null unique,
  filename     text        not null,
  mime_type    text,
  size_bytes   bigint      not null check (size_bytes >= 0),
  created_at   timestamptz not null default now()
);

-- The delivery worker only ever scans for capsules that are still waiting.
create index if not exists capsules_due_idx
  on public.capsules (unlock_at)
  where status = 'scheduled';

create index if not exists capsule_files_capsule_id_idx
  on public.capsule_files (capsule_id);

alter table public.capsules      enable row level security;
alter table public.capsule_files enable row level security;

-- Private bucket. Recipients get short-lived signed URLs at delivery time
-- rather than a permanent public path.
insert into storage.buckets (id, name, public)
values ('capsules', 'capsules', false)
on conflict (id) do nothing;

-- Claims a batch of due capsules and flips them to 'delivering' in a single
-- statement. `for update skip locked` is what makes overlapping cron runs safe:
-- a second worker skips rows the first has already locked instead of sending
-- the same capsule twice.
create or replace function public.claim_due_capsules(batch_size integer default 25)
returns setof public.capsules
language sql
security definer
set search_path = public
as $$
  update public.capsules c
     set status            = 'delivering',
         delivery_attempts = c.delivery_attempts + 1
   where c.id in (
           select id
             from public.capsules
            where status = 'scheduled'
              and unlock_at <= now()
            order by unlock_at
            limit batch_size
              for update skip locked
         )
  returning c.*;
$$;

revoke all on function public.claim_due_capsules(integer) from public, anon, authenticated;
