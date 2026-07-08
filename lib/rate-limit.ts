import { createServiceClient } from '@/lib/supabase-server';

/**
 * Per-user sliding-window rate limit backed by the `check_and_increment_rate_limit`
 * Postgres function (atomic, race-free). Returns true if the request is allowed.
 */
export async function checkRateLimit(
  userId: string,
  route: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    user_uuid: userId,
    route_key: route,
    max_requests: maxRequests,
    window_seconds: windowSeconds,
  });

  if (error) {
    console.error(`[rate-limit] ${route} check failed:`, error.message);
    // Fail open: a rate-limit outage shouldn't take down the product.
    return true;
  }

  return !!data;
}
