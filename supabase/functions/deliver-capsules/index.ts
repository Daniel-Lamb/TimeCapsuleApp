import { adminClient, CAPSULE_BUCKET } from '../_shared/admin.ts';
import { json, preflight } from '../_shared/http.ts';
import { layout, sendEmail } from '../_shared/email.ts';

/** How long the recipient has to grab their files before the links expire. */
const DOWNLOAD_TTL_SECONDS = 30 * 24 * 60 * 60;

const BATCH_SIZE = 25;

interface Capsule {
  id: string;
  name: string;
  description: string | null;
  recipient_email: string;
  unlock_at: string;
  created_at: string;
}

interface CapsuleFile {
  filename: string;
  storage_path: string;
  size_bytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

function buildEmail(capsule: Capsule, links: Array<{ filename: string; url: string; size: number }>): string {
  const sealed = new Date(capsule.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

  const description = capsule.description
    ? `<p style="white-space:pre-wrap">${escapeHtml(capsule.description)}</p>`
    : '';

  const fileList = links.length
    ? `<ul style="padding-left:18px">${links.map((link) => (
        `<li style="margin-bottom:6px"><a href="${link.url}">${escapeHtml(link.filename)}</a>` +
        ` <span style="color:#6b7280">(${formatBytes(link.size)})</span></li>`
      )).join('')}</ul>
      <p style="font-size:13px;color:#6b7280">These download links expire in 30 days.</p>`
    : '<p style="color:#6b7280">This capsule contained no files.</p>';

  return layout(
    `Your time capsule &ldquo;${escapeHtml(capsule.name)}&rdquo; is open`,
    `<p>You sealed this on ${sealed}. Here it is again.</p>${description}${fileList}`,
  );
}

async function deliver(supabase: ReturnType<typeof adminClient>, capsule: Capsule): Promise<void> {
  const { data: files, error } = await supabase
    .from('capsule_files')
    .select('filename, storage_path, size_bytes')
    .eq('capsule_id', capsule.id);

  if (error) throw new Error(`Could not load files: ${error.message}`);

  const links: Array<{ filename: string; url: string; size: number }> = [];

  for (const file of (files ?? []) as CapsuleFile[]) {
    const { data: signed, error: signError } = await supabase.storage
      .from(CAPSULE_BUCKET)
      .createSignedUrl(file.storage_path, DOWNLOAD_TTL_SECONDS);

    // A file whose upload never completed should not sink the whole delivery —
    // the rest of the capsule is still worth sending.
    if (signError || !signed) {
      console.warn(`capsule ${capsule.id}: skipping "${file.filename}" (${signError?.message})`);
      continue;
    }
    links.push({ filename: file.filename, url: signed.signedUrl, size: file.size_bytes });
  }

  await sendEmail({
    to: capsule.recipient_email,
    subject: `Your time capsule "${capsule.name}" is open`,
    html: buildEmail(capsule, links),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight();

  const supabase = adminClient();

  const { data: claimed, error: claimError } = await supabase
    .rpc('claim_due_capsules', { batch_size: BATCH_SIZE });

  if (claimError) {
    console.error('claim_due_capsules failed', claimError);
    return json({ error: claimError.message }, 500);
  }

  const capsules = (claimed ?? []) as Capsule[];
  let delivered = 0;
  let failed = 0;

  for (const capsule of capsules) {
    try {
      await deliver(supabase, capsule);
      await supabase
        .from('capsules')
        .update({ status: 'delivered', delivered_at: new Date().toISOString(), last_error: null })
        .eq('id', capsule.id);
      delivered += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      console.error(`capsule ${capsule.id} delivery failed`, message);

      // Hand it back to the queue so the next run retries; give up after five
      // attempts so a permanently bad address stops burning cycles.
      const { data: current } = await supabase
        .from('capsules').select('delivery_attempts').eq('id', capsule.id).single();

      await supabase
        .from('capsules')
        .update({
          status: (current?.delivery_attempts ?? 0) >= 5 ? 'failed' : 'scheduled',
          last_error: message.slice(0, 500),
        })
        .eq('id', capsule.id);
      failed += 1;
    }
  }

  return json({ claimed: capsules.length, delivered, failed });
});
