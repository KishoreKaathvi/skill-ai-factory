import Link from 'next/link'
import { Sparkles, Library, ArrowRight, Terminal, Shield, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col justify-between">
      {/* Glow Effects */}
      <div className="glow-bg w-[500px] h-[500px] bg-primary/15 top-[-100px] left-[-100px]" />
      <div className="glow-bg w-[600px] h-[600px] bg-accent/5 bottom-[-200px] right-[-200px]" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/40 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-extrabold tracking-tight text-lg">Skill AI Factory</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-all">
            Sign In
          </Link>
          <Link 
            href="/signup" 
            className="text-sm bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2 rounded-lg transition-all shadow-lg shadow-primary/10"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center z-10 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5" />
          <span>Every Company's First AI Strategy Should Be a Skill Library</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6 max-w-4xl bg-gradient-to-b from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          Code Is Commoditized.<br />
          <span className="bg-gradient-to-r from-primary via-[#b5179e] to-accent bg-clip-text text-transparent">
            Your Moat Is Judgment.
          </span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          Stop re-explaining context to agents. Skill AI Factory lets companies extract, version-control, and compile human workflows into executable instructions that power local developer environments and AI agents.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            href="/signup" 
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-4 rounded-xl text-base transition-all shadow-xl shadow-primary/25 cursor-pointer"
          >
            Deploy Your Skill Library <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="/login" 
            className="flex items-center gap-2 border border-border/80 bg-secondary/20 hover:bg-secondary/40 text-foreground font-semibold px-8 py-4 rounded-xl text-base transition-all cursor-pointer"
          >
            Access Dashboard
          </Link>
        </div>
      </section>

      {/* Feature Section Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20 w-full z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass p-8 rounded-2xl border-border/40 hover:border-primary/20 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
              <Library className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold mb-2">Tacit Knowledge Extraction</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our Socratic interview agent grills your best employees to translate their implicit operational judgments into checklists, guidelines, and variables.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl border-border/40 hover:border-primary/20 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold mb-2">Self-Compounding Flywheel</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track agent performance logs. Low-rated results and human corrections are automatically compiled to generate upgraded skill versions.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl border-border/40 hover:border-primary/20 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold mb-2">Model Context Protocol (MCP)</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Expose your organization's skills dynamically to Cursor, VS Code, or terminal utilities (like Claude Code) via a secure local proxy.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground z-10">
        <p>© 2026 Skill AI Factory. All rights reserved.</p>
        <div className="flex items-center gap-6 mt-4 sm:mt-0">
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
        </div>
      </footer>
    </div>
  )
}
