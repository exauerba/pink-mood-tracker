// bloom — delete-account edge function.
// Uses the service-role key (server-side) to permanently delete an auth user.
// ON DELETE CASCADE on trackers/entries removes that user's data rows too.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// The browser blocks cross-origin calls without CORS headers. The app runs on
// a different origin than the Supabase project, so every response (including
// the OPTIONS preflight) must carry these. Auth is via the Authorization
// header, so a wildcard origin is safe.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!serviceRoleKey) {
    return json({ error: 'Service not configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const token = authorization.replace('Bearer ', '');

    // Verify the caller's token and resolve their user id.
    const { data, error: verifyError } = await supabase.auth.getUser(token);
    if (verifyError || !data.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(data.user.id);
    if (deleteError) {
      return json({ error: 'Could not delete account' }, 500);
    }

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
});