-- EA Platform schema. Run in Supabase -> SQL Editor. Review before production.
create type app_role as enum ('customer','affiliate','seller','support','admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  country text not null default 'UG',
  role app_role not null default 'customer',
  created_at timestamptz not null default now()
);

create or replace function public.current_role_name() returns app_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  -- Role is ALWAYS customer at signup. Metadata from the client is ignored.
  insert into profiles(id, email) values (new.id, new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  requested_role app_role not null check (requested_role in ('affiliate','seller')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index one_pending_request on role_requests(user_id) where status = 'pending';

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  country text not null default 'UG',
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','verified','rejected')),
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  source text not null default 'seller' check (source in ('seller','amazon','jumia')),
  title text not null check (char_length(title) between 2 and 200),
  description text check (char_length(description) <= 5000),
  category text,
  price_minor bigint not null check (price_minor >= 0),
  currency text not null check (char_length(currency) = 3),
  price_checked_at timestamptz not null default now(),
  stock_status text not null default 'unknown' check (stock_status in ('in_stock','out_of_stock','unknown')),
  external_url text,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references profiles(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  message text check (char_length(message) <= 2000),
  consent_shared boolean not null check (consent_shared = true),
  status text not null default 'new' check (status in ('new','contacted','qualified','converted','closed','invalid')),
  created_at timestamptz not null default now()
);

create table affiliate_links (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  code text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,12),
  created_at timestamptz not null default now(),
  unique (affiliate_id, product_id)
);

create table click_events (
  id bigint generated always as identity primary key,
  link_id uuid not null references affiliate_links(id) on delete cascade,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table conversions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references affiliate_links(id),
  merchant text not null,
  external_id text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  created_at timestamptz not null default now(),
  unique (merchant, external_id)               -- duplicate conversion prevention
);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  conversion_id uuid not null unique references conversions(id),
  affiliate_id uuid not null references profiles(id),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  rate_bps integer not null check (rate_bps between 0 and 10000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','reversed','paid')),
  updated_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create or replace function public.audit_immutable() returns trigger language plpgsql as
$$ begin raise exception 'audit_log is append-only'; end $$;
create trigger audit_no_update before update or delete on audit_log
  for each row execute function public.audit_immutable();

-- ===================== RLS: enable everywhere =====================
alter table profiles enable row level security;
alter table role_requests enable row level security;
alter table businesses enable row level security;
alter table products enable row level security;
alter table leads enable row level security;
alter table affiliate_links enable row level security;
alter table click_events enable row level security;
alter table conversions enable row level security;
alter table commissions enable row level security;
alter table audit_log enable row level security;

-- Start from zero privileges, then grant narrowly.
revoke all on all tables in schema public from anon, authenticated;

grant select on profiles to authenticated;
grant update (full_name, country) on profiles to authenticated;   -- NOT role
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or current_role_name() = 'admin');
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

grant select, insert on role_requests to authenticated;
create policy rr_read on role_requests for select to authenticated
  using (user_id = auth.uid() or current_role_name() = 'admin');
create policy rr_insert on role_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

grant select on businesses to anon, authenticated;
grant insert (owner_id, name, country) on businesses to authenticated;
grant update (name, country) on businesses to authenticated;
create policy biz_read on businesses for select to anon, authenticated
  using (verification_status = 'verified' or owner_id = auth.uid() or current_role_name() = 'admin');
create policy biz_insert on businesses for insert to authenticated
  with check (owner_id = auth.uid() and current_role_name() = 'seller');
create policy biz_update on businesses for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select on products to anon, authenticated;
grant insert (business_id, title, description, category, price_minor, currency, stock_status) on products to authenticated;
grant update (title, description, category, price_minor, currency, stock_status, price_checked_at) on products to authenticated;
create policy prod_read on products for select to anon, authenticated
  using (status = 'published'
    or exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid())
    or current_role_name() = 'admin');
create policy prod_insert on products for insert to authenticated
  with check (source = 'seller' and status = 'pending'
    and exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy prod_update on products for update to authenticated
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

grant select on leads to authenticated;
grant insert (product_id, business_id, customer_id, name, email, message, consent_shared) on leads to anon, authenticated;
grant update (status) on leads to authenticated;
create policy leads_insert on leads for insert to anon, authenticated
  with check (consent_shared = true
    and exists (select 1 from products p where p.id = product_id and p.business_id = leads.business_id and p.status = 'published')
    and (customer_id is null or customer_id = auth.uid()));
create policy leads_read on leads for select to authenticated
  using (customer_id = auth.uid()
    or exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid())
    or current_role_name() = 'admin');
