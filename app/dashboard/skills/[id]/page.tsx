import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WorkspaceClient from '@/components/WorkspaceClient'

export default async function SkillWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ interview?: string }>
}) {
  const { id } = await params
  const { interview } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch skill details
  const { data: skill, error } = await supabase
    .from('skills')
    .select(`
      id,
      name,
      description,
      trigger,
      active_version_id,
      organization_id,
      created_at,
      updated_at,
      skill_versions!fk_skills_active_version(id, version_number, content)
    `)
    .eq('id', id)
    .single()

  if (error || !skill) {
    redirect('/dashboard/skills')
  }

  // Fetch all version tags
  const { data: versions } = await supabase
    .from('skill_versions')
    .select('id, version_number, changelog, created_at')
    .eq('skill_id', id)
    .order('created_at', { ascending: false })

  return (
    <WorkspaceClient 
      skill={skill} 
      versions={versions || []} 
      startInterview={interview === 'true'} 
    />
  )
}
