create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  email text,
  full_name text,
  avatar_url text,
  tier text default 'free',
  total_rounds integer default 0,
  remaining_downloads integer default 0,
  invitation_code text,
  balance_credits integer default 0,
  fingerprint text,
  is_trial_active boolean default false,
  trial_end_date timestamp with time zone,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'none',
  subscription_end timestamp with time zone,
  referred_by uuid references auth.users(id),

  constraint username_length check (char_length(full_name) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for usage logs (optional but good for tracking)
create table usage_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  action_type text,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table usage_logs enable row level security;

create policy "Users can view their own logs."
  on usage_logs for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own logs."
  on usage_logs for insert
  with check ( auth.uid() = user_id );

-- Stripe & Referral columns (run as migration if table already exists)
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);
-- CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
-- CREATE INDEX IF NOT EXISTS idx_profiles_invitation_code ON profiles(invitation_code);

-- Atomic counter functions (avoids race conditions)
create or replace function public.increment_total_rounds(user_uuid uuid)
returns void as $$
  update profiles set total_rounds = total_rounds + 1 where id = user_uuid;
$$ language sql security definer;

create or replace function public.decrement_remaining_downloads(user_uuid uuid)
returns integer as $$
  update profiles
  set remaining_downloads = greatest(remaining_downloads - 1, 0)
  where id = user_uuid
  returning remaining_downloads;
$$ language sql security definer;

-- Function to handle new user creation
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, invitation_code)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    upper(substring(md5(random()::text) from 1 for 8))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
