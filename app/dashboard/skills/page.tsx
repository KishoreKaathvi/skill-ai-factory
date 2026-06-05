import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SkillsClient from '@/components/SkillsClient'

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>
}) {
  const { create } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.organization_id) {
    redirect('/login')
  }

  // Fetch all organization skills
  const { data: skills, error } = await supabase
    .from('skills')
    .select(`
      id,
      name,
      description,
      trigger,
      active_version_id,
      updated_at,
      skill_versions!fk_skills_active_version(version_number)
    `)
    .eq('organization_id', profile.organization_id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching skills list:', error)
  }

  return (
    <SkillsClient 
      initialSkills={skills || []} 
      autoOpenCreate={create === 'true'} 
    />
  )
}
