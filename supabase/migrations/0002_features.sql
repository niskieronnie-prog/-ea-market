-- Milestone 2: campaigns, webhooks, payouts, support, notifications, FX, AI usage, privacy, storage.
-- Run AFTER 0001. Review before production.

-- ---------- private settings + server key (no grants, no policies) ----------
create table private_settings (key text primary key, value text not null);
alter table private_settings enable row level security;
create or replace function public.check_server_key(k text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from private_settings where key = 'server_key_hash'
                  and value = encode(sha256(convert_to(k, 'utf8')), 'hex')) $$;

create table app_settings (key text primary key, value text not null);
alter table app_settings enable row level security;
insert into app_settings values ('payout_min_minor', '50000');  -- configurable threshold, NOT a legal/market figure

-- ---------- FK changes so financial rows survive account deletion ----------
alter table commissions alter column affiliate_id drop not null;
alter table commissions drop constraint commissions_affiliate_id_fkey;
alter table commissions add constraint commissions_affiliate_id_fkey
  foreign key (affiliate_id) references profiles(id) on delete set null;
alter table conversions drop constraint conversions_link_id_fkey;
alter table conversions add constraint conversions_link_id_fkey
  foreign key (link_id) references affiliate_links(id) on delete set null;

-- ---------- campaigns ----------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  objective text not null check (objective in ('awareness','leads','sales')),
  target_country text not null check (target_country in ('UG','KE','TZ','RW')),
  audience_note text check (char_length(audience_note) <= 500),
  commission_bps integer not null check (commission_bps between 0 and 10000),
  budget_minor bigint not null check (budget_minor >= 0),
  spent_minor bigint not null default 0 check (spent_minor >= 0),
  currency text not null check (char_length(currency) = 3),
  attribution_days integer not null default 30 check (attribution_days between 1 and 90),
  status text not null default 'draft' check (status in ('draft','active','paused','ended')),
  created_at timestamptz not null default now()
);
alter table campaigns enable row level security;
alter table affiliate_links add column campaign_id uuid references campaigns(id) on delete set null;
alter table products add column image_path text;

create policy camp_read on campaigns for select to authenticated using (
  status = 'active'
  or exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid())
  or current_role_name() = 'admin');
create policy camp_insert on campaigns for insert to authenticated with check (
  status = 'draft' and spent_minor = 0
  and exists (select 1 from businesses b where b.id = business_id and b.owner_id = auth.uid())
  and exists (select 1 from products p where p.id = product_id and p.business_id = campaigns.business_id));
grant select on campaigns to authenticated;
grant insert (business_id, product_id, name, objective, target_country, audience_note,
              commission_bps, budget_minor, currency, attribution_days) on campaigns to authenticated;

drop policy al_insert on affiliate_links;
create policy al_insert on affiliate_links for insert to authenticated with check (
  affiliate_id = auth.uid() and current_role_name() = 'affiliate'
  and exists (select 1 from products p where p.id = product_id and p.status = 'published')
  and (campaign_id is null or exists (select 1 from campaigns c
        where c.id = campaign_id and c.status = 'active' and c.product_id = affiliate_links.product_id)));
grant insert (campaign_id) on affiliate_links to authenticated;
grant update (image_path) on products to authenticated;

-- ---------- payouts ----------
create table payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references profiles(id) on delete set null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,
  method text not null check (method in ('mobile_money','bank_transfer','manual')),
  destination text not null check (char_length(destination) between 3 and 200),  -- never card details
  status text not null default 'requested' check (status in ('requested','paid','rejected')),
  reference text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table payouts enable row level security;
alter table commissions add column payout_id uuid references payouts(id);
create policy payouts_read on payouts for select to authenticated
  using (affiliate_id = auth.uid() or current_role_name() = 'admin');
grant select on payouts to authenticated;

-- ---------- webhook events (replay protection) ----------
create table webhook_events (
  id bigint generated always as identity primary key,
  merchant text not null, event_id text not null,
  received_at timestamptz not null default now(),
  unique (merchant, event_id)
);
alter table webhook_events enable row level security;

-- ---------- support, notifications, email outbox ----------
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 150),
  status text not null default 'open' check (status in ('open','pending','closed')),
  created_at timestamptz not null default now()
);
create table ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  is_staff boolean not null default false,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table support_tickets enable row level security;
alter table ticket_messages enable row level security;
create policy tk_read on support_tickets for select to authenticated
  using (user_id = auth.uid() or current_role_name() in ('support','admin'));
