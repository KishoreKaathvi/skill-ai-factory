import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const body = await request.json()
  const { rating, feedback } = body

  // 1. Update rating if provided
  if (rating !== undefined) {
    const { error: ratingError } = await supabase
      .from('execution_logs')
      .update({ rating })
      .eq('id', id)

    if (ratingError) {
      return NextResponse.json({ error: ratingError.message }, { status: 500 })
    }

    // Trigger failure notification on downvote
    if (rating === -1) {
      try {
        const { data: logDetails } = await supabase
          .from('execution_logs')
          .select('id, skills(name, organizations(name)), input_data')
          .eq('id', id)
          .single()

        if (logDetails) {
          const skillName = (logDetails.skills as any)?.name || 'Unknown Skill'
          const orgName = (logDetails.skills as any)?.organizations?.name || 'Unknown Org'
          const inputStr = JSON.stringify(logDetails.input_data || {})
          
          const { Notifier } = await import('@/lib/notifier')
          await Notifier.notifyFailure(skillName, orgName, `Log ID: ${id}\nInputs: ${inputStr}`)
        }
      } catch (notifyErr) {
        console.error('Failed to send regression notification:', notifyErr)
      }
    }
  }

  // 2. Insert or update human feedback if provided
  if (feedback) {
    const { corrected_output, notes } = feedback

    if (!corrected_output) {
      return new NextResponse('Missing corrected_output', { status: 400 })
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('human_feedback')
      .select('id')
      .eq('log_id', id)
      .single()

    if (existingFeedback) {
      // Update
      const { error: feedbackError } = await supabase
        .from('human_feedback')
        .update({
          corrected_output,
          notes,
          created_at: new Date().toISOString()
        })
        .eq('id', existingFeedback.id)

      if (feedbackError) {
        return NextResponse.json({ error: feedbackError.message }, { status: 500 })
      }
    } else {
      // Insert
      const { error: feedbackError } = await supabase
        .from('human_feedback')
        .insert({
          log_id: id,
          corrected_output,
          notes
        })

      if (feedbackError) {
        return NextResponse.json({ error: feedbackError.message }, { status: 500 })
      }
    }
  }

  // Fetch updated log
  const { data: updatedLog } = await supabase
    .from('execution_logs')
    .select(`
      id,
      rating,
      human_feedback(id, corrected_output, notes)
    `)
    .eq('id', id)
    .single()

  return NextResponse.json(updatedLog)
}
