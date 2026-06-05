'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Sparkles, 
  ArrowLeft, 
  Save, 
  Terminal, 
  HelpCircle, 
  Check, 
  Plus, 
  Trash2, 
  Send,
  Wand2,
  Copy,
  Clock,
  Loader2,
  ChevronRight,
  ShieldCheck,
  ChevronDown
} from 'lucide-react'

interface Version {
  id: string
  version_number: string
  changelog: string | null
  created_at: string
}

interface WorkspaceClientProps {
  skill: {
    id: string
    name: string
    description: string
    trigger: string
    active_version_id: string | null
    organization_id: string
    skill_versions: {
      content: any
    } | any
  }
  versions: Version[]
  startInterview: boolean
}

export default function WorkspaceClient({ skill, versions, startInterview }: WorkspaceClientProps) {
  const router = useRouter()
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Editor states
  const activeContent = skill.skill_versions?.content || {}
  const [name, setName] = useState(skill.name)
  const [description, setDescription] = useState(skill.description)
  const [trigger, setTrigger] = useState(skill.trigger)
  
  const [instructions, setInstructions] = useState(activeContent.instructions || '')
  const [constraints, setConstraints] = useState<string[]>(activeContent.constraints || [])
  const [checklists, setChecklists] = useState<string[]>(activeContent.checklists || [])
  const [examples, setExamples] = useState<Array<{ input: string; output: string }>>(activeContent.examples || [])
  
  const [activeTab, setActiveTab] = useState<'editor' | 'markdown' | 'mcp'>('editor')
  const [saveLoading, setSaveLoading] = useState(false)
  const [changelog, setChangelog] = useState('')
  const [showChangelogInput, setShowChangelogInput] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Chat/Interviewer states
  const [chatOpen, setChatOpen] = useState(startInterview)
  const [chatMode, setChatMode] = useState<'interview' | 'refine'>('interview')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `Hello! I'm your Socratic Knowledge Extractor. Let's optimize the "${skill.name}" skill. How do you approach this workflow? Describe the first step you take.`
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Optimizer states
  const [refineExplanation, setRefineExplanation] = useState<string | null>(null)
  const [pendingRefinement, setPendingRefinement] = useState<any | null>(null)

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, chatOpen])

  // Helpers for list additions
  const addConstraint = () => setConstraints([...constraints, ''])
  const updateConstraint = (idx: number, val: string) => {
    const next = [...constraints]
    next[idx] = val
    setConstraints(next)
  }
  const removeConstraint = (idx: number) => setConstraints(constraints.filter((_, i) => i !== idx))

  const addChecklist = () => setChecklists([...checklists, ''])
  const updateChecklist = (idx: number, val: string) => {
    const next = [...checklists]
    next[idx] = val
    setChecklists(next)
  }
  const removeChecklist = (idx: number) => setChecklists(checklists.filter((_, i) => i !== idx))

  const addExample = () => setExamples([...examples, { input: '', output: '' }])
  const updateExample = (idx: number, field: 'input' | 'output', val: string) => {
    const next = [...examples]
    next[idx] = { ...next[idx], [field]: val }
    setExamples(next)
  }
  const removeExample = (idx: number) => setExamples(examples.filter((_, i) => i !== idx))

  // Compile to markdown preview helper
  const getCompiledMarkdown = () => {
    return `# Skill: ${name}
Description: ${description || 'No description'}
Trigger Condition: ${trigger || 'Manual'}

## Instructions
${instructions || 'No instructions provided.'}

## Constraints
${constraints.length === 0 ? '- None' : constraints.map(c => `- ${c}`).join('\n')}

## Verification Checklist
${checklists.length === 0 ? '- None' : checklists.map(c => `- [ ] ${c}`).join('\n')}

## Examples
${examples.length === 0 ? '*No examples added*' : examples.map((ex, idx) => `### Example ${idx + 1}\n**Input:**\n\`\`\`\n${ex.input}\n\`\`\`\n\n**Output:**\n\`\`\`\n${ex.output}\n\`\`\``).join('\n\n')}`
  }

  // Handle Save
  const handleSaveSkill = async () => {
    setSaveLoading(true)
    try {
      const response = await fetch(`/api/skills/${skill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          trigger,
          changelog: changelog || 'Updated parameters',
          content: {
            name,
            trigger,
            instructions,
            constraints: constraints.filter(Boolean),
            checklists: checklists.filter(Boolean),
            examples: examples.filter(e => e.input || e.output)
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save skill changes')
      }

      setSaveSuccess(true)
      setShowChangelogInput(false)
      setChangelog('')
      router.refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      alert(`Error saving skill: ${err.message}`)
    } finally {
      setSaveLoading(false)
    }
  }

  // Handle Chat message sending
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMsg = chatInput.trim()
    setChatInput('')
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: userMsg }]
    setChatMessages(updatedMessages)
    setChatLoading(true)

    const currentDraft = {
      name,
      trigger,
      instructions,
      constraints,
      checklists,
      examples
    }

    try {
      const response = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          currentDraft
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get interviewer response')
      }

      const resData = await response.json()
      
      setChatMessages([...updatedMessages, { role: 'assistant', content: resData.question }])
      
      // Update form editors if a draft was returned
      if (resData.draft) {
        const d = resData.draft
        if (d.name && d.name !== '...') setName(d.name)
        if (d.trigger && d.trigger !== '...') setTrigger(d.trigger)
        if (d.instructions && d.instructions !== 'Explain the repeatable process here...') setInstructions(d.instructions)
        if (d.constraints && d.constraints.length > 0) setConstraints(d.constraints)
        if (d.checklists && d.checklists.length > 0) setChecklists(d.checklists)
        if (d.examples && d.examples.length > 0) setExamples(d.examples)
      }
    } catch (err: any) {
      setChatMessages([...updatedMessages, { role: 'assistant', content: `Sorry, I hit an error: ${err.message}` }])
    } finally {
      setChatLoading(false)
    }
  }

  // Handle refinement/compounding loops
  const handleAutoRefine = async () => {
    setChatMode('refine')
    setChatOpen(true)
    setChatLoading(true)
    setRefineExplanation(null)
    setPendingRefinement(null)

    try {
      const response = await fetch('/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: skill.id })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch auto-refinements')
      }

      const resData = await response.json()
      
      if (resData.refinedDraft) {
        setRefineExplanation(resData.explanation)
        setPendingRefinement(resData.refinedDraft)
      } else {
        setRefineExplanation(resData.message || 'No failures log parsed.')
      }
    } catch (err: any) {
      setRefineExplanation(`Error scanning: ${err.message}`)
    } finally {
      setChatLoading(false)
    }
  }

  const applyRefinement = () => {
    if (!pendingRefinement) return
    const d = pendingRefinement
    if (d.name) setName(d.name)
    if (d.trigger) setTrigger(d.trigger)
    if (d.instructions) setInstructions(d.instructions)
    if (d.constraints) setConstraints(d.constraints)
    if (d.checklists) setChecklists(d.checklists)
    if (d.examples) setExamples(d.examples)

    setRefineExplanation(null)
    setPendingRefinement(null)
    setChatMode('interview')
    alert('Refinements loaded into editor state. Review and click Save to apply.')
  }

  return (
    <div className="space-y-6 flex flex-col h-full min-h-[calc(100vh-8rem)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/skills" 
            className="p-2 border border-border/60 hover:bg-secondary/40 rounded-lg transition-colors cursor-pointer text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-mono border border-border">
                active
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAutoRefine}
            className="flex items-center gap-2 border border-accent/20 bg-accent/5 hover:bg-accent/10 text-accent font-semibold px-4 py-2.5 rounded-lg text-xs transition-all cursor-pointer shadow-lg shadow-accent/5"
          >
            <Wand2 className="w-4 h-4" /> Scan Failures & Refine
          </button>
          
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-semibold px-4 py-2.5 rounded-lg text-xs transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" /> Socratic Interview Chat
          </button>

          {showChangelogInput ? (
            <div className="flex items-center gap-2 bg-card border border-border/80 p-1.5 rounded-lg">
              <input
                type="text"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="What changed? (changelog)"
                className="px-2 py-1 bg-secondary/30 rounded border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary w-40"
              />
              <button
                onClick={handleSaveSkill}
                disabled={saveLoading}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer"
              >
                {saveLoading ? <Loader2 className="w-3 animate-spin" /> : 'Confirm'}
              </button>
              <button
                onClick={() => setShowChangelogInput(false)}
                className="text-xs text-muted-foreground hover:text-foreground px-1 py-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowChangelogInput(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-lg text-xs transition-all cursor-pointer shadow-lg shadow-primary/10"
            >
              <Save className="w-4 h-4" /> Save New Version
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-accent/15 border border-accent/30 text-accent-foreground p-3 rounded-lg flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4" /> Changes compiled and version incremented successfully!
        </div>
      )}

      {/* Main Workspace split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch min-h-0">
        
        {/* Left 2 Cols: Form Editors / tabs */}
        <div className="lg:col-span-2 flex flex-col glass rounded-2xl border-border/40 overflow-hidden">
          {/* Tabs header */}
          <div className="flex border-b border-border/40 bg-secondary/20">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-6 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'editor' ? 'border-primary text-foreground bg-background/30' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Structured Editor
            </button>
            <button
              onClick={() => setActiveTab('markdown')}
              className={`px-6 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'markdown' ? 'border-primary text-foreground bg-background/30' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Compiled Markdown (SKILL.md)
            </button>
            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-6 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'mcp' ? 'border-primary text-foreground bg-background/30' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              API & MCP Details
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {activeTab === 'editor' && (
              <div className="space-y-6">
                
                {/* Basic Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Skill Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/20 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Activation Trigger
                    </label>
                    <input
                      type="text"
                      value={trigger}
                      onChange={(e) => setTrigger(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/20 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Core Action Instructions
                  </label>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Define the procedure. Use double curly brackets for inputs (e.g. <code>{"{{customer_name}}"}</code>).
                  </p>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={8}
                    placeholder="Enter step-by-step procedures..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/20 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs resize-none font-mono"
                  />
                </div>

                {/* Constraints */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Execution Constraints
                    </label>
                    <button
                      onClick={addConstraint}
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Constraint
                    </button>
                  </div>
                  
                  {constraints.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">No constraints defined yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {constraints.map((c, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <span className="text-[10px] text-muted-foreground font-mono w-4">{idx + 1}.</span>
                          <input
                            type="text"
                            value={c}
                            onChange={(e) => updateConstraint(idx, e.target.value)}
                            placeholder="e.g. Do not share raw passwords or API keys."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-secondary/20 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            onClick={() => removeConstraint(idx)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Verification Checklist */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Verification Checklist (Self-Auditing)
                    </label>
                    <button
                      onClick={addChecklist}
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Checklist Item
                    </button>
                  </div>
                  
                  {checklists.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">No checklist items defined yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {checklists.map((c, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <span className="text-[10px] text-muted-foreground font-mono w-4">[ ]</span>
                          <input
                            type="text"
                            value={c}
                            onChange={(e) => updateChecklist(idx, e.target.value)}
                            placeholder="e.g. Check for tone matching the client profile."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-secondary/20 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            onClick={() => removeChecklist(idx)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Examples */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Fine-Tuning Examples
                    </label>
                    <button
                      onClick={addExample}
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Example
                    </button>
                  </div>

                  {examples.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">No examples defined yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {examples.map((ex, idx) => (
                        <div key={idx} className="p-4 bg-secondary/20 rounded-xl border border-border/40 relative space-y-3">
                          <button
                            onClick={() => removeExample(idx)}
                            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <span className="text-[10px] font-bold text-primary">Example #{idx + 1}</span>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-semibold text-muted-foreground uppercase mb-1">
                                Mock Input variables
                              </label>
                              <textarea
                                value={ex.input}
                                onChange={(e) => updateExample(idx, 'input', e.target.value)}
                                placeholder='e.g. {"customer_name": "Acme Corp"}'
                                rows={3}
                                className="w-full p-2 bg-background border border-border rounded text-[11px] font-mono focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-muted-foreground uppercase mb-1">
                                Target Output Work
                              </label>
                              <textarea
                                value={ex.output}
                                onChange={(e) => updateExample(idx, 'output', e.target.value)}
                                placeholder="e.g. Completed call briefing meeting SLA standard guidelines..."
                                rows={3}
                                className="w-full p-2 bg-background border border-border rounded text-[11px] font-mono focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'markdown' && (
              <div className="relative">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getCompiledMarkdown())
                    alert('Copied compiled markdown to clipboard!')
                  }}
                  className="absolute top-2 right-2 flex items-center gap-1 text-[10px] border border-border bg-secondary/60 hover:bg-secondary transition-colors px-2 py-1 rounded font-semibold cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </button>
                <pre className="p-6 bg-secondary/30 border border-border/40 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed select-text text-foreground">
                  {getCompiledMarkdown()}
                </pre>
              </div>
            )}

            {activeTab === 'mcp' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-sm">MCP Server Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    To make this skill library available inside Cursor, Claude Desktop, or VS Code, configure your client config file by pointing it to this server's endpoint.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-xs">For Cursor IDE</h4>
                  <p className="text-[10px] text-muted-foreground">
                    Go to <strong>Settings &gt; Features &gt; MCP</strong>, click <strong>+ Add New MCP Server</strong>, and configure:
                  </p>
                  
                  <div className="p-4 bg-secondary/30 border border-border/40 rounded-xl space-y-2 text-xs">
                    <p><strong>Name:</strong> <code>SkillFactory</code></p>
                    <p><strong>Type:</strong> <code>command</code></p>
                    <p><strong>Command:</strong> <code>npx -y @modelcontextprotocol/inspector http://localhost:3000/api/mcp</code></p>
                    <p className="text-[10px] text-muted-foreground italic mt-2">
                      Note: You must inject the `Authorization: Bearer [OrgKey]` header configuration on clients that support custom headers, or configure CLI proxies accordingly.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-xs">Direct API Call Trigger</h4>
                  <pre className="p-4 bg-secondary/30 border border-border/40 rounded-xl text-[10px] font-mono overflow-x-auto select-all">
                    {`curl -X POST http://localhost:3000/api/mcp \\
  -H "Authorization: Bearer ${skill.organization_id}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "execute_skill",
      "arguments": {
        "skill_name": "${name.toLowerCase().replace(/\s+/g, '-')}",
        "payload": {
          "variable1": "value"
        }
      }
    }
  }'`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Collapsible Chat / refiner drawer */}
        <div className="flex flex-col glass rounded-2xl border-border/40 overflow-hidden relative">
          
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-border/40 bg-secondary/20 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">
                {chatMode === 'interview' ? 'Socratic Co-Author' : 'AI Optimization logs'}
              </h3>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setChatMode('interview')}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  chatMode === 'interview' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-transparent text-muted-foreground'
                }`}
              >
                Interview
              </button>
              <button
                onClick={handleAutoRefine}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  chatMode === 'refine' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-transparent text-muted-foreground'
                }`}
              >
                Refinement logs
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0 flex flex-col justify-between">
            {chatMode === 'interview' ? (
              <div className="flex flex-col justify-between h-full space-y-4">
                {/* Chat Feed */}
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg text-xs leading-relaxed max-w-[90%] ${
                        msg.role === 'user'
                          ? 'bg-primary/10 border border-primary/25 text-foreground ml-auto'
                          : 'bg-secondary/40 border border-border/40 text-muted-foreground mr-auto'
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="bg-secondary/40 border border-border/40 p-3 rounded-lg text-xs mr-auto max-w-[90%] flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      <span>Analyzing state & compiling questions...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input form */}
                <form onSubmit={handleSendChatMessage} className="flex gap-2 border-t border-border/20 pt-4 shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type detail or answer query..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-secondary/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder-muted-foreground/60"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              // AI Refine optimizer interface
              <div className="h-full flex flex-col justify-between space-y-4">
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[450px]">
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/15 text-xs space-y-2">
                    <h4 className="font-bold text-accent">Self-improving Optimizer Loop</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Scanning for runs with low ratings (downvotes) or user corrections. We compile logs to refine constraints and instructions automatically.
                    </p>
                  </div>

                  {chatLoading && (
                    <div className="flex flex-col items-center justify-center p-8 space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <p className="text-[10px] text-muted-foreground">Analysing logs & comparing structures...</p>
                    </div>
                  )}

                  {refineExplanation && (
                    <div className="space-y-4">
                      <div className="p-4 bg-secondary/30 border border-border/40 rounded-xl text-xs space-y-2">
                        <span className="font-bold text-foreground">Optimization Analysis:</span>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{refineExplanation}</p>
                      </div>

                      {pendingRefinement && (
                        <button
                          onClick={applyRefinement}
                          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-accent/20"
                        >
                          Apply Refined Parameters & Diff
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