create policy tk_insert on support_tickets for insert to authenticated
  with check (user_id = auth.uid() and status = 'open');
create policy tk_staff_update on support_tickets for update to authenticated
  using (current_role_name() in ('support','admin')) with check (current_role_name() in ('support','admin'));
create policy tm_read on ticket_messages for select to authenticated using (
  exists (select 1 from support_tickets t where t.id = ticket_id
          and (t.user_id = auth.uid() or current_role_name() in ('support','admin'))));
create policy tm_insert on ticket_messages for insert to authenticated with check (
  author_id = auth.uid()
  and is_staff = (current_role_name() in ('support','admin'))
  and exists (select 1 from support_tickets t where t.id = ticket_id
          and (t.user_id = auth.uid() or current_role_name() in ('support','admin'))));
grant select, insert (user_id, subject) on support_tickets to authenticated;
grant update (status) on support_tickets to authenticated;
grant select, insert (ticket_id, author_id, is_staff, body) on ticket_messages to authenticated;

create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null, body text, is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;
create policy nt_read on notifications for select to authenticated using (user_id = auth.uid());
create policy nt_update on notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on notifications to authenticated;
grant update (is_read) on notifications to authenticated;

create table email_outbox (
  id bigint generated always as identity primary key,
  to_email text not null, subject text not null, body text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  created_at timestamptz not null default now()
);
alter table email_outbox enable row level security;  -- no policies: only trusted functions

-- new lead -> in-app notification + queued email to the business owner (not shared with anyone else)
create or replace function public.on_lead_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid; oe text; pt text;
begin
  select b.owner_id, p.email into o, oe from businesses b join profiles p on p.id = b.owner_id where b.id = new.business_id;
  select title into pt from products where id = new.product_id;
  insert into notifications(user_id, title, body) values (o, 'New enquiry', 'Enquiry about ' || coalesce(pt,'a product'));
  insert into email_outbox(to_email, subject, body)
    values (oe, 'New enquiry on your listing', 'You have a new enquiry about "' || coalesce(pt,'a product') || '". Log in to view it.');
  return new;
end $$;
create trigger lead_created after insert on leads for each row execute function public.on_lead_created();

-- ---------- FX + AI usage ----------
create table exchange_rates (
  base text not null, quote text not null, rate numeric not null check (rate > 0),
  source text not null, fetched_at timestamptz not null default now(),
  primary key (base, quote)
);
alter table exchange_rates enable row level security;
create policy fx_read on exchange_rates for select to anon, authenticated using (true);
grant select on exchange_rates to anon, authenticated;

create table ai_usage (
  id bigint generated always as identity primary key,
  day date not null default current_date,
  tokens_in integer not null, tokens_out integer not null, cost_micro_usd bigint not null,
  created_at timestamptz not null default now()
);
alter table ai_usage enable row level security;
create policy ai_read on ai_usage for select to authenticated using (current_role_name() = 'admin');
grant select on ai_usage to authenticated;

-- ---------- privacy requests ----------
create table data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  kind text not null check (kind in ('delete')),
  status text not null default 'pending' check (status in ('pending','completed','rejected')),
  note text, created_at timestamptz not null default now(), decided_at timestamptz
);
alter table data_requests enable row level security;
create unique index one_pending_delete on data_requests(user_id) where status = 'pending';
create policy dr_read on data_requests for select to authenticated
  using (user_id = auth.uid() or current_role_name() = 'admin');
create policy dr_insert on data_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and kind = 'delete');
grant select, insert (user_id, kind) on data_requests to authenticated;

-- ---------- trusted functions ----------
create or replace function public.ingest_conversion(p_key text, p_merchant text, p_event_id text, p_external_id text,
  p_link_code text, p_amount_minor bigint, p_currency text) returns text
