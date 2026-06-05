import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, email, organizations(stripe_customer_id)')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.organization_id) {
    return new NextResponse('Profile organization not found', { status: 400 })
  }

  const orgId = profile.organization_id
  let stripeCustomerId = (profile.organizations as any)?.stripe_customer_id

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      metadata: {
        organization_id: orgId
      }
    })
    stripeCustomerId = customer.id

    await supabase
      .from('organizations')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', orgId)
  }

  const origin = request.headers.get('origin') || 'http://localhost:3000'

  try {
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || 'price_test_mode',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancel`,
      metadata: {
        organization_id: orgId
      },
      subscription_data: {
        metadata: {
          organization_id: orgId
        }
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
