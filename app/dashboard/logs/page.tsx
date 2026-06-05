import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogsClient from '@/components/LogsClient'

export default async function LogsPage() {
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

  const orgId = profile.organization_id

  // Fetch all organization skills
  const { data: skills } = await supabase
    .from('skills')
    .select('id')
    .eq('organization_id', orgId)

  const skillIds = (skills || []).map(s => s.id)

  let initialLogs: any[] = []
  if (skillIds.length > 0) {
    // Fetch logs
    const { data: logs, error } = await supabase
      .from('execution_logs')
      .select(`
        id,
        skill_id,
        skill_version_id,
        input_data,
        output_data,
        latency_ms,
        token_count,
        cost_usd,
        rating,
        created_at,
        skills(name),
        skill_versions(version_number),
        human_feedback(id, corrected_output, notes)
      `)
      .in('skill_id', skillIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching execution logs:', error)
    } else {
      initialLogs = logs || []
    }
  }

  return (
    <LogsClient initialLogs={initialLogs} />
  )
}
