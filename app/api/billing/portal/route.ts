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
    .select('organization_id, organizations(stripe_customer_id)')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.organization_id) {
    return new NextResponse('Profile organization not found', { status: 400 })
  }

  const stripeCustomerId = (profile.organizations as any)?.stripe_customer_id
  if (!stripeCustomerId) {
    return new NextResponse('Stripe customer not initialized', { status: 400 })
  }

  const origin = request.headers.get('origin') || 'http://localhost:3000'

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Portal session error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
