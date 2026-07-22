import { supabase } from './supabase';

const CAPSULE_BUCKET = 'capsules';

export interface NewCapsule {
  name: string;
  description: string;
  recipientEmail: string;
  /** ISO-8601 instant the capsule should be delivered. */
  unlockAt: string;
  files: File[];
}

interface UploadTicket {
  filename: string;
  path: string;
  token: string;
}

interface CreateResponse {
  capsuleId: string;
  uploads: UploadTicket[];
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

export async function createCapsule(capsule: NewCapsule): Promise<string> {
  const client = supabase();

  const { data, error } = await client.functions.invoke<CreateResponse>('create-capsule', {
    body: {
      name: capsule.name,
      description: capsule.description,
      recipientEmail: capsule.recipientEmail,
      unlockAt: capsule.unlockAt,
      files: capsule.files.map((file) => ({
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })),
    },
  });

  if (error) throw new Error(await messageFrom(error, 'Could not create the capsule.'));
  if (!data) throw new Error('The server returned an empty response.');

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
    }),
  );

  return data.capsuleId;
}
