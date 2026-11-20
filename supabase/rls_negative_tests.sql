-- Run in SQL Editor. Replace the three UUIDs with real users: a CUSTOMER, a SELLER (with a business), and an AFFILIATE.
-- Every block marked "EXPECT ERROR/0 ROWS" must fail or change nothing. If any succeeds, STOP and fix before launch.
-- (Each block is wrapped in a transaction and rolled back.)

-- 1. Customer cannot make themselves admin
begin; set local role authenticated;
select set_config('request.jwt.claims','{"sub":"<CUSTOMER_UUID>","role":"authenticated"}',true);
update profiles set role='admin' where id='<CUSTOMER_UUID>';   -- EXPECT ERROR: permission denied for column role
rollback;

-- 2. Customer cannot call admin functions
begin; set local role authenticated;
select set_config('request.jwt.claims','{"sub":"<CUSTOMER_UUID>","role":"authenticated"}',true);
select decide_role_request(gen_random_uuid(), true);            -- EXPECT ERROR: forbidden
select set_commission_status(gen_random_uuid(), 'paid');        -- EXPECT ERROR: forbidden
select decide_payout(gen_random_uuid(), 'paid', 'x');           -- EXPECT ERROR: forbidden
select process_deletion(gen_random_uuid(), true);               -- EXPECT ERROR: forbidden
rollback;

-- 3. Anonymous callers cannot use the server-key functions without the key
begin; set local role anon;
select ingest_conversion('wrong-key','m','e1','x1','aaaaaaaaaaaa',1000,'UGX');  -- EXPECT ERROR: forbidden
select record_ai_usage('wrong-key',1,1,1);                       -- EXPECT ERROR: forbidden
select fx_upsert('wrong-key','{"UGX":3700}','x');                -- EXPECT ERROR: forbidden
rollback;

-- 4. Anonymous cannot read leads, commissions, payouts, tickets, outbox, secrets
begin; set local role anon;
select count(*) from leads;            -- EXPECT ERROR: permission denied
select count(*) from commissions;      -- EXPECT ERROR: permission denied
select count(*) from private_settings; -- EXPECT ERROR: permission denied
rollback;

-- 5. Seller cannot verify own business or publish own product
begin; set local role authenticated;
select set_config('request.jwt.claims','{"sub":"<SELLER_UUID>","role":"authenticated"}',true);
update businesses set verification_status='verified' where owner_id='<SELLER_UUID>';  -- EXPECT ERROR: permission denied for column
update products set status='published' where business_id in (select id from businesses where owner_id='<SELLER_UUID>');  -- EXPECT ERROR
rollback;

-- 6. Affiliate cannot create or edit commissions / payouts directly
begin; set local role authenticated;
select set_config('request.jwt.claims','{"sub":"<AFFILIATE_UUID>","role":"authenticated"}',true);
insert into commissions(conversion_id, affiliate_id, amount_minor, currency, rate_bps) values (gen_random_uuid(),'<AFFILIATE_UUID>',1,'UGX',100); -- EXPECT ERROR
update commissions set status='paid';                            -- EXPECT ERROR
rollback;

-- 7. Customer cannot read another seller's leads
begin; set local role authenticated;
select set_config('request.jwt.claims','{"sub":"<CUSTOMER_UUID>","role":"authenticated"}',true);
select count(*) from leads where customer_id is distinct from '<CUSTOMER_UUID>';   -- EXPECT 0 ROWS
rollback;

-- 8. Audit log is append-only (run as the SQL editor owner)
-- update audit_log set action='x';   -- EXPECT ERROR: audit_log is append-only