language plpgsql security definer set search_path = public as $$
declare l affiliate_links; c campaigns; conv_id uuid; comm bigint; recent boolean;
begin
  if not check_server_key(p_key) then raise exception 'forbidden'; end if;
  insert into webhook_events(merchant, event_id) values (p_merchant, p_event_id) on conflict do nothing;
  if not found then return 'duplicate_event'; end if;
  select * into l from affiliate_links where code = p_link_code;
  insert into conversions(link_id, merchant, external_id, amount_minor, currency)
    values (l.id, p_merchant, p_external_id, p_amount_minor, p_currency)
    on conflict (merchant, external_id) do nothing returning id into conv_id;
  if conv_id is null then return 'duplicate_conversion'; end if;
  if l.id is null then return 'recorded_unattributed'; end if;
  if l.campaign_id is null then return 'recorded_no_commission_rule'; end if;
  select * into c from campaigns where id = l.campaign_id;
  if c.status <> 'active' or c.currency <> p_currency then return 'recorded_campaign_inactive_or_currency_mismatch'; end if;
  select exists (select 1 from click_events where link_id = l.id
                 and created_at > now() - make_interval(days => c.attribution_days)) into recent;
  if not recent then return 'recorded_outside_attribution_window'; end if;
  comm := floor(p_amount_minor * c.commission_bps / 10000.0);
  if c.spent_minor + comm > c.budget_minor then return 'recorded_budget_exhausted'; end if;
  insert into commissions(conversion_id, affiliate_id, amount_minor, currency, rate_bps)
    values (conv_id, l.affiliate_id, comm, p_currency, c.commission_bps);
  update campaigns set spent_minor = spent_minor + comm where id = c.id;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (null, 'conversion_ingested', 'conversions', conv_id::text, jsonb_build_object('merchant', p_merchant, 'commission_minor', comm));
  return 'commission_pending';
end $$;

-- Refund / chargeback: pending -> rejected, approved/paid -> reversed. Budget is restored.
-- NOTE: if the commission is already in a requested payout, an admin must reconcile that payout manually.
create or replace function public.ingest_refund(p_key text, p_merchant text, p_event_id text, p_external_id text) returns text
language plpgsql security definer set search_path = public as $$
declare cm commissions; cid uuid; ns text;
begin
  if not check_server_key(p_key) then raise exception 'forbidden'; end if;
  insert into webhook_events(merchant, event_id) values (p_merchant, p_event_id) on conflict do nothing;
  if not found then return 'duplicate_event'; end if;
  select cm2.* into cm from commissions cm2 join conversions cv on cv.id = cm2.conversion_id
    where cv.merchant = p_merchant and cv.external_id = p_external_id for update of cm2;
  if not found then return 'no_commission'; end if;
  ns := case cm.status when 'pending' then 'rejected' when 'approved' then 'reversed' when 'paid' then 'reversed' else null end;
  if ns is null then return 'noop'; end if;
  update commissions set status = ns, updated_at = now() where id = cm.id;
  select l.campaign_id into cid from conversions cv join affiliate_links l on l.id = cv.link_id where cv.id = cm.conversion_id;
  if cid is not null then update campaigns set spent_minor = greatest(0, spent_minor - cm.amount_minor) where id = cid; end if;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (null, 'refund_ingested', 'commissions', cm.id::text, jsonb_build_object('from', cm.status, 'to', ns));
  return ns;
end $$;

create or replace function public.fx_upsert(p_key text, p_rates jsonb, p_source text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; k text; v numeric;
begin
  if not check_server_key(p_key) then raise exception 'forbidden'; end if;
  for k, v in select key, value::numeric from jsonb_each_text(p_rates) where key ~ '^[A-Z]{3}$' and value::numeric > 0 loop
    insert into exchange_rates(base, quote, rate, source, fetched_at) values ('USD', k, v, p_source, now())
      on conflict (base, quote) do update set rate = excluded.rate, source = excluded.source, fetched_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.ai_spend_today(p_key text) returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if not check_server_key(p_key) then raise exception 'forbidden'; end if;
  return coalesce((select sum(cost_micro_usd) from ai_usage where day = current_date), 0);
end $$;

create or replace function public.record_ai_usage(p_key text, tin integer, tout integer, cost bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not check_server_key(p_key) then raise exception 'forbidden'; end if;
  insert into ai_usage(tokens_in, tokens_out, cost_micro_usd) values (greatest(tin,0), greatest(tout,0), greatest(cost,0));
end $$;

create or replace function public.set_campaign_status(cid uuid, new_status text) returns void
language plpgsql security definer set search_path = public as $$
declare c campaigns; b businesses;
begin
  select * into c from campaigns where id = cid;
  select * into b from businesses where id = c.business_id;
  if c.id is null or (b.owner_id <> auth.uid() and current_role_name() <> 'admin') then raise exception 'forbidden'; end if;
  if new_status = 'active' and b.verification_status <> 'verified' then raise exception 'business must be verified'; end if;
  if not ((c.status = 'draft' and new_status in ('active','ended'))
       or (c.status = 'active' and new_status in ('paused','ended'))
       or (c.status = 'paused' and new_status in ('active','ended'))) then raise exception 'illegal transition'; end if;
  update campaigns set status = new_status where id = cid;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'set_campaign_status', 'campaigns', cid::text, jsonb_build_object('from', c.status, 'to', new_status));
end $$;

create or replace function public.request_payout(p_currency text, p_method text, p_destination text) returns uuid
language plpgsql security definer set search_path = public as $$
declare total bigint; minimum bigint; pid uuid;
begin
  if current_role_name() <> 'affiliate' then raise exception 'forbidden'; end if;
  perform 1 from commissions where affiliate_id = auth.uid() and status = 'approved' and payout_id is null and currency = p_currency for update;
  select coalesce(sum(amount_minor), 0) into total from commissions
    where affiliate_id = auth.uid() and status = 'approved' and payout_id is null and currency = p_currency;
  select value::bigint into minimum from app_settings where key = 'payout_min_minor';
  if total <= 0 or total < coalesce(minimum, 0) then raise exception 'below payout threshold'; end if;
  insert into payouts(affiliate_id, amount_minor, currency, method, destination)
    values (auth.uid(), total, p_currency, p_method, p_destination) returning id into pid;
  update commissions set payout_id = pid
    where affiliate_id = auth.uid() and status = 'approved' and payout_id is null and currency = p_currency;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'request_payout', 'payouts', pid::text, jsonb_build_object('amount', total, 'currency', p_currency));
  return pid;
