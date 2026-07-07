-- Rate limiting: per-user, per-route sliding window counter
create table if not exists public.rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null,
  window_start timestamp with time zone not null,
  request_count integer not null default 0,
  primary key (user_id, route)
);

alter table public.rate_limits enable row level security;

-- No public policies: this table is only accessed via the service role
-- (server-side rate-limit checks), so RLS blocks all direct client access.

-- Atomic check-and-increment. Resets the window when it has expired.
-- Returns true if the request is allowed, false if the limit was exceeded.
create or replace function public.check_and_increment_rate_limit(
  user_uuid uuid,
  route_key text,
  max_requests integer,
  window_seconds integer
)
returns boolean as $$
declare
  allowed boolean;
begin
  insert into public.rate_limits (user_id, route, window_start, request_count)
  values (user_uuid, route_key, now(), 1)
  on conflict (user_id, route) do update
    set request_count = case
          when public.rate_limits.window_start < now() - make_interval(secs => window_seconds)
            then 1
          else public.rate_limits.request_count + 1
        end,
        window_start = case
          when public.rate_limits.window_start < now() - make_interval(secs => window_seconds)
            then now()
          else public.rate_limits.window_start
        end
  returning (request_count <= max_requests) into allowed;

  return allowed;
end;
$$ language plpgsql security definer;
