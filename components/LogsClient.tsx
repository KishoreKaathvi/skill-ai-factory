'use client'

import { useState } from 'react'
import { 
  Terminal, 
  Search, 
  Calendar, 
  ThumbsUp, 
  ThumbsDown, 
  DollarSign, 
  Activity, 
  FileText, 
  Check, 
  ChevronRight,
  Clock,
  MessageSquareCode,
  Loader2
} from 'lucide-react'

interface Log {
  id: string
  skill_id: string
  skill_version_id: string
  input_data: any
  output_data: any
  latency_ms: number
  token_count: number
  cost_usd: number
  rating: number | null
  created_at: string
  skills?: { name: string } | any
  skill_versions?: { version_number: string } | any
  human_feedback?: Array<{ id: string; corrected_output: string; notes: string }> | any
}

interface LogsClientProps {
  initialLogs: Log[]
}

export default function LogsClient({ initialLogs }: LogsClientProps) {
  const [logs, setLogs] = useState<Log[]>(initialLogs)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    initialLogs.length > 0 ? initialLogs[0].id : null
  )
  const [filter, setFilter] = useState<'all' | 'flagged'>('all')
  const [search, setSearch] = useState('')

  // Selected Log feedback states
  const selectedLog = logs.find(l => l.id === selectedLogId)
  
  // Feedback form state
  const firstFeedback = selectedLog?.human_feedback?.[0] || selectedLog?.human_feedback
  const [correctedOutput, setCorrectedOutput] = useState(firstFeedback?.corrected_output || '')
  const [notes, setNotes] = useState(firstFeedback?.notes || '')
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  // Update feedback input fields when selectedLog changes
  const handleSelectLog = (logId: string) => {
    setSelectedLogId(logId)
    setFeedbackSuccess(false)
    const log = logs.find(l => l.id === logId)
    const fb = log?.human_feedback?.[0] || log?.human_feedback
    setCorrectedOutput(fb?.corrected_output || '')
    setNotes(fb?.notes || '')
  }

  const handleRateLog = async (logId: string, rating: number) => {
    try {
      const response = await fetch(`/api/logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      })

      if (!response.ok) throw new Error('Failed to update rating')

      const updated = await response.json()
      
      // Update state
      setLogs(logs.map(l => l.id === logId ? { ...l, rating: updated.rating } : l))
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLogId || feedbackLoading) return
    setFeedbackLoading(true)
    setFeedbackSuccess(false)

    try {
      const response = await fetch(`/api/logs/${selectedLogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: -1, // Downvote automatically if we submit a correction
          feedback: {
            corrected_output: correctedOutput,
            notes
          }
        })
      })

      if (!response.ok) throw new Error('Failed to save correction feedback')

      const updated = await response.json()
      
      // Update state
      setLogs(logs.map(l => 
        l.id === selectedLogId 
          ? { 
              ...l, 
              rating: -1,
              human_feedback: Array.isArray(updated.human_feedback) ? updated.human_feedback : [updated.human_feedback].filter(Boolean)
            } 
          : l
      ))
      setFeedbackSuccess(true)
    } catch (err: any) {
      alert(`Error saving feedback: ${err.message}`)
    } finally {
      setFeedbackLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.rating === -1
    const skillName = log.skills?.name || ''
    const matchesSearch = skillName.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-6 flex flex-col h-full min-h-[calc(100vh-8rem)]">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Execution Logs</h1>
        <p className="text-sm text-muted-foreground">Monitor client requests and submit optimizations.</p>
      </div>

      {/* Main split view container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch min-h-0">
        
        {/* Left Side: Filter, search, and list (1 col) */}
        <div className="lg:col-span-1 flex flex-col glass rounded-2xl border-border/40 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/40 space-y-3 bg-secondary/15">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  filter === 'all' 
                    ? 'bg-primary/15 border-primary/30 text-primary' 
                    : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                All Runs
              </button>
              <button
                onClick={() => setFilter('flagged')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  filter === 'flagged' 
                    ? 'bg-destructive/15 border-destructive/30 text-destructive-foreground' 
                    : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Downvoted / Fails
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by skill name..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background/50 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              />
            </div>
          </div>

          {/* List feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/20 pr-1 max-h-[500px]">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No executions recorded matching filters.
              </div>
            ) : (
              filteredLogs.map(log => {
                const isActive = log.id === selectedLogId
                const isFailed = log.rating === -1
                const date = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                
                return (
                  <button
                    key={log.id}
                    onClick={() => handleSelectLog(log.id)}
                    className={`w-full p-4 flex items-start justify-between text-left transition-colors cursor-pointer border-l-2 ${
                      isActive 
                        ? 'bg-secondary/40 border-l-primary' 
                        : isFailed 
                          ? 'border-l-destructive/50 hover:bg-secondary/20' 
                          : 'border-l-transparent hover:bg-secondary/20'
                    }`}
                  >
                    <div className="space-y-1 truncate pr-2">
                      <p className="font-bold text-xs text-foreground truncate">
                        {log.skills?.name || 'Skill Run'}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {date}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[9px] font-mono text-muted-foreground font-semibold">
                        {log.latency_ms} ms
                      </span>
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        log.rating === 1 
                          ? 'bg-accent shadow-sm shadow-accent/40' 
                          : log.rating === -1 
                            ? 'bg-destructive shadow-sm shadow-destructive/40' 
                            : 'bg-border'
                      }`} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Side: Log Detail (2 cols) */}
        <div className="lg:col-span-2 flex flex-col glass rounded-2xl border-border/40 overflow-hidden">
          {selectedLog ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              
              {/* Detail Header / Stats */}
              <div className="p-6 border-b border-border/40 bg-secondary/15 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">
                    {selectedLog.skills?.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                    <span>ID: {selectedLog.id}</span>
                    <span>•</span>
                    <span>Version: v{selectedLog.skill_versions?.version_number || '1.0.0'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleRateLog(selectedLog.id, 1)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      selectedLog.rating === 1 
                        ? 'bg-accent/10 border-accent text-accent' 
                        : 'border-border bg-secondary/25 text-muted-foreground hover:text-foreground'
                    }`}
                    title="Mark Success"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRateLog(selectedLog.id, -1)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      selectedLog.rating === -1 
                        ? 'bg-destructive/10 border-destructive text-destructive-foreground' 
                        : 'border-border bg-secondary/25 text-muted-foreground hover:text-foreground'
                    }`}
                    title="Mark Failure"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Log telemetry panels */}
              <div className="p-6 grid grid-cols-3 border-b border-border/20 bg-secondary/5 text-center text-xs divide-x divide-border/20">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Latency</p>
                  <p className="font-mono font-bold text-foreground text-sm">{selectedLog.latency_ms} ms</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Token Count</p>
                  <p className="font-mono font-bold text-foreground text-sm">{selectedLog.token_count || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Estimated Cost</p>
                  <p className="font-mono font-bold text-accent text-sm">${Number(selectedLog.cost_usd || 0).toFixed(4)}</p>
                </div>
              </div>

              {/* Input / Output tabs */}
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-primary" /> Input Payload variables
                  </h4>
                  <pre className="p-4 bg-secondary/30 border border-border/40 rounded-xl text-[11px] font-mono overflow-x-auto text-foreground whitespace-pre-wrap select-text">
                    {JSON.stringify(selectedLog.input_data, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Output Response
                  </h4>
                  <pre className="p-4 bg-secondary/30 border border-border/40 rounded-xl text-[11px] font-mono overflow-x-auto text-muted-foreground whitespace-pre-wrap select-text leading-relaxed">
                    {selectedLog.output_data?.response || JSON.stringify(selectedLog.output_data, null, 2)}
                  </pre>
                </div>

                {/* Human feedback loop form */}
                <div className="border-t border-border/20 pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquareCode className="w-4 h-4 text-accent" />
                    <h4 className="font-bold text-xs">Human Correction (Refinement Data)</h4>
                  </div>

                  {feedbackSuccess && (
                    <div className="p-2.5 bg-accent/15 border border-accent/25 text-accent-foreground text-xs rounded-md flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Correction submitted. This log is flagged for automated self-improvement.
                    </div>
                  )}

                  <form onSubmit={handleSaveFeedback} className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-semibold text-muted-foreground uppercase mb-1.5">
                        Target output correction (what the model should have outputted)
                      </label>
                      <textarea
                        required
                        value={correctedOutput}
                        onChange={(e) => setCorrectedOutput(e.target.value)}
                        placeholder="Define the optimal outputs parameters for these inputs variables..."
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/20 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-semibold text-muted-foreground uppercase mb-1.5">
                        Notes / Why did it fail? (e.g. 'Model ignored custom SLA instructions')
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes for optimizer analytics..."
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-secondary/20 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={feedbackLoading}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2 px-4 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer shadow-lg shadow-accent/10 disabled:opacity-50"
                    >
                      {feedbackLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Correction Data'}
                    </button>
                  </form>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Terminal className="w-12 h-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-semibold">No Log Selected</p>
              <p className="text-xs text-muted-foreground">Choose an execution log from the sidebar to audit.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
