import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

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
    return new NextResponse('Skill not found', { status: 404 })
  }

  // Double check organization boundary
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== skill.organization_id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Fetch all versions history for this skill
  const { data: versions } = await supabase
    .from('skill_versions')
    .select('id, version_number, changelog, created_at, created_by')
    .eq('skill_id', id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    ...skill,
    versions: versions || []
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: skill, error: getError } = await supabase
    .from('skills')
    .select(`*`)
    .eq('id', id)
    .single()

  if (getError || !skill) {
    return new NextResponse('Skill not found', { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== skill.organization_id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const body = await request.json()
  const { name, description, trigger, content, changelog } = body

  // If they are only updating metadata
  if (!content) {
    const { data: updatedSkill, error: updateError } = await supabase
      .from('skills')
      .update({
        name: name !== undefined ? name : skill.name,
        description: description !== undefined ? description : skill.description,
        trigger: trigger !== undefined ? trigger : skill.trigger,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    return NextResponse.json(updatedSkill)
  }

  // Otherwise, they are updating the instruction content, which requires a new version.
  // 1. Fetch current version number
  const { data: currentVersion } = await supabase
    .from('skill_versions')
    .select('version_number')
    .eq('id', skill.active_version_id)
    .single()

  let nextVersionNumber = '1.0.0'
  if (currentVersion) {
    const parts = currentVersion.version_number.split('.')
    if (parts.length === 3) {
      const minor = parseInt(parts[1], 10)
      nextVersionNumber = `${parts[0]}.${minor + 1}.0`
    }
  }

  // 2. Insert new version
  const { data: newVersion, error: versionError } = await supabase
    .from('skill_versions')
    .insert({
      skill_id: id,
      version_number: nextVersionNumber,
      content,
      created_by: user.id,
      changelog: changelog || 'Updated instructions'
    })
    .select()
    .single()

  if (versionError || !newVersion) {
    console.error('Error creating new version:', versionError)
    return NextResponse.json({ error: versionError?.message || 'Could not create new version' }, { status: 500 })
  }

  // 3. Update skill to reference the new active version
  const { data: updatedSkill, error: updateError } = await supabase
    .from('skills')
    .update({
      name: name !== undefined ? name : skill.name,
      description: description !== undefined ? description : skill.description,
      trigger: trigger !== undefined ? trigger : skill.trigger,
      active_version_id: newVersion.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('Error linking new version:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    ...updatedSkill,
    active_version: newVersion
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: skill, error: getError } = await supabase
    .from('skills')
    .select('organization_id')
    .eq('id', id)
    .single()

  if (getError || !skill) {
    return new NextResponse('Skill not found', { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== skill.organization_id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { error: deleteError } = await supabase
    .from('skills')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
