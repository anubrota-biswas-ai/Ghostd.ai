# Jobflow — PRD & Build Log

## Original Problem Statement
Build **Jobflow** — an AI-powered job application tracker with Kanban board, ATS Checker, Dashboard, Contacts CRM, and AI features (Claude). Design follows a locked Design Spec v2.0: periwinkle gradient, glassmorphism, Inter weight 300, royal blue #2B3FBF accent.

## Architecture
- **Frontend:** React (CRA) + Tailwind CSS + Zustand + dnd-kit + lucide-react
- **Backend:** FastAPI + MongoDB
- **AI:** Anthropic Claude (claude-4-sonnet-20250514) via Emergent LLM key
- **Auth:** Emergent-managed Google OAuth (session cookie + JWT fallback)

## What's Been Implemented

### Phase 1-4 (March 13, 2026)
- [x] Scaffold: folder structure, CSS design tokens, Inter font, periwinkle gradient
- [x] Shell: Sidebar (210px glass), Topbar (56px glass + CTA), React Router
- [x] Kanban Board: 6 columns, drag-and-drop via dnd-kit, full card anatomy
- [x] Right Panel: 268px glass, deep royal blue score card, progress bars, contacts, activity

### Phase 5 — Backend + Auth (March 13, 2026)
- [x] MongoDB collections: users, user_sessions, job_applications, contacts, activity_items, cvs
- [x] Emergent Google OAuth: login → callback → session cookie → protected routes
- [x] Full CRUD: GET/POST/PUT/DELETE for jobs, contacts, activity
- [x] CV upload endpoint (text-based)
- [x] Auth-gated frontend with ProtectedRoute, Login page, AuthCallback

### Phase 6 — Job Intake (March 13, 2026)
- [x] AddJobModal with two tabs: "Paste JD" and "Manual Entry"
- [x] AI JD Parsing: paste job description → Claude extracts title, company, location, salary, skills → pre-fills form
- [x] Manual form: title, company, location, salary range, status, date, URL, notes, remote toggle
- [x] Jobs saved to MongoDB, appear on board in real time

### Phase 7 — ATS Checker (March 13, 2026)
- [x] Full ATS page with left input panel (290px glass) + main content area
- [x] CV Analysis tab: paste CV + JD → scanning animation (progress ring) → results
- [x] Score card: deep royal blue gradient, 44px weight 300 score, 3 progress bars
- [x] Skills grid: two-column (hard/soft skills) with matched/missing indicators
- [x] Suggestions panel: original (red strikethrough) vs rewrite (green) with Accept/Reject
- [x] Live score updates when accepting suggestions
- [x] Compare mode: side-by-side original vs optimised CV with diff highlighting
- [x] Cover Letter tab: tone selector (4 options), company research pill, generated letter with copy/download

### Interview Prep Generator (March 13, 2026)
- [x] AI-powered interview prep per role (8-10 questions: technical + behavioural)
- [x] Company research summary generated from JD
- [x] "Why this role?" talking points
- [x] Prep checklist with checkable items
- [x] Expandable questions with per-question notes (auto-saved)
- [x] Regenerate button for fresh prep
- [x] Accessible from Right Panel "Prepare for Interview" button

### Contacts CRM (March 13, 2026)
- [x] Full CRM page: contacts grouped by job application
- [x] Add Contact modal with job selector, name, role type, email, LinkedIn, notes
- [x] Contact cards with avatar, role badge, email/LinkedIn links, last contacted, notes
- [x] Follow-up nudge badges: "Follow up" (7+ days), "Send thank you" (interview 5+ days), "No contact in 2 weeks" (14+ days)
- [x] Search contacts by name, company, or role type
- [x] Delete contacts
- [x] Backend: GET /api/contacts (enriched with job info), PUT /api/contacts/{id}

### Phase 8 — Polish (March 13, 2026)
- [x] Responsive sidebar: auto-collapses to 56px icon-only below 900px width
- [x] Manual sidebar collapse/expand toggle button
- [x] Right panel: becomes bottom sheet below 1200px width
- [x] Compact topbar: button text hidden below 600px
- [x] Slide-in/slide-up animations for panels
- [x] Skeleton loading states (board, contacts)
- [x] Empty states for every section (board, contacts, dashboard, ATS)
- [x] Modal overlay click propagation fixed
- [x] Status count pills (Wishlist, Applied, Interview, In Progress, Offer, Rejected + Total)
- [x] Applications overview table (Role, Company, Status, Match, Applied, Salary)
- [x] Empty state for new users

## Prioritized Backlog
### P0
- Phase 8: Polish — card hover animations, modal transitions, skeleton loading, responsive

### P1
- Dashboard page (salary comparison, sortable table, charts with Recharts)
- Contacts CRM page (full CRUD, follow-up nudges, timeline)
- Interview Prep Hub (AI-generated questions, company research)

### P2
- File upload for CV (PDF parsing)
- Drag-and-drop reorder within columns
- Follow-up nudge system (7-day reminders)
