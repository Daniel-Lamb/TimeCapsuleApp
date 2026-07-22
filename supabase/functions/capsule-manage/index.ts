import { adminClient } from '../_shared/admin.ts';
import { failure, json, preflight } from '../_shared/http.ts';
import { MAX_UNLOCK_YEARS } from '../_shared/limits.ts';

/**
 * The sender's view of a capsule they have already sealed. Authorised by the
 * manage token alone — it is a uuid handed out once, in one email, and it only
 * ever reaches one capsule.
 */

const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/;

const SELECT = 'id, name, description, recipient_email, unlock_at, unlock_local, unlock_timezone, status, created_at';

/** Statuses where the capsule has not yet gone out and can still be changed. */
const MUTABLE = ['pending_confirmation', 'scheduled'];

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();

  const url = new URL(req.url);
  const supabase = adminClient();

  const token = req.method === 'GET'
    ? url.searchParams.get('token')
    : (await req.clone().json().catch(() => ({})))?.token;

  if (!token) return failure('A manage token is required.', 400);

  const { data: capsule } = await supabase
    .from('capsules')
    .select(SELECT)
    .eq('manage_token', token)
    .maybeSingle();

  if (!capsule) return failure('That manage link is not valid.', 404);

  if (req.method === 'GET') {
    const { data: files } = await supabase
      .from('capsule_files')
      .select('filename, size_bytes')
      .eq('capsule_id', capsule.id);

    return json({ capsule, files: files ?? [] });
  }

  if (req.method !== 'POST') return failure('Method not allowed.', 405);

  const body = await req.json().catch(() => ({}));

  if (body.action === 'cancel') {
    if (!MUTABLE.includes(capsule.status)) {
      return failure(`This capsule is ${capsule.status} and can no longer be cancelled.`, 409);
    }
    await supabase
      .from('capsules')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', capsule.id);
    return json({ capsule: { ...capsule, status: 'cancelled' } });
  }

  if (body.action === 'reschedule') {
    if (!MUTABLE.includes(capsule.status)) {
      return failure(`This capsule is ${capsule.status} and can no longer be rescheduled.`, 409);
    }
    if (!body.unlockAt || !HAS_OFFSET.test(body.unlockAt)) {
      return failure('Unlock time must include a UTC offset so the intended moment is unambiguous.');
    }
    const unlockAt = new Date(body.unlockAt);
    if (Number.isNaN(unlockAt.getTime())) return failure('Unlock date and time is not a valid timestamp.');
    if (unlockAt.getTime() <= Date.now()) return failure('The unlock date must be in the future.');
    if (!body.unlockTimezone || !isValidTimeZone(body.unlockTimezone)) {
      return failure('A valid IANA time zone is required.');
    }

    const ceiling = new Date();
    ceiling.setFullYear(ceiling.getFullYear() + MAX_UNLOCK_YEARS);
    if (unlockAt > ceiling) return failure(`The unlock date must be within ${MAX_UNLOCK_YEARS} years.`);

    const { data: updated } = await supabase
      .from('capsules')
      .update({
        unlock_at: unlockAt.toISOString(),
        unlock_timezone: body.unlockTimezone,
        unlock_local: String(body.unlockLocal ?? '').slice(0, 32) || null,
      })
      .eq('id', capsule.id)
      .select(SELECT)
      .single();

    return json({ capsule: updated });
  }

  return failure('Unknown action.', 400);
});