create policy leads_update on leads for update to authenticated
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid()));

grant select, insert (affiliate_id, product_id) on affiliate_links to authenticated;
create policy al_read on affiliate_links for select to authenticated
  using (affiliate_id = auth.uid() or current_role_name() = 'admin');
create policy al_insert on affiliate_links for insert to authenticated
  with check (affiliate_id = auth.uid() and current_role_name() = 'affiliate'
    and exists (select 1 from products p where p.id = product_id and p.status = 'published'));

grant select on click_events to authenticated;
create policy ce_read on click_events for select to authenticated
  using (current_role_name() = 'admin'
    or exists (select 1 from affiliate_links l where l.id = link_id and l.affiliate_id = auth.uid()));

grant select on conversions to authenticated;
create policy conv_read on conversions for select to authenticated
  using (current_role_name() = 'admin'
    or exists (select 1 from affiliate_links l where l.id = link_id and l.affiliate_id = auth.uid()));

grant select on commissions to authenticated;
create policy comm_read on commissions for select to authenticated
  using (affiliate_id = auth.uid() or current_role_name() = 'admin');

grant select on audit_log to authenticated;
create policy audit_read on audit_log for select to authenticated using (current_role_name() = 'admin');

-- ===================== Trusted functions (admin / system) =====================
create or replace function public.decide_role_request(req_id uuid, approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r role_requests;
begin
  if current_role_name() <> 'admin' then raise exception 'forbidden'; end if;
  select * into r from role_requests where id = req_id and status = 'pending' for update;
  if not found then raise exception 'request not found'; end if;
  update role_requests set status = case when approve then 'approved' else 'rejected' end,
    decided_by = auth.uid(), decided_at = now() where id = req_id;
  if approve then update profiles set role = r.requested_role where id = r.user_id; end if;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'decide_role_request', 'role_requests', req_id::text, jsonb_build_object('approve', approve));
end $$;

create or replace function public.moderate_product(pid uuid, publish boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_role_name() <> 'admin' then raise exception 'forbidden'; end if;
  update products set status = case when publish then 'published' else 'rejected' end where id = pid;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'moderate_product', 'products', pid::text, jsonb_build_object('publish', publish));
end $$;

create or replace function public.set_business_verification(bid uuid, new_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_role_name() <> 'admin' then raise exception 'forbidden'; end if;
  if new_status not in ('pending','verified','rejected') then raise exception 'bad status'; end if;
  update businesses set verification_status = new_status where id = bid;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'set_business_verification', 'businesses', bid::text, jsonb_build_object('status', new_status));
end $$;

-- Allowed commission transitions only. Nobody can mark their own commission paid.
create or replace function public.set_commission_status(cid uuid, new_status text) returns void
language plpgsql security definer set search_path = public as $$
declare c commissions; ok boolean;
begin
  if current_role_name() <> 'admin' then raise exception 'forbidden'; end if;
  select * into c from commissions where id = cid for update;
  if not found then raise exception 'not found'; end if;
  ok := (c.status = 'pending'  and new_status in ('approved','rejected'))
     or (c.status = 'approved' and new_status in ('paid','reversed'))
     or (c.status = 'paid'     and new_status = 'reversed');
  if not ok then raise exception 'illegal transition % -> %', c.status, new_status; end if;
  update commissions set status = new_status, updated_at = now() where id = cid;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'set_commission_status', 'commissions', cid::text,
            jsonb_build_object('from', c.status, 'to', new_status));
end $$;

-- Public click recorder: returns the destination, stores only a hashed IP.
create or replace function public.record_click(link_code text, ip_hash text) returns text
language plpgsql security definer set search_path = public as $$
declare lid uuid; url text;
begin
  select l.id, p.external_url into lid, url from affiliate_links l
    join products p on p.id = l.product_id where l.code = link_code and p.status = 'published';
  if lid is null then return null; end if;
  insert into click_events(link_id, ip_hash) values (lid, ip_hash);
  return url;
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.decide_role_request(uuid, boolean) to authenticated;
grant execute on function public.moderate_product(uuid, boolean) to authenticated;
grant execute on function public.set_business_verification(uuid, text) to authenticated;
grant execute on function public.set_commission_status(uuid, text) to authenticated;
grant execute on function public.record_click(text, text) to anon, authenticated;
grant execute on function public.current_role_name() to anon, authenticated;
