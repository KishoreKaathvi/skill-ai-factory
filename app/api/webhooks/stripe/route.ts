import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse('Webhook secret or signature missing', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const stripeCustomerId = subscription.customer as string
      const stripeSubscriptionId = subscription.id
      const status = subscription.status
      const priceId = subscription.items.data[0]?.price.id
      const planName = priceId || 'Standard'
      const orgId = subscription.metadata.organization_id

      if (orgId) {
        const { error } = await supabase
          .from('organizations')
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_plan_name: planName,
            subscription_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', orgId)

        if (error) {
          console.error(`Error updating organization subscription (via metadata orgId):`, error)
        }
      } else {
        const { data: orgData, error: searchError } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', stripeCustomerId)
          .single()

        if (!searchError && orgData) {
          const { error: updateError } = await supabase
            .from('organizations')
            .update({
              stripe_subscription_id: stripeSubscriptionId,
              stripe_plan_name: planName,
              subscription_status: status,
              updated_at: new Date().toISOString()
            })
            .eq('id', orgData.id)

          if (updateError) {
            console.error(`Error updating organization subscription (via customer ID search):`, updateError)
          }
        }
      }
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const stripeSubscriptionId = subscription.id

      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', stripeSubscriptionId)

      if (error) {
        console.error(`Error canceling organization subscription:`, error)
      }
      break
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.organization_id
      const stripeCustomerId = session.customer as string
      const stripeSubscriptionId = session.subscription as string

      if (orgId) {
        const { error } = await supabase
          .from('organizations')
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orgId)

        if (error) {
          console.error(`Error updating organization on checkout completion:`, error)
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
