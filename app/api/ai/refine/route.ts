import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic API key is not configured' }, { status: 500 })
  }

  const body = await request.json()
  const { skillId } = body

  if (!skillId) {
    return new NextResponse('Missing skillId', { status: 400 })
  }

  // 1. Fetch skill and its active version content
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select(`
      id,
      name,
      description,
      trigger,
      organization_id,
      active_version_id,
      skill_versions!fk_skills_active_version(id, version_number, content)
    `)
    .eq('id', skillId)
    .single()

  if (skillError || !skill) {
    return new NextResponse('Skill not found', { status: 404 })
  }

  // Double check organization boundaries
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== skill.organization_id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 2. Fetch execution logs with negative rating or linked human feedback
  // We'll grab the last 15 failed/corrected executions for context
  const { data: logs, error: logsError } = await supabase
    .from('execution_logs')
    .select(`
      id,
      input_data,
      output_data,
      rating,
      created_at,
      human_feedback(corrected_output, notes)
    `)
    .eq('skill_id', skillId)
    .or('rating.eq.-1, id.in.(select log_id from human_feedback)')
    .order('created_at', { ascending: false })
    .limit(15)

  if (logsError) {
    console.error('Error fetching failure logs:', logsError)
  }

  const hasFeedback = logs && logs.length > 0
  if (!hasFeedback) {
    return NextResponse.json({
      message: 'No negative feedback or correction logs found for this skill. Optimization is not required yet.',
      refinedDraft: (skill.skill_versions as any)?.content || null,
      explanation: 'No failures logged.'
    })
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const currentContent = (skill.skill_versions as any)?.content || {}
  
  const systemPrompt = `You are a world-class AI Workflow Optimizer. Your role is to analyze failure logs and user-submitted corrections for an AI Skill, and propose improvements to the skill definition to prevent these errors in the future.

Context:
1. Current Skill Definition (JSON format):
${JSON.stringify(currentContent, null, 2)}

2. Historical Failures & Human Corrections:
${JSON.stringify(logs, null, 2)}

Instructions:
- Analyze why the output was rated negatively or needed human correction.
- Propose modifications to the current skill content (e.g. adding new constraints, updating instructions, or adding validation checklist items).
- Do NOT make sweeping, destructive changes to working instructions; make conservative, compounding improvements.
- You must return a JSON response containing:
  - "explanation": Short summary explaining what you changed and why, referencing the specific failures.
  - "refinedDraft": The complete, updated skill content JSON matching the original structure:
    {
      "name": "...",
      "trigger": "...",
      "instructions": "...",
      "constraints": ["...", "..."],
      "checklists": ["...", "..."],
      "examples": [{"input": "...", "output": "..."}]
    }

Do not include any other text. Return ONLY the raw JSON object.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: 'user' as const, content: 'Analyze the failures and refine the skill definition.' }
      ],
      temperature: 0.1
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    try {
      const parsedData = JSON.parse(responseText.trim())
      return NextResponse.json(parsedData)
    } catch (parseError) {
      console.error('Failed to parse Claude refiner output:', responseText)
      return NextResponse.json({ error: 'Failed to generate clean refinement payload' }, { status: 500 })
    }
  } catch (err: any) {
    console.error('Refine API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
