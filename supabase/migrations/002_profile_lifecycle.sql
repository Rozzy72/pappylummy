-- Review before manual Dashboard application. No existing-user backfill here.
-- Run as the trusted migration owner; never as an application/browser role.
begin;

create or replace function public.jersey_store_create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke all on function public.jersey_store_create_profile()
  from public, anon, authenticated;

-- Replace only this migration's named trigger; repeated deployment adds none.
drop trigger if exists jersey_store_auth_user_created on auth.users;
create trigger jersey_store_auth_user_created
  after insert on auth.users
  for each row execute function public.jersey_store_create_profile();

commit;
