import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'placeholder_secret', {
  apiVersion: '2025-01-27-pre.0' as any,
})
