import { supabase } from './supabase';

const CAPSULE_BUCKET = 'capsules';

export interface NewCapsule {
  name: string;
  description: string;
  recipientEmail: string;
  /** Optional — when given, the sender is emailed their manage link. */
  senderEmail: string;
  /** Absolute instant, offset included, that the capsule should be delivered. */
  unlockAt: string;
  /** IANA zone the sender picked that time in. */
  unlockTimezone: string;
  /** The wall-clock they actually typed, kept for reading back to them. */
  unlockLocal: string;
  files: File[];
}

interface UploadTicket {
  filename: string;
  path: string;
  token: string;
}

interface CreateResponse {
  capsuleId: string;
  manageToken: string;
  uploads: UploadTicket[];
}

export interface ManagedCapsule {
  id: string;
  name: string;
  description: string | null;
  recipient_email: string;
  unlock_at: string;
  unlock_local: string | null;
  unlock_timezone: string | null;
  status: string;
  created_at: string;
}

export interface ManagedCapsuleView {
  capsule: ManagedCapsule;
  files: Array<{ filename: string; size_bytes: number }>;
}

/**
 * Edge functions signal validation problems as `{ error }` with a 4xx, which
 * supabase-js surfaces as a generic FunctionsHttpError — the readable message
 * is only in the response body, so dig it out.
 */
async function messageFrom(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Body was not JSON; fall through to the generic message.
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export interface CapsuleProgress {
  phase: 'creating' | 'uploading';
  uploaded: number;
  total: number;
}

export async function createCapsule(
  capsule: NewCapsule,
  onProgress?: (progress: CapsuleProgress) => void,
): Promise<string> {
  const client = supabase();
  onProgress?.({ phase: 'creating', uploaded: 0, total: capsule.files.length });

  const { data, error } = await client.functions.invoke<CreateResponse>('create-capsule', {
    body: {
      name: capsule.name,
      description: capsule.description,
      recipientEmail: capsule.recipientEmail,
      senderEmail: capsule.senderEmail || undefined,
      unlockAt: capsule.unlockAt,
      unlockTimezone: capsule.unlockTimezone,
      unlockLocal: capsule.unlockLocal,
      files: capsule.files.map((file) => ({
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })),
    },
  });

  if (error) throw new Error(await messageFrom(error, 'Could not create the capsule.'));
  if (!data) throw new Error('The server returned an empty response.');

  let uploaded = 0;
  onProgress?.({ phase: 'uploading', uploaded, total: data.uploads.length });

  // Tickets come back in request order, so pair by index — filenames are not
  // unique within a capsule.
  await Promise.all(
    data.uploads.map(async (ticket, index) => {
      const file = capsule.files[index];
      if (!file) return;

      const { error: uploadError } = await client.storage
        .from(CAPSULE_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file);

      if (uploadError) throw new Error(`Upload failed for "${file.name}": ${uploadError.message}`);

      uploaded += 1;
      onProgress?.({ phase: 'uploading', uploaded, total: data.uploads.length });
    }),
  );

  return data.manageToken;
}

export async function loadManagedCapsule(manageToken: string): Promise<ManagedCapsuleView> {
  const { data, error } = await supabase().functions.invoke<ManagedCapsuleView>(
    `capsule-manage?token=${encodeURIComponent(manageToken)}`,
    { method: 'GET' },
  );
  if (error) throw new Error(await messageFrom(error, 'Could not load that capsule.'));
  if (!data) throw new Error('The server returned an empty response.');
  return data;
}

export async function cancelCapsule(manageToken: string): Promise<ManagedCapsule> {
  const { data, error } = await supabase().functions.invoke<{ capsule: ManagedCapsule }>(
    'capsule-manage',
    { body: { token: manageToken, action: 'cancel' } },
  );
  if (error) throw new Error(await messageFrom(error, 'Could not cancel that capsule.'));
  return data!.capsule;
}

export async function rescheduleCapsule(
  manageToken: string,
  unlock: { unlockAt: string; unlockTimezone: string; unlockLocal: string },
): Promise<ManagedCapsule> {
  const { data, error } = await supabase().functions.invoke<{ capsule: ManagedCapsule }>(
    'capsule-manage',
    { body: { token: manageToken, action: 'reschedule', ...unlock } },
  );
  if (error) throw new Error(await messageFrom(error, 'Could not reschedule that capsule.'));
  return data!.capsule;
}
