# Skill AI Factory (The Agentic Operating System)

Implement a centralized enterprise-grade platform for creating, version-controlling, auditing, and executing **AI Skills** (repeatable, context-rich agent guidelines, prompts, and tool configurations). This platform replaces static business playbooks with an **active execution layer** that plugs directly into local IDEs, browser extensions, CLIs (like Claude Code), and external workflows via the Model Context Protocol (MCP).

To build **AI defensibility and multi-moats**, the platform incorporates:
1. **Socratic Tacit Knowledge Capture:** Interactive AI-led interviews to extract implicit developer/operator judgment rules, edge cases, and success metrics that standard wikis miss.
2. **Self-Compounding Optimization Engine:** A closed-loop feedback pipeline where user ratings (upvotes/downvotes) and corrections are sent to an asynchronous AI refiner to auto-update and optimize `SKILL.md` definitions over time.
3. **High Switching Cost Framework:** Cross-compiling skill libraries into multiple target files (`.cursorrules`, `CLAUDE.md`, MCP templates, and LangGraph schemas) to lock in the organization's entire AI workflow registry.

---

## User Review Required

> [!IMPORTANT]
> **Dynamic Database Migrations & Multi-Tenancy Strategy**
> Database schema designs are logical-isolation multi-tenant schemas based on a shared database. Row-Level Security (RLS) policies are bound to the current user's `organization_id`. We must ensure all local migrations run cleanly.

> [!WARNING]
> **Stripe Billing Model Shift**
> The billing model will transition from flat subscription tiers to a **Hybrid Tiered + Usage-based Billing** system. We will meter usage based on **Skill Test Executions** and **AI Socratic Interview Sessions** via Stripe Metered billing.

---

## Open Questions

> [!NOTE]
> *There are no blocking open questions at this stage, but we should align on whether the MCP compiler endpoint should require API tokens from day one (recommended for security) or if a simple public-read-only route is sufficient for initial testing.*

---

## Proposed Changes

### Component 1: Core Database & Multi-Tenancy (Database Schema)

#### [NEW] [schema.sql](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/schema.sql)
Establish the underlying tables, indexes, foreign keys, and RLS rules for multi-tenant isolation.
- `organizations`: Stores organization profiles and Stripe references (`stripe_customer_id`, `stripe_subscription_id`, `plan_status`).
- `profiles`: Extends Supabase auth profiles, tracking role-based permissions (`owner`, `admin`, `editor`, `viewer`).
- `skills`: Primary registry of skill meta-data.
- `skill_versions`: Git-like immutable records of the actual `SKILL.md` contents, variables, constraints, checklists, and changelogs.
- `execution_logs`: Captures inputs, outputs, token consumption, cost, latency, and system execution telemetry.
- `human_feedback`: Stores thumbs up/down, user corrections, and failure reasonings to drive the compounding refiner loop.
- `notifications`: Keeps track of in-app alerting, failure reports, and approval request states.

---

### Component 2: Next-Gen Auth & Organization Workspace (Auth & Security)

#### [NEW] [middleware.ts](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/middleware.ts)
- Next.js server middleware to intercept dashboard routes.
- Resolves tenant context (verifying active session, organizational bindings, and checking subscription validity before routing to backend pages).

#### [NEW] [auth.ts](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/lib/auth.ts)
- Helper functions to query active user profiles, roles, and boundaries securely.
- RLS proxy controls to guarantee data isolation at the ORM layer.

---

### Component 3: Premium Enterprise Frontend (UI/UX)

#### [NEW] [dashboard.tsx](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/app/dashboard/page.tsx)
- Sleek dashboard overview. Premium dark aesthetic, high-contrast HSL color tones.
- High-level KPIs: Cumulative active skills, hours saved (ROI calculation), token cost, average execution success rate.
- Quick action shortcuts: "New Skill Interview", "Explore Public Marketplace", "Manage Stripe Plan".

#### [NEW] [editor.tsx](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/app/skills/%5Bid%5D/editor/page.tsx)
- Dual-pane layout.
  - **Left Pane:** A rich Markdown editor showing the current `SKILL.md` syntax, highlighting variable inputs (`{{input}}`), constraints, and verification checklists.
  - **Right Pane:** The "AI Socratic Interviewer" drawer. Allows users to "grill" themselves or dump raw thoughts to let Claude compile the changes.

#### [NEW] [logs.tsx](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/app/logs/page.tsx)
- Real-time terminal layout displaying execution history.
- Red/Green status nodes showing execution status, latency, and user feedback indicators.
- Quick filter for "Failed Runs" or "Runs with Negative Feedback" to feed into the optimizer pipeline.

---

### Component 4: Backend API & AI Compounding Engines (Backend & Analytics)

#### [NEW] [route.ts](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/app/api/skills/route.ts)
- Standard CRUD handlers for skills, checking organization scopes.

#### [NEW] [route.ts](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/app/api/ai/interview/route.ts)
- Socratic Interviewer endpoint. Streams questions from Claude 3.5 Sonnet aimed at uncovering edge cases ("When account size is > $100k, what is the exact escalation path?").

#### [NEW] [route.ts](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/app/api/ai/refine/route.ts)
- The feedback compounding loop engine.
- Takes a skill definition, the history of low-rated logs, and manual user corrections.
- Runs an offline optimizer query against Claude 3.5 Sonnet to output a structured markdown diff to refine the skill.

#### [NEW] [route.ts](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/app/api/mcp/route.ts)
- Exposes the company's skill library as an authenticated Model Context Protocol (MCP) server.
- Supports `prompts/list`, `prompts/get`, `tools/list`, and `tools/call` schemas, allowing local IDEs (Cursor/VS Code) or terminal agents (Claude Code) to fetch and execute current organizational skills directly.

---

### Component 5: Billing & Integration Engine (Stripe & Notifications)

#### [NEW] [route.ts](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/app/api/webhooks/stripe/route.ts)
- Secure stripe webhook endpoint verifying signatures.
- Maps `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` to internal tenant subscription tables.
- Reports metered usage parameters (such as number of runs/interviews) to Stripe.

#### [NEW] [notifier.ts](file:///c:/Users/Lalli_KK74/Desktop/AI%20Business%20Main%20Folder/Skill%20AI%20Factory/lib/notifier.ts)
- Utility helper wrapping Resend and Slack endpoints.
- Sends instant notifications on critical skill regressions, team audit changes, or weekly ROI summaries.

---

## Verification Plan

### Automated Tests
Verify both isolated query security and compiler mapping reliability:
- Row-Level Security: Create testing scripts to verify that users from Tenant A receive a `404/403` when requesting skills belonging to Tenant B.
- Compiler Verification: Assert that a generated markdown template compiles cleanly into valid MCP prompts.
- Webhook Signature Tests: Mock Stripe event signatures to guarantee the endpoint processes database state transitions accurately.

### Manual Verification
- **Billing Checkout Flow:** Set Stripe to test mode, execute checkout, and verify the organization table reflects active subscription flags.
- **Socratic Refiner Loop:** Trigger a low rating on a mock execution log, input a correction, execute the refiner, and verify that the editor shows a updated version version with the new constraints.
