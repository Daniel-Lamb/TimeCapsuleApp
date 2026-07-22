# Setup

## 1. Front end

```bash
npm install
cp .env.example .env      # fill in your project URL and anon key
npm run dev
```

## 2. Database

```bash
supabase link --project-ref <your-project-ref>
```

Create the Vault secrets the cron job reads, either in the SQL editor or via
`supabase db execute`:

```sql
select vault.create_secret('https://<your-project-ref>.supabase.co', 'project_url');
select vault.create_secret('<your-service-role-key>',                'service_role_key');
```

Then apply the schema:

```bash
supabase db push
```

This creates the `capsules` and `capsule_files` tables (RLS on, no anon
policies), the private `capsules` storage bucket, the `claim_due_capsules`
function, and a `pg_cron` job that pokes the delivery worker every five
minutes.

## 3. Edge functions

```bash
supabase functions deploy create-capsule
supabase functions deploy deliver-capsules
supabase functions deploy capsule-manage
supabase functions deploy capsule-confirm --no-verify-jwt
```

`capsule-confirm` is the only one deployed without JWT verification: it is
reached by clicking a link in an email, where there is no anon key to send. It
authorises on the unguessable confirm token instead.

## 4. Email

Delivery uses [Resend](https://resend.com). Without a key the worker still runs
and marks capsules delivered, logging each message it would have sent — useful
for testing the schedule before paying for anything.

```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set CAPSULE_FROM_EMAIL="Time Capsule <capsules@yourdomain.com>"
```

Set `APP_BASE_URL` too, or the manage links emailed to senders will point at
`localhost`:

```bash
supabase secrets set APP_BASE_URL=https://yourdomain.com
```

Optionally lock CORS down to your deployed origin:

```bash
supabase secrets set ALLOWED_ORIGIN=https://yourdomain.com
```

## Checking on the delivery worker

```sql
select * from cron.job where jobname = 'deliver-capsules';
select * from cron.job_run_details order by start_time desc limit 10;
select id, name, status, unlock_at, delivery_attempts, last_error from capsules;
```