end $$;

create or replace function public.decide_payout(pid uuid, new_status text, ref text) returns void
language plpgsql security definer set search_path = public as $$
declare p payouts;
begin
  if current_role_name() <> 'admin' then raise exception 'forbidden'; end if;
  if new_status not in ('paid','rejected') then raise exception 'bad status'; end if;
  select * into p from payouts where id = pid and status = 'requested' for update;
  if not found then raise exception 'payout not found or already decided'; end if;
  if new_status = 'paid' then
    if coalesce(char_length(ref), 0) < 3 then raise exception 'payment reference required'; end if;
    update commissions set status = 'paid', updated_at = now() where payout_id = pid and status = 'approved';
  else
    update commissions set payout_id = null where payout_id = pid;
  end if;
  update payouts set status = new_status, reference = ref, decided_at = now() where id = pid;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'decide_payout', 'payouts', pid::text, jsonb_build_object('status', new_status, 'reference', ref));
end $$;

create or replace function public.admin_add_affiliate_product(p_source text, p_title text, p_desc text, p_category text,
  p_price_minor bigint, p_currency text, p_url text) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if current_role_name() <> 'admin' then raise exception 'forbidden'; end if;
  if p_source not in ('amazon','jumia') then raise exception 'bad source'; end if;
  if p_url !~ '^https://' then raise exception 'url must be https'; end if;
  insert into products(source, title, description, category, price_minor, currency, external_url, status, stock_status)
    values (p_source, p_title, p_desc, p_category, p_price_minor, p_currency, p_url, 'published', 'unknown') returning id into pid;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'add_affiliate_product', 'products', pid::text, jsonb_build_object('source', p_source));
  return pid;
end $$;

create or replace function public.admin_refresh_price(pid uuid, p_price_minor bigint, p_currency text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_role_name() <> 'admin' then raise exception 'forbidden'; end if;
  update products set price_minor = p_price_minor, currency = p_currency, price_checked_at = now() where id = pid and source <> 'seller';
end $$;

create or replace function public.admin_claim_outbox() returns setof email_outbox
language plpgsql security definer set search_path = public as $$
begin
  if current_role_name() <> 'admin' then raise exception 'forbidden'; end if;
  return query select * from email_outbox where status = 'queued' order by id limit 25;
end $$;

create or replace function public.admin_mark_outbox(oid bigint, new_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_role_name() <> 'admin' then raise exception 'forbidden'; end if;
  if new_status not in ('sent','failed') then raise exception 'bad status'; end if;
  update email_outbox set status = new_status where id = oid;
end $$;

create or replace function public.export_my_data() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from profiles p where p.id = auth.uid()),
    'role_requests', coalesce((select jsonb_agg(to_jsonb(r)) from role_requests r where r.user_id = auth.uid()), '[]'),
    'enquiries_sent', coalesce((select jsonb_agg(to_jsonb(l)) from leads l where l.customer_id = auth.uid()), '[]'),
    'support_tickets', coalesce((select jsonb_agg(to_jsonb(t)) from support_tickets t where t.user_id = auth.uid()), '[]'),
    'affiliate_links', coalesce((select jsonb_agg(to_jsonb(a)) from affiliate_links a where a.affiliate_id = auth.uid()), '[]'),
    'commissions', coalesce((select jsonb_agg(to_jsonb(c)) from commissions c where c.affiliate_id = auth.uid()), '[]'),
    'note', 'Audit logs and financial records may be retained where the law requires.')
