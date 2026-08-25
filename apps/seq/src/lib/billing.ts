// One Stripe Customer per Tenant, shared with BMS so the two ways a funeral
// home can buy — a payment link, or self-serve here — never fork into two
// customers for the same company.
//
// GenCode fulfilment used to live here too. It moved to
// @genealogiq/services/gencode-fulfilment when packages became subscriptions:
// both apps sell the same product, and duplicating the "mint exactly one batch"
// rule would have meant two chances to get it wrong.
export { ensureTenantStripeCustomer } from "@genealogiq/services/stripe-customer"
