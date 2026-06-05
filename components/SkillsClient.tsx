'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Library, 
  Search, 
  Plus, 
  Sparkles, 
  Trash2, 
  ChevronRight, 
  Calendar,
  X,
  Loader2
} from 'lucide-react'

interface Skill {
  id: string
  name: string
  description: string
  trigger: string
  active_version_id: string
  updated_at: string
  skill_versions?: {
    version_number: string
  } | any
}

interface SkillsClientProps {
  initialSkills: Skill[]
  autoOpenCreate: boolean
}

export default function SkillsClient({ initialSkills, autoOpenCreate }: SkillsClientProps) {
  const router = useRouter()
  const [skills, setSkills] = useState<Skill[]>(initialSkills)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(autoOpenCreate)
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trigger, setTrigger] = useState('Manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredSkills = skills.filter(skill => 
    skill.name.toLowerCase().includes(search.toLowerCase()) ||
    skill.description?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const initialContent = {
      name,
      trigger,
      instructions: "Explain the repeatable process here...",
      constraints: ["Maintain absolute security of company details"],
      checklists: ["Verify the outputs align with the constraints"],
      examples: []
    }

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          trigger,
          content: initialContent
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to create skill')
      }

      const newSkill = await response.json()
      setModalOpen(false)
      // Redirect to the workspace editor and start Socratic interview automatically
      router.push(`/dashboard/skills/${newSkill.id}?interview=true`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSkill = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the skill "${name}"? This will permanently delete all logs and versions.`)) {
      return
    }

    try {
      const response = await fetch(`/api/skills/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to delete skill')
      }

      setSkills(skills.filter(s => s.id !== id))
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div className="space-y-8 relative">
      {/* Title & Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skill Library</h1>
          <p className="text-sm text-muted-foreground">Manage your reusable judgment assets.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-lg text-sm transition-all cursor-pointer shadow-lg shadow-primary/10"
        >
          <Plus className="w-4 h-4" /> Initialize New Skill
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skill definitions..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-secondary/20 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
        />
      </div>

      {/* Grid List */}
      {filteredSkills.length === 0 ? (
        <div className="glass p-16 text-center rounded-2xl border-border/40">
          <Library className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-lg font-bold text-foreground">No matching skills found</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Get started by initializing a new skill playbook. You can write it manually or build it via conversational Socratic chats.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold px-5 py-2.5 rounded-lg text-xs border border-border transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Skill Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSkills.map(skill => {
            const ver = skill.skill_versions?.version_number || '1.0.0'
            const formattedDate = new Date(skill.updated_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })

            return (
              <div 
                key={skill.id} 
                className="glass rounded-2xl p-6 border-border/40 hover:border-primary/20 hover:shadow-lg transition-all flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {skill.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold tracking-wider font-mono">
                      v{ver}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                    {skill.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-muted-foreground font-semibold">
                    <span className="bg-secondary/40 border border-border/40 px-2 py-1 rounded">
                      Trigger: <span className="text-foreground">{skill.trigger}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/20 flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Updated {formattedDate}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteSkill(skill.id, skill.name)}
                      className="p-1.5 rounded-lg border border-border/40 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                      title="Delete Skill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/dashboard/skills/${skill.id}`}
                      className="flex items-center gap-1 bg-secondary/50 hover:bg-secondary text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/60 transition-all"
                    >
                      Workspace <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Interactive Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass w-full max-w-md rounded-2xl border-border/60 shadow-2xl p-8 relative overflow-hidden animate-in scale-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-extrabold text-base">Initialize AI Skill</h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive-foreground rounded-lg text-xs mb-4">
                {error}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleCreateSkill} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Skill Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sales Call Preparation"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/20 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Reviews client renewal data and outputs custom call briefs."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/20 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Trigger Condition
                </label>
                <input
                  type="text"
                  required
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder="e.g. Manual, Daily at 9 AM, Client renewal alert"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/20 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-xs"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border/20">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 border border-border/80 bg-secondary/10 hover:bg-secondary/40 text-foreground py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-primary/15 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      Start Socratic Chat <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
