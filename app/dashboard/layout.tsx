import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { 
  Sparkles, 
  LayoutDashboard, 
  Library, 
  Terminal, 
  Settings, 
  LogOut, 
  User,
  CreditCard
} from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile and organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, organizations(name, subscription_status)')
    .eq('id', user.id)
    .single()

  const orgName = (profile?.organizations as any)?.name || 'My Organization'
  const subStatus = (profile?.organizations as any)?.subscription_status || 'trialing'

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Decorative Blur Backgrounds */}
      <div className="glow-bg w-[300px] h-[300px] bg-primary/10 top-10 left-10" />
      <div className="glow-bg w-[400px] h-[400px] bg-accent/5 bottom-10 right-10" />

      {/* Sidebar */}
      <aside className="w-64 border-r border-border/40 bg-card/30 backdrop-blur-md flex flex-col z-10 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-border/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/40 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold tracking-tight text-sm text-foreground">Skill AI Factory</h2>
            <p className="text-[10px] text-muted-foreground truncate w-40">{orgName}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all font-medium"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link 
            href="/dashboard/skills" 
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all font-medium"
          >
            <Library className="w-4 h-4" />
            Skill Library
          </Link>
          <Link 
            href="/dashboard/logs" 
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all font-medium"
          >
            <Terminal className="w-4 h-4" />
            Execution Logs
          </Link>
          <Link 
            href="/dashboard/settings" 
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all font-medium"
          >
            <Settings className="w-4 h-4" />
            Settings & Billing
          </Link>
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-border/40 bg-secondary/10 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-secondary border border-border/60 flex items-center justify-center text-muted-foreground font-semibold">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-semibold truncate text-foreground">{profile?.full_name || 'Operator'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 px-2.5 py-1.5 rounded-md text-[10px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-primary" /> Plan
            </span>
            <span className="font-semibold text-primary capitalize">{subStatus}</span>
          </div>

          <LogoutButton />
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative">
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