$$;

-- Deletion: admin reviews the request first (identity check), then this runs.
create or replace function public.process_deletion(req_id uuid, approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r data_requests; uid uuid;
begin
  if current_role_name() <> 'admin' then raise exception 'forbidden'; end if;
  select * into r from data_requests where id = req_id and status = 'pending' for update;
  if not found then raise exception 'request not found'; end if;
  uid := r.user_id;
  if not approve then
    update data_requests set status = 'rejected', decided_at = now() where id = req_id;
  else
    if exists (select 1 from businesses where owner_id = uid) then raise exception 'user owns a business: resolve first'; end if;
    if exists (select 1 from commissions where affiliate_id = uid and status in ('pending','approved'))
       or exists (select 1 from payouts where affiliate_id = uid and status = 'requested') then
      raise exception 'outstanding commissions or payouts: resolve first';
    end if;
    update leads set name = 'Deleted user', email = 'deleted@invalid', message = null, customer_id = null where customer_id = uid;
    update data_requests set status = 'completed', decided_at = now() where id = req_id;
    delete from auth.users where id = uid;   -- cascades profile; financial rows are kept with affiliate_id = null
  end if;
  insert into audit_log(actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'process_deletion', 'data_requests', req_id::text, jsonb_build_object('approve', approve));
end $$;

create or replace function public.request_verification(bid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update businesses set verification_status = 'pending'
    where id = bid and owner_id = auth.uid() and verification_status in ('unverified','rejected');
  if not found then raise exception 'not allowed'; end if;
end $$;

create or replace function public.log_sensitive_access(p_entity text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_role_name() not in ('admin','support') then raise exception 'forbidden'; end if;
  insert into audit_log(actor_id, action, entity, entity_id) values (auth.uid(), 'sensitive_access', p_entity, p_id);
end $$;

-- ---------- storage buckets + policies ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('verification-docs', 'verification-docs', false, 5242880, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy pi_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_role_name() = 'seller');
create policy pi_delete on storage.objects for delete to authenticated using (
  bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy vd_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_role_name() = 'seller');
create policy vd_select on storage.objects for select to authenticated using (
  bucket_id = 'verification-docs'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.current_role_name() = 'admin'));
create policy vd_delete on storage.objects for delete to authenticated using (
  bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- grants for new functions ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.current_role_name() to anon, authenticated;
grant execute on function public.record_click(text, text) to anon, authenticated;
grant execute on function public.decide_role_request(uuid, boolean) to authenticated;
grant execute on function public.moderate_product(uuid, boolean) to authenticated;
grant execute on function public.set_business_verification(uuid, text) to authenticated;
grant execute on function public.set_commission_status(uuid, text) to authenticated;
-- server-key protected (callable by the server with SERVER_RPC_KEY; useless without it)
grant execute on function public.ingest_conversion(text,text,text,text,text,bigint,text) to anon, authenticated;
grant execute on function public.ingest_refund(text,text,text,text) to anon, authenticated;
grant execute on function public.fx_upsert(text,jsonb,text) to anon, authenticated;
grant execute on function public.ai_spend_today(text) to anon, authenticated;
grant execute on function public.record_ai_usage(text,integer,integer,bigint) to anon, authenticated;
-- role-checked inside
grant execute on function public.set_campaign_status(uuid, text) to authenticated;
grant execute on function public.request_payout(text, text, text) to authenticated;
grant execute on function public.decide_payout(uuid, text, text) to authenticated;
grant execute on function public.admin_add_affiliate_product(text,text,text,text,bigint,text,text) to authenticated;
grant execute on function public.admin_refresh_price(uuid, bigint, text) to authenticated;
grant execute on function public.admin_claim_outbox() to authenticated;
grant execute on function public.admin_mark_outbox(bigint, text) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.process_deletion(uuid, boolean) to authenticated;
grant execute on function public.request_verification(uuid) to authenticated;
grant execute on function public.log_sensitive_access(text, text) to authenticated;

-- ---------- AFTER running this file, set your server key hash (do this ONCE, by hand): ----------
-- 1. Make a long random string, e.g. in PowerShell:  [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
-- 2. Put it in .env.local as SERVER_RPC_KEY=<that string>
-- 3. In the SQL editor run (replace the text, keep the quotes):
--    insert into private_settings values ('server_key_hash', encode(sha256(convert_to('<that string>', 'utf8')), 'hex'));
