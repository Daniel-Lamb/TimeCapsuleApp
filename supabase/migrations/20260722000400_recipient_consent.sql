-- Nothing stopped someone scheduling files to an address that never agreed to
-- receive them, years out, with no way for either side to call it off. A
-- capsule now waits for the recipient to say yes, and both parties hold an
-- unguessable token that lets them act on it later.

alter table public.capsules
  add column if not exists sender_email  text,
  add column if not exists confirm_token uuid not null default gen_random_uuid(),
  add column if not exists manage_token  uuid not null default gen_random_uuid(),
  add column if not exists confirmed_at  timestamptz,
  add column if not exists cancelled_at  timestamptz;

alter table public.capsules drop constraint if exists capsules_status_check;
alter table public.capsules add constraint capsules_status_check
  check (status in ('pending_confirmation', 'scheduled', 'delivering', 'delivered', 'failed', 'cancelled'));

-- New capsules start unconfirmed. `claim_due_capsules` only ever looks at
-- 'scheduled', so an unconfirmed capsule is never delivered.
alter table public.capsules alter column status set default 'pending_confirmation';

create unique index if not exists capsules_confirm_token_idx on public.capsules (confirm_token);
create unique index if not exists capsules_manage_token_idx  on public.capsules (manage_token);
