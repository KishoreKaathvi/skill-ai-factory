import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.organization_id) {
    return new NextResponse('Organization context missing', { status: 400 })
  }

  const { data: skills, error } = await supabase
    .from('skills')
    .select(`
      id,
      name,
      description,
      trigger,
      active_version_id,
      created_at,
      updated_at,
      skill_versions!fk_skills_active_version(id, version_number, content)
    `)
    .eq('organization_id', profile.organization_id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching skills:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(skills)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.organization_id) {
    return new NextResponse('Organization context missing', { status: 400 })
  }

  const body = await request.json()
  const { name, description, trigger, content } = body

  if (!name || !content) {
    return new NextResponse('Missing required fields (name, content)', { status: 400 })
  }

  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .insert({
      name,
      description,
      trigger,
      organization_id: profile.organization_id,
    })
    .select()
    .single()

  if (skillError || !skill) {
    console.error('Error creating skill:', skillError)
    return NextResponse.json({ error: skillError?.message || 'Could not create skill' }, { status: 500 })
  }

  const { data: version, error: versionError } = await supabase
    .from('skill_versions')
    .insert({
      skill_id: skill.id,
      version_number: '1.0.0',
      content,
      created_by: user.id,
      changelog: 'Initial creation'
    })
    .select()
    .single()

  if (versionError || !version) {
    console.error('Error creating skill version:', versionError)
    await supabase.from('skills').delete().eq('id', skill.id)
    return NextResponse.json({ error: versionError?.message || 'Could not create skill version' }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from('skills')
    .update({
      active_version_id: version.id,
    })
    .eq('id', skill.id)

  if (updateError) {
    console.error('Error linking active version:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    ...skill,
    active_version_id: version.id,
    active_version: version
  })
}
