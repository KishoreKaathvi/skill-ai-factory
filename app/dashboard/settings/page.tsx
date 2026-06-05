import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, email, role, organization_id, organizations(*)')
    .eq('id', user.id)
    .single()

  if (error || !profile || !profile.organization_id) {
    redirect('/login')
  }

  return (
    <SettingsClient 
      profile={profile} 
      org={profile.organizations} 
    />
  )
}
