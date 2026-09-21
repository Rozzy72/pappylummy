# Profile lifecycle — Task 14C (prepared, NOT applied)

## Verified repository schema

profiles.id: UUID primary key (unique index), non-null, no default, foreign key
references auth.users(id) ON DELETE CASCADE. full_name and phone: nullable text,
no defaults. created_at and updated_at: non-null timestamptz, default now().
No other profile indexes/check constraints. profiles_set_updated_at is a BEFORE
UPDATE trigger using the existing invoker-rights timestamp function.
RLS is enabled. Authenticated users SELECT their own ID and UPDATE only full_name
and phone on their own row (USING and WITH CHECK). No client INSERT or DELETE.
Anonymous users have no private-table grants. No existing signup trigger appears
in repository migrations; live trigger inventory must still be checked.

## Read-only Dashboard preflight

Public access cannot determine auth.users membership. Run these queries in the
trusted SQL Editor before applying 002. No emails or metadata need be returned.

```sql
select count(*) as auth_users,
       count(p.id) as users_with_profiles,
       count(*) filter (where p.id is null) as missing_profiles
from auth.users as u
left join public.profiles as p on p.id = u.id;

select u.id as missing_profile_user_id
from auth.users as u
where not exists (select 1 from public.profiles as p where p.id = u.id)
order by u.id;

select t.tgname, pg_catalog.pg_get_triggerdef(t.oid) as definition
from pg_catalog.pg_trigger as t
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
```

Review any existing profile-creation trigger or same-named function before applying;
do not silently replace unrelated live logic. Deploy with the trusted migration
owner. CREATE OR REPLACE retains an existing function owner: verify that owner is
trusted on repeat deployment. No application credential needs elevated privileges.
The transaction replaces only its named trigger. No unrelated triggers are dropped.

## Failure behavior

The AFTER INSERT trigger runs in the Auth insert transaction. Insert failures
propagate; the Auth insert rolls back, rather than leaving a newly committed user
without a profile. A primary key prevents duplicate profiles. No exception handler
or ON CONFLICT hides unexpected competing-trigger/insertion errors. Test signup
failure behavior before enabling registration. This does not repair pre-existing
missing profiles or prevent a trusted administrator deleting profiles later.

## Existing users: separate guarded backfill design

Status UNKNOWN until the Dashboard inspection. If missing_profiles = 0, skip
backfill. Otherwise review the exact missing UUID set before preparing a separate
transaction: lock auth.users and profiles against concurrent writes, assert the
current missing set equals the reviewed set and expected count, insert only those
missing IDs via NOT EXISTS, assert the affected count equals the approved count,
then commit. Any mismatch raises an exception and aborts. Never update existing
profiles or copy metadata. No executable backfill is included or authorized here.

## Post-application read-only verification

```sql
select p.prosecdef, p.proconfig,
       pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
       pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc as p
where p.oid = 'public.jersey_store_create_profile()'::regprocedure;
```

Expect SECURITY DEFINER, empty search_path, trusted owner, both EXECUTE flags false.
Repeat the trigger inventory and missing-profile query. Inspect table grants and
RLS against migration 001: they must be unchanged. No public RPC is exposed; the
function returns trigger and client EXECUTE is revoked.

## Live tests pending

Structural tests are not PostgreSQL execution or live RLS proof. After approved
application, use two disposable users via the supported Auth flow: each gets one
minimal profile; metadata cannot set trusted fields; A cannot read/update B, insert
an arbitrary profile, change id, or delete profiles; anon cannot read private rows.
Confirm normal own-field updates still work. Simulate trigger failure only in an
isolated test database and confirm user creation rolls back. Do not weaken live
policies or manipulate production Auth users for testing.
