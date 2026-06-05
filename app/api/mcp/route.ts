import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized: Missing Bearer Token" }
    }, { status: 401 })
  }

  const orgId = authHeader.substring(7).trim()
  const supabase = createAdminClient()

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single()

  if (orgError || !org) {
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized: Invalid Organization Key" }
    }, { status: 401 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch (err) {
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32700, message: "Parse error" }
    }, { status: 400 })
  }

  const { jsonrpc, id, method, params } = payload

  if (jsonrpc !== '2.0') {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32600, message: "Invalid Request: expected jsonrpc '2.0'" }
    }, { status: 400 })
  }

  switch (method) {
    case 'initialize': {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            prompts: {},
            tools: {}
          },
          serverInfo: {
            name: `Skill AI Factory - ${org.name}`,
            version: "1.0.0"
          }
        }
      })
    }
    
    case 'prompts/list': {
      const { data: skills } = await supabase
        .from('skills')
        .select(`id, name, description, trigger`)
        .eq('organization_id', orgId)

      const prompts = (skills || []).map(s => ({
        name: s.name.toLowerCase().replace(/\s+/g, '-'),
        description: s.description || '',
        arguments: [
          {
            name: "payload",
            description: "JSON stringified parameters or raw text input for the skill variables",
            required: false
          }
        ]
      }))

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { prompts }
      })
    }

    case 'prompts/get': {
      const promptName = params?.name
      if (!promptName) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Invalid params: name is required" }
        })
      }

      const { data: skills } = await supabase
        .from('skills')
        .select(`
          id, name, description, trigger, active_version_id,
          skill_versions!fk_skills_active_version(content)
        `)
        .eq('organization_id', orgId)

      const skill = skills?.find(s => s.name.toLowerCase().replace(/\s+/g, '-') === promptName)

      if (!skill) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: `Prompt not found: ${promptName}` }
        })
      }

      const content = (skill.skill_versions as any)?.content || {}
      
      const systemPrompt = `Skill: ${skill.name}
Description: ${skill.description || 'No description'}
Trigger Condition: ${skill.trigger || 'Manual'}

=== INSTRUCTIONS ===
${content.instructions || 'No instructions provided.'}

=== CONSTRAINTS ===
${(content.constraints || []).map((c: string, idx: number) => `${idx + 1}. ${c}`).join('\n')}

=== VERIFICATION CHECKLIST ===
${(content.checklists || []).map((c: string, idx: number) => `[ ] ${c}`).join('\n')}

=== EXAMPLES ===
${(content.examples || []).map((ex: any, idx: number) => `Example ${idx + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}`).join('\n\n')}`

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          description: skill.description || '',
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Please execute this task according to the Skill: ${systemPrompt}\n\nTask details/inputs: ${params?.arguments?.payload || 'No inputs provided.'}`
              }
            }
          ]
        }
      })
    }

    case 'tools/list': {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "execute_skill",
              description: "Executes a specified skill using Claude 3.5 Sonnet and logs the telemetry.",
              inputSchema: {
                type: "object",
                properties: {
                  skill_name: {
                    type: "string",
                    description: "The slugified name of the skill to execute (e.g. sales-call-prep)"
                  },
                  payload: {
                    type: "object",
                    description: "Key-value pairs representing variables for the skill templates"
                  }
                },
                required: ["skill_name", "payload"]
              }
            }
          ]
        }
      })
    }

    case 'tools/call': {
      const toolName = params?.name
      if (toolName !== 'execute_skill') {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: "Method not found / Tool not supported" }
        })
      }

      const { skill_name, payload: inputVariables } = params?.arguments || {}
      if (!skill_name || !inputVariables) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Invalid arguments" }
        })
      }

      const { data: skills } = await supabase
        .from('skills')
        .select(`
          id, name, active_version_id,
          skill_versions!fk_skills_active_version(content)
        `)
        .eq('organization_id', orgId)

      const skill = skills?.find(s => s.name.toLowerCase().replace(/\s+/g, '-') === skill_name)

      if (!skill) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [{ type: "text", text: `Skill not found: ${skill_name}` }]
          }
        })
      }

      const content = (skill.skill_versions as any)?.content || {}
      
      let instructions = content.instructions || ''
      Object.entries(inputVariables).forEach(([key, val]) => {
        instructions = instructions.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(val))
      })

      const compiledSystemPrompt = `You are executing the skill: ${skill.name}.
Instructions:
${instructions}

Constraints:
${(content.constraints || []).map((c: string) => `- ${c}`).join('\n')}

Checklist (verify all are met):
${(content.checklists || []).map((c: string) => `- ${c}`).join('\n')}`

      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [{ type: "text", text: "Server configuration error: Anthropic key missing." }]
          }
        })
      }

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const startTime = Date.now()
      
      try {
        const aiResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          system: compiledSystemPrompt,
          messages: [
            { role: 'user' as const, content: `Execute the skill with these inputs: ${JSON.stringify(inputVariables)}` }
          ]
        })

        const endTime = Date.now()
        const latency = endTime - startTime
        const responseText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''
        
        const inputTokens = aiResponse.usage.input_tokens
        const outputTokens = aiResponse.usage.output_tokens
        const costUsd = (inputTokens * 3 / 1000000) + (outputTokens * 15 / 1000000)

        await supabase
          .from('execution_logs')
          .insert({
            skill_id: skill.id,
            skill_version_id: skill.active_version_id,
            input_data: inputVariables,
            output_data: { response: responseText },
            latency_ms: latency,
            token_count: inputTokens + outputTokens,
            cost_usd: costUsd
          })

        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: responseText }]
          }
        })
      } catch (err: any) {
        console.error('Error executing active skill via tools/call:', err)
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [{ type: "text", text: `Execution failed: ${err.message}` }]
          }
        })
      }
    }

    default: {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      })
    }
  }
}
