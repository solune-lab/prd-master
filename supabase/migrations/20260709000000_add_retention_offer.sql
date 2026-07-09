-- Cancellation retention offer: tracks whether a monthly subscriber has
-- already redeemed their one-time 15% retention coupon. Yearly subscribers
-- are exempt from this cap by design (checked in application code), so this
-- column is only ever set for monthly subscribers.
alter table public.profiles add column if not exists has_used_retention_offer boolean default false;
