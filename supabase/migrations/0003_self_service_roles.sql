begin;

with approved_requests as (
  update public.role_requests
  set status = 'approved', decided_at = coalesce(decided_at, now())
  where status = 'pending'
  returning user_id, requested_role
), changed_profiles as (
  update public.profiles p
  set role = r.requested_role
  from approved_requests r
  where p.id = r.user_id and p.role = 'customer'
  returning p.id, p.role
)
insert into public.audit_log(actor_id, action, entity, entity_id, detail)
select id, 'self_service_role_change', 'profiles', id::text, jsonb_build_object('role', role::text)
from changed_profiles;

revoke insert on public.role_requests from authenticated;
drop policy if exists rr_insert on public.role_requests;
revoke execute on function public.decide_role_request(uuid, boolean) from authenticated;

create or replace function public.set_self_service_role(p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if p_role is null or p_role not in ('affiliate', 'seller') then
    raise exception using errcode = '22023', message = 'invalid role';
  end if;

  update public.profiles
  set role = p_role
  where id = v_user_id and role = 'customer';
  if not found then
    raise exception using errcode = '42501', message = 'only customer accounts can select a self-service role';
  end if;

  insert into public.audit_log(actor_id, action, entity, entity_id, detail)
  values (
    v_user_id,
    'self_service_role_change',
    'profiles',
    v_user_id::text,
    jsonb_build_object('role', p_role::text)
  );
end;
$$;

revoke all on function public.set_self_service_role(public.app_role) from public, anon, authenticated;
grant execute on function public.set_self_service_role(public.app_role) to authenticated;

commit;
