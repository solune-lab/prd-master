-- Atomic counter: increment total rounds
create or replace function public.increment_total_rounds(user_uuid uuid)
returns void as $$
  update profiles set total_rounds = total_rounds + 1 where id = user_uuid;
$$ language sql security definer;

-- Atomic counter: decrement remaining downloads (floor at 0)
create or replace function public.decrement_remaining_downloads(user_uuid uuid)
returns integer as $$
  update profiles
  set remaining_downloads = greatest(remaining_downloads - 1, 0)
  where id = user_uuid
  returning remaining_downloads;
$$ language sql security definer;

-- Handle new user: auto-create profile on auth.users insert
create or replace function public.handle_new_user()
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

-- Trigger (drop if exists to avoid duplicate error)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
