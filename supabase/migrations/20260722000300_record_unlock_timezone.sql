-- `unlock_at` alone loses the sender's intent: it says when the capsule opens,
-- but not what they typed. Keep both so a capsule can be read back as
-- "noon on June 15th, your time" rather than an instant in someone else's zone.

alter table public.capsules
  add column if not exists unlock_timezone text,
  add column if not exists unlock_local    text;

comment on column public.capsules.unlock_timezone is
  'IANA zone the sender chose the time in, e.g. America/Los_Angeles.';
comment on column public.capsules.unlock_local is
  'The wall-clock the sender actually picked, as YYYY-MM-DDTHH:MM.';
