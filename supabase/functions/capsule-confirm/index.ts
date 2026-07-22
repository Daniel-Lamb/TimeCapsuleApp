import { adminClient } from '../_shared/admin.ts';

/**
 * Reached by clicking a link in an email, so there is no anon key on the
 * request and no JSON client to read the response — this function is deployed
 * with verify_jwt off and authorises purely on the unguessable confirm token.
 * It answers in HTML because a person is looking at it.
 */

function page(title: string, message: string, tone: 'ok' | 'bad' = 'ok'): Response {
  const accent = tone === 'ok' ? '#4f46e5' : '#b91c1c';
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>${title}</title></head>
     <body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f5f6ff;margin:0;
                  min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
       <div style="background:#fff;border-radius:16px;padding:40px;max-width:460px;text-align:center;
                   box-shadow:0 10px 40px rgba(0,0,0,.08)">
         <h1 style="color:${accent};font-size:22px;margin:0 0 12px">${title}</h1>
         <p style="color:#4b5563;line-height:1.6;margin:0">${message}</p>
       </div>
     </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const action = url.searchParams.get('action');

  if (!token) return page('Link incomplete', 'This link is missing its token.', 'bad');
  if (action !== 'confirm' && action !== 'decline') {
    return page('Link incomplete', 'This link is missing a valid action.', 'bad');
  }

  const supabase = adminClient();

  const { data: capsule } = await supabase
    .from('capsules')
    .select('id, name, status, unlock_local, unlock_timezone')
    .eq('confirm_token', token)
    .maybeSingle();

  if (!capsule) {
    return page('Link not recognised', 'This confirmation link is not valid any more.', 'bad');
  }

  // Clicking twice should read as "already done", not as an error.
  if (capsule.status === 'scheduled' && action === 'confirm') {
    return page('Already confirmed', `&ldquo;${capsule.name}&rdquo; is already on its way to you.`);
  }
  if (capsule.status === 'cancelled') {
    return page('Already declined', `&ldquo;${capsule.name}&rdquo; has been cancelled. Nothing will be sent.`);
  }
  if (capsule.status !== 'pending_confirmation') {
    return page('Nothing to do', `&ldquo;${capsule.name}&rdquo; is ${capsule.status}.`);
  }

  if (action === 'decline') {
    await supabase
      .from('capsules')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', capsule.id);
    return page('Declined', 'Nothing will be sent, and the files will not be delivered to you.');
  }

  await supabase
    .from('capsules')
    .update({ status: 'scheduled', confirmed_at: new Date().toISOString() })
    .eq('id', capsule.id);

  const when = capsule.unlock_local
    ? `${capsule.unlock_local.replace('T', ' at ')} (${capsule.unlock_timezone})`
    : 'its scheduled date';

  return page('Confirmed', `&ldquo;${capsule.name}&rdquo; will arrive on ${when}.`);
});
