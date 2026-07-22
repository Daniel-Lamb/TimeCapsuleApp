# Digital Time Capsule

Upload photos, videos, documents, and a note, pick a date, and have the whole
thing delivered back to you — or to someone else — when that date arrives. 📬

## How it works

The browser app collects the capsule and its files, then hands both to a
Supabase backend:

- **Postgres** holds `capsules` and `capsule_files`. RLS is on with no anon
  policies, so the browser can never read or write these tables directly.
- **Storage** keeps the files in a private `capsules` bucket. Recipients get
  signed download links that expire 30 days after delivery.
- **Edge functions** are the only way in. `create-capsule` validates the
  request and hands back signed upload URLs; `deliver-capsules` sends the mail.
- **pg_cron** pokes `deliver-capsules` every five minutes. It claims due
  capsules with `for update skip locked`, so overlapping runs cannot send the
  same capsule twice, and a failed send is retried up to five times before the
  capsule is marked `failed`.

Email goes out through [Resend](https://resend.com), which replaces the Amazon
SES plan in earlier drafts — one HTTP call beats hand-rolling SigV4 signing
inside a Deno edge function.

See [SETUP.md](SETUP.md) to run it.

## Limits

| Setting | Value |
| --- | --- |
| Files per capsule | 10 |
| Per file | 25 MB |
| Per capsule | 100 MB |
| Furthest unlock date | 50 years out |
| Download link lifetime | 30 days |

## Si Quieres Ayudar

Contributions welcome:

1. Fork this repository.
2. Create a new branch for your feature or fix.
3. Submit a pull request with a detailed explanation of your changes.
