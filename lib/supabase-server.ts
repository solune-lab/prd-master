import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with service role privileges.
 * ONLY use in server-side API routes. Never import from client components.
 * Bypasses RLS for direct DB operations (webhook handling, usage tracking, etc.)
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client authenticated as the requesting user.
 * Uses the Authorization header bearer token from the request.
 * Respects RLS policies.
 */
export function createAuthenticatedClient(authHeader: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  return createSupabaseClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

/**
 * Helper: Extract user from request using the JWT in the Authorization header.
 * Returns null if no valid session found.
 */
export async function getUserFromRequest(req: Request): Promise<{ id: string; email: string; user_metadata?: Record<string, any> } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabase = createAuthenticatedClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { id: user.id, email: user.email || '', user_metadata: user.user_metadata };
}
