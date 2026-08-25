-- Records an async payment that completed checkout and then bounced.
--
-- Card payments settle synchronously: checkout.session.completed arrives already
-- paid. Boleto, Pix and ACH do not — they arrive `completed` but unpaid, and
-- resolve later as async_payment_succeeded or async_payment_failed. SEQ never
-- needed the failure event because it creates nothing until the money lands, so
-- a bounced boleto leaves no row to correct.
--
-- BMS is the opposite: the Sale exists from the moment the link is generated. A
-- bounced boleto with no handler would strand it in "awaiting payment" forever —
-- and waiting for checkout.session.expired would not help, because the session
-- already completed and will never expire.
--
-- Kept separate from expired_at rather than folded into it. Both dead-end the
-- link and both lead the operator to the same action (generate a new one), but
-- one means the customer ran out of time and the other means the money did not
-- arrive. Conflating them costs an hour of confusion the first time a boleto
-- bounces.

ALTER TABLE "sales" ADD COLUMN "failed_at" TIMESTAMP(3);
