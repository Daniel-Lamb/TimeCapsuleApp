import { adminClient, CAPSULE_BUCKET } from '../_shared/admin.ts';
import { failure, json, preflight } from '../_shared/http.ts';
import { MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES, MAX_UNLOCK_YEARS } from '../_shared/limits.ts';

interface FileRequest {
  filename: string;
  mimeType?: string;
  sizeBytes: number;
}

interface CreateRequest {
  name: string;
  description?: string;
  recipientEmail: string;
  unlockAt: string;
  files: FileRequest[];
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Storage keys are built from user input, so strip anything that could escape
 * the capsule's own prefix or confuse the storage API.
 */
function safeFilename(filename: string): string {
  const cleaned = filename.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(-80).replace(/^\.+/, '') || 'file';
}

function validate(body: Partial<CreateRequest>): string | null {
  const name = body.name?.trim();
  if (!name) return 'Capsule name is required.';
  if (name.length > 120) return 'Capsule name must be 120 characters or fewer.';

  if ((body.description?.length ?? 0) > 2000) {
    return 'Description must be 2000 characters or fewer.';
  }

  if (!body.recipientEmail || !EMAIL_PATTERN.test(body.recipientEmail)) {
    return 'A valid recipient email is required.';
  }

  if (!body.unlockAt) return 'An unlock date and time is required.';
  const unlockAt = new Date(body.unlockAt);
  if (Number.isNaN(unlockAt.getTime())) return 'Unlock date and time is not a valid timestamp.';
  if (unlockAt.getTime() <= Date.now()) return 'The unlock date must be in the future.';

  const ceiling = new Date();
  ceiling.setFullYear(ceiling.getFullYear() + MAX_UNLOCK_YEARS);
  if (unlockAt > ceiling) return `The unlock date must be within ${MAX_UNLOCK_YEARS} years.`;

  const files = body.files ?? [];
  if (!Array.isArray(files)) return 'Files must be a list.';
  if (files.length > MAX_FILES) return `A capsule can hold at most ${MAX_FILES} files.`;

  let total = 0;
  for (const file of files) {
    if (!file?.filename) return 'Every file needs a filename.';
    if (typeof file.sizeBytes !== 'number' || file.sizeBytes < 0) {
      return `Invalid size for "${file.filename}".`;
    }
    if (file.sizeBytes > MAX_FILE_BYTES) {
      return `"${file.filename}" is larger than the ${MAX_FILE_BYTES / 1024 / 1024} MB per-file limit.`;
    }
    total += file.sizeBytes;
  }
  if (total > MAX_TOTAL_BYTES) {
    return `Capsule contents exceed the ${MAX_TOTAL_BYTES / 1024 / 1024} MB total limit.`;
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return failure('Method not allowed.', 405);

  let body: Partial<CreateRequest>;
  try {
    body = await req.json();
  } catch {
    return failure('Request body must be JSON.');
  }

  const problem = validate(body);
  if (problem) return failure(problem);

  const request = body as CreateRequest;
  const supabase = adminClient();

  const { data: capsule, error: insertError } = await supabase
    .from('capsules')
    .insert({
      name: request.name.trim(),
      description: request.description?.trim() || null,
      recipient_email: request.recipientEmail.trim().toLowerCase(),
      unlock_at: new Date(request.unlockAt).toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !capsule) {
    console.error('capsule insert failed', insertError);
    return failure('Could not create the capsule. Please try again.', 500);
  }

  // One signed upload URL per file. The rows are written up front so a failed
  // upload leaves a traceable record rather than a silently empty capsule.
  const uploads: Array<{ filename: string; path: string; token: string }> = [];

  for (const file of request.files ?? []) {
    const path = `${capsule.id}/${crypto.randomUUID()}-${safeFilename(file.filename)}`;

    const { data: signed, error: signError } = await supabase.storage
      .from(CAPSULE_BUCKET)
      .createSignedUploadUrl(path);

    if (signError || !signed) {
      console.error('signed upload url failed', signError);
      await supabase.from('capsules').delete().eq('id', capsule.id);
      return failure('Could not prepare the file upload. Please try again.', 500);
    }

    const { error: fileError } = await supabase.from('capsule_files').insert({
      capsule_id: capsule.id,
      storage_path: path,
      filename: file.filename.slice(0, 255),
      mime_type: file.mimeType || null,
      size_bytes: file.sizeBytes,
    });

    if (fileError) {
      console.error('capsule_files insert failed', fileError);
      await supabase.from('capsules').delete().eq('id', capsule.id);
      return failure('Could not record the file. Please try again.', 500);
    }

    uploads.push({ filename: file.filename, path, token: signed.token });
  }

  return json({ capsuleId: capsule.id, uploads }, 201);
});
