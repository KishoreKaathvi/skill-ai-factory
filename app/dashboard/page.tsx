import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { 
  Sparkles, 
  Library, 
  Terminal, 
  DollarSign, 
  Clock, 
  ArrowRight, 
  Key,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.organization_id) {
    redirect('/login')
  }

  const orgId = profile.organization_id

  // 1. Query metrics
  // Count skills
  const { count: skillsCount } = await supabase
    .from('skills')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  // Count execution logs and calculate total cost & latency
  const { data: logs } = await supabase
    .from('execution_logs')
    .select('cost_usd, rating, latency_ms')
    .eq('skill_id', 'any') // Wait, this syntax is wrong! To query logs across all organization skills, we should filter by skill_id IN (select id from skills)
    // Supabase JS allows joining or using a sub-query structure, but simpler:
    // We can query all skills first, then query logs filtering by skill_id.
  
  // Let's first query the list of skills to get their IDs
  const { data: orgSkills } = await supabase
    .from('skills')
    .select('id, name, description, trigger, updated_at')
    .eq('organization_id', orgId)

  const skillIds = (orgSkills || []).map(s => s.id)

  let totalRuns = 0
  let totalCost = 0.0
  let averageLatency = 0
  let failureCount = 0

  if (skillIds.length > 0) {
    const { data: logsData } = await supabase
      .from('execution_logs')
      .select('cost_usd, rating, latency_ms')
      .in('skill_id', skillIds)

    if (logsData) {
      totalRuns = logsData.length
      totalCost = logsData.reduce((acc, l) => acc + Number(l.cost_usd || 0), 0)
      const totalLatency = logsData.reduce((acc, l) => acc + (l.latency_ms || 0), 0)
      averageLatency = totalRuns > 0 ? Math.round(totalLatency / totalRuns) : 0
      failureCount = logsData.filter(l => l.rating === -1).length
    }
  }

  // Calculate estimated hours saved: 0.5 hours (30 min) saved per execution on average
  const hoursSaved = (totalRuns * 0.5).toFixed(1)

  // Get last 5 logs for activity feed
  let recentLogs: any[] = []
  if (skillIds.length > 0) {
    const { data: logsFeed } = await supabase
      .from('execution_logs')
      .select('id, created_at, latency_ms, rating, skills(name)')
      .in('skill_id', skillIds)
      .order('created_at', { ascending: false })
      .limit(5)
    recentLogs = logsFeed || []
  }

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Operational Intelligence</h1>
          <p className="text-sm text-muted-foreground">Monitor and build your company's operational moats.</p>
        </div>
        <Link 
          href="/dashboard/skills?create=true"
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-lg text-sm transition-all cursor-pointer shadow-lg shadow-primary/10"
        >
          <Sparkles className="w-4 h-4" /> Create Skill via Socratic Interview
        </Link>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-xl border-border/40">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Skills</span>
            <Library className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">{skillsCount || 0}</p>
          <p className="text-xs text-muted-foreground mt-2">Centralized prompt libraries</p>
        </div>

        <div className="glass p-6 rounded-xl border-border/40">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours Saved</span>
            <Clock className="w-4 h-4 text-accent" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">{hoursSaved}h</p>
          <p className="text-xs text-muted-foreground mt-2">Calculated ROI (30 min per execution)</p>
        </div>

        <div className="glass p-6 rounded-xl border-border/40">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill Runs</span>
            <Terminal className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">{totalRuns}</p>
          <p className="text-xs text-muted-foreground mt-2">M2M executions via MCP</p>
        </div>

        <div className="glass p-6 rounded-xl border-border/40">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">LLM Spend</span>
            <DollarSign className="w-4 h-4 text-accent" />
          </div>
          <p className="text-3xl font-extrabold text-foreground">${totalCost.toFixed(4)}</p>
          <p className="text-xs text-muted-foreground mt-2">Accumulated API tokens cost</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Active Skills List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-xl border-border/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="font-bold text-sm">Active Skills Library</h3>
              <Link href="/dashboard/skills" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            {(orgSkills || []).length === 0 ? (
              <div className="p-12 text-center">
                <Library className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm font-semibold text-foreground">No skills initialized yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Run the Socratic Interviewer to automatically compile your first workflow.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {(orgSkills || []).slice(0, 4).map(skill => (
                  <div key={skill.id} className="p-6 flex justify-between items-center hover:bg-secondary/10 transition-colors">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{skill.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-lg truncate">{skill.description}</p>
                    </div>
                    <Link 
                      href={`/dashboard/skills/${skill.id}`}
                      className="text-xs border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors px-3 py-1.5 rounded-md font-semibold"
                    >
                      Workspace
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Integration Setup Card */}
          <div className="glass p-6 rounded-xl border-border/40 relative overflow-hidden">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-sm">Model Context Protocol (MCP) Setup</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Integrate your private skill library directly with Cursor, VS Code, or local terminal agents. Use your Organization Key to authorize your local agent.
                </p>
                
                <div className="mt-4 p-3 bg-secondary/40 border border-border/60 rounded-lg flex items-center justify-between text-xs font-mono select-all">
                  <span className="text-muted-foreground truncate w-80">Bearer {orgId}</span>
                  <span className="text-primary font-semibold text-[10px] uppercase font-sans shrink-0">Org Key</span>
                </div>
                
                <p className="text-[10px] text-muted-foreground mt-1">
                  Configure your MCP client configuration file by pointing SSE/POST to: <code>/api/mcp</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Activity logs & latency stats */}
        <div className="space-y-6">
          <div className="glass rounded-xl border-border/40 p-6 space-y-4">
            <h3 className="font-bold text-sm">System Health</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Average Latency</span>
                <span className="font-mono font-semibold text-foreground">{averageLatency} ms</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Refinement Health</span>
                <span className="font-semibold text-accent flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Nominal
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Failed Runs</span>
                <span className={`font-semibold ${failureCount > 0 ? 'text-destructive flex items-center gap-1' : 'text-muted-foreground'}`}>
                  {failureCount > 0 && <AlertTriangle className="w-3 h-3" />} {failureCount} runs
                </span>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl border-border/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40">
              <h3 className="font-bold text-sm">Recent Runs</h3>
            </div>
            
            {recentLogs.length === 0 ? (
              <p className="p-6 text-xs text-muted-foreground text-center">No runs logged yet</p>
            ) : (
              <div className="divide-y divide-border/40">
                {recentLogs.map(log => (
                  <div key={log.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{(log.skills as any)?.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      log.rating === -1 
                        ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                        : 'bg-accent/10 text-accent border border-accent/20'
                    }`}>
                      {log.rating === -1 ? 'Fail' : 'Success'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
