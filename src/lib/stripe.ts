import Stripe from "stripe"

let client: Stripe | undefined

function getClient(): Stripe {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required")
    client = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return client
}

// Lazy proxy so importing this module never throws — only the first real Stripe
// API call fails if the env var is missing.
export const stripe = new Proxy({} as Stripe, {
  get: (_target, prop, receiver) => Reflect.get(getClient(), prop, receiver),
})
