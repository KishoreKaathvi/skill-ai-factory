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
  const { messages, currentDraft } = body

  if (!messages || !Array.isArray(messages)) {
    return new NextResponse('Invalid request: messages array required', { status: 400 })
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const systemPrompt = `You are a world-class Socratic Knowledge Extraction Agent. Your mission is to interview the user (an operator or developer) and extract their implicit, tacit judgment rules, checklists, and edge cases for a specific workflow, transforming it into a structured AI Skill.

A structured AI Skill consists of:
1. name: Short descriptive name
2. trigger: When this skill should be activated
3. instructions: The step-by-step procedure and judgment rules
4. constraints: Strict guardrails (e.g., "Never disclose pricing before qualification")
5. checklists: Self-verification items the agent must check before finishing
6. examples: Concrete input/output pairs representing high-quality work

When interviewing:
- Be highly targeted. Ask exactly ONE clear, deep question at a time.
- Focus on extracting unstated criteria: "What is a major error junior staff make here?", "How do you decide between path A and B?", "What does a high-quality example look like?"
- Update the draft skill representation dynamically as the user answers.

Here is the current draft state:
${JSON.stringify(currentDraft || {}, null, 2)}

You must output a JSON object with this exact structure, containing the next question to ask and the updated draft:
{
  "question": "Your next follow-up question...",
  "draft": {
    "name": "...",
    "trigger": "...",
    "instructions": "...",
    "constraints": ["...", "..."],
    "checklists": ["...", "..."],
    "examples": [{"input": "...", "output": "..."}]
  }
}

Do not include any other markdown or conversational filler outside the JSON. Return ONLY the raw JSON object.`

  try {
    const formattedMessages = messages.map((m: any) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content
    }))

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: systemPrompt,
      messages: formattedMessages,
      temperature: 0.2
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // Attempt to parse the response
    try {
      const parsedData = JSON.parse(responseText.trim())
      return NextResponse.json(parsedData)
    } catch (parseError) {
      console.error('Failed to parse JSON response from Claude:', responseText)
      return NextResponse.json({
        question: "I ran into a processing error. Could you rephrase your last response?",
        draft: currentDraft || {}
      })
    }
  } catch (err: any) {
    console.error('Interviewer API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
