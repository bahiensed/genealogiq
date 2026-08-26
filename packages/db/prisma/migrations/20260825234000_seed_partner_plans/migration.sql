-- Seeds the four partner plans and their price book, from the founder's spec
-- v1.1 §4 (2026-08-23).
--
-- Catalogue data, not sample data: these four plans must exist in every
-- environment, so they belong in a migration rather than a dev seed. IDs are
-- readable and fixed on purpose — a catalogue row referenced by later
-- migrations, tests and support conversations is worth more legible than
-- random, and stable across environments.
--
-- Prices are opened, never edited. Each row is version 1 with effective_to
-- NULL. A price change closes the row and inserts the next version, which is
-- the whole reason plan_prices exists as a table instead of columns.
--
-- The instalment amounts are NOT annual/12: the spec puts a 20% surcharge on
-- paying in twelve. Semente in reais is 2990.00 at once against 299.00 x 12 =
-- 3588.00, and 2990.00 x 1.2 = 3588.00 exactly. Same ratio holds in all three
-- currencies and all four plans; if a future edit makes those two numbers
-- derive from one another, the surcharge silently disappears.
--
-- country_scope: BRL is Brazil, MXN is Mexico, USD is NULL — the fallback book
-- for every country without a local one. Currency decides what Stripe charges;
-- country decides which book a buyer is shown. Not the same question.
--
-- unit_reference_amount is the published "per activation" figure from §4.1,
-- stored rather than computed: 1055.00 / 200 is 5.275, and the number the
-- partner is quoted is 5.28. The rounding is a commercial choice.
--
-- No Stripe ids yet. BMS mints those on first sync, and until then a plan is
-- correctly unsellable.

INSERT INTO "partner_plans"
  ("id","name","code","description","annual_allowance","activation_trial_plan_code","updated_at")
VALUES
  ('pplan_semente' ,'Semente' ,'SEMENTE' ,'100 ativações por ciclo anual',100,'PREMIUM',now()),
  ('pplan_raiz'    ,'Raiz'    ,'RAIZ'    ,'200 ativações por ciclo anual',200,'PREMIUM',now()),
  ('pplan_arvore'  ,'Árvore'  ,'ARVORE'  ,'300 ativações por ciclo anual',300,'PREMIUM',now()),
  ('pplan_floresta','Floresta','FLORESTA','400 ativações por ciclo anual',400,'PREMIUM',now());

INSERT INTO "plan_prices"
  ("id","partner_plan_id","currency","country_scope","annual_cash_amount",
   "installment_count","installment_amount","unit_reference_amount",
   "effective_from","updated_at")
VALUES
  -- Semente — 100
  ('pprice_semente_brl' ,'pplan_semente' ,'BRL','BR', 2990.00,12,  299.00, 29.90,now(),now()),
  ('pprice_semente_usd' ,'pplan_semente' ,'USD',NULL,  585.00,12,   58.50,  5.85,now(),now()),
  ('pprice_semente_mxn' ,'pplan_semente' ,'MXN','MX', 9880.00,12,  988.00, 98.80,now(),now()),
  -- Raiz — 200
  ('pprice_raiz_brl'    ,'pplan_raiz'    ,'BRL','BR', 5390.00,12,  539.00, 26.95,now(),now()),
  ('pprice_raiz_usd'    ,'pplan_raiz'    ,'USD',NULL, 1055.00,12,  105.50,  5.28,now(),now()),
  ('pprice_raiz_mxn'    ,'pplan_raiz'    ,'MXN','MX',17810.00,12, 1781.00, 89.05,now(),now()),
  -- Árvore — 300
  ('pprice_arvore_brl'  ,'pplan_arvore'  ,'BRL','BR', 7920.00,12,  792.00, 26.40,now(),now()),
  ('pprice_arvore_usd'  ,'pplan_arvore'  ,'USD',NULL, 1550.00,12,  155.00,  5.17,now(),now()),
  ('pprice_arvore_mxn'  ,'pplan_arvore'  ,'MXN','MX',26170.00,12, 2617.00, 87.23,now(),now()),
  -- Floresta — 400
  ('pprice_floresta_brl','pplan_floresta','BRL','BR',10200.00,12, 1020.00, 25.50,now(),now()),
  ('pprice_floresta_usd','pplan_floresta','USD',NULL, 1995.00,12,  199.50,  4.99,now(),now()),
  ('pprice_floresta_mxn','pplan_floresta','MXN','MX',33700.00,12, 3370.00, 84.25,now(),now());
