'use client'

import { useState } from 'react'
import { 
  Key, 
  CreditCard, 
  Building2, 
  CheckCircle2, 
  ExternalLink,
  Loader2,
  Lock,
  RefreshCw,
  Copy,
  Terminal
} from 'lucide-react'

interface SettingsClientProps {
  profile: any
  org: any
}

export default function SettingsClient({ profile, org }: SettingsClientProps) {
  const [orgName, setOrgName] = useState(org.name)
  const [billingLoading, setBillingLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleUpdateOrgName = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveLoading(true)
    setSuccessMsg(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName })
        .eq('id', org.id)

      if (error) throw error
      setSuccessMsg('Organization name updated successfully.')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setSaveLoading(false)
    }
  }

  const handleBillingManage = async () => {
    setBillingLoading(true)
    try {
      const isSubscribed = org.subscription_status === 'active' || org.subscription_status === 'trialing'
      const endpoint = isSubscribed && org.stripe_customer_id 
        ? '/api/billing/portal' 
        : '/api/billing/checkout'

      const response = await fetch(endpoint, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Billing portal redirection failed')
      }

      const { url, error } = await response.json()
      if (error) throw new Error(error)

      if (url) {
        window.location.href = url
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setBillingLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your organization credentials and Stripe plan details.</p>
      </div>

      {successMsg && (
        <div className="p-3 bg-accent/15 border border-accent/25 text-accent-foreground text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Grid panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: Org and Auth info */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border-border/40 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/20 pb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Organization Settings</h3>
            </div>

            <form onSubmit={handleUpdateOrgName} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Company / Team Name
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/20 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Organization Role
                </label>
                <div className="px-3 py-2 rounded-lg border border-border bg-secondary/10 text-muted-foreground text-xs select-none capitalize">
                  {profile.role}
                </div>
              </div>

              <button
                type="submit"
                disabled={saveLoading}
                className="bg-secondary hover:bg-secondary/80 text-foreground font-semibold px-4 py-2 rounded-lg text-xs border border-border transition-all cursor-pointer flex items-center gap-1.5"
              >
                {saveLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Details
              </button>
            </form>
          </div>

          {/* Org Key and credentials */}
          <div className="glass p-6 rounded-2xl border-border/40 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/20 pb-3">
              <Key className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Access Credentials</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Organization ID (Bearer API Key)
                </label>
                <div className="p-3 bg-secondary/30 border border-border/40 rounded-lg flex items-center justify-between text-xs font-mono select-all">
                  <span className="text-muted-foreground truncate mr-2">{org.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(org.id)
                      alert('Copied Organization ID to clipboard!')
                    }}
                    className="p-1 border border-border hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                  Keep this ID absolute secret. Any local agent connecting via MCP uses this token as a Bearer authorization signature.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Billing Settings */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border-border/40 space-y-6">
            <div className="flex items-center gap-2 border-b border-border/20 pb-3">
              <CreditCard className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Plan & Subscriptions</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center bg-secondary/15 p-4 rounded-xl border border-border/40">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Active Tier</p>
                  <p className="font-bold text-base text-foreground capitalize">
                    {org.stripe_plan_name ? org.stripe_plan_name.replace('price_', 'Tier ') : 'Standard Trial'}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider font-mono ${
                  org.subscription_status === 'active' || org.subscription_status === 'trialing'
                    ? 'bg-accent/15 border border-accent/20 text-accent-foreground'
                    : 'bg-destructive/15 border border-destructive/20 text-destructive-foreground'
                }`}>
                  {org.subscription_status || 'Trial'}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Unlock unlimited skills, active telemetry logs, self-compounding AI optimizer loops, and dedicated MCP servers hosting.
                </p>
              </div>

              <button
                onClick={handleBillingManage}
                disabled={billingLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-primary/15 disabled:opacity-50"
              >
                {billingLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {org.subscription_status === 'active' ? 'Manage Stripe Subscription' : 'Upgrade to Enterprise Compounding Moat'}
                    </span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MCP Quick Config Helper */}
          <div className="glass p-6 rounded-2xl border-border/40 space-y-3">
            <div className="flex items-center gap-2 border-b border-border/20 pb-3">
              <Terminal className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">MCP Setup Helper</h3>
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verify your setup by running the MCP diagnostic. Paste this snippet directly inside your terminal or config files.
            </p>

            <pre className="p-3 bg-secondary/40 border border-border/60 rounded-lg text-[10px] font-mono text-muted-foreground whitespace-pre-wrap select-all">
              {`npx -y @modelcontextprotocol/inspector http://localhost:3000/api/mcp \\
  --header "Authorization: Bearer ${org.id}"`}
            </pre>
          </div>
        </div>

      </div>
    </div>
  )
}
