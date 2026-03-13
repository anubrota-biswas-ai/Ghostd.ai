# Jobflow — PRD & Build Log

## Original Problem Statement
Build **Jobflow** — an AI-powered job application tracker with Kanban board, ATS Checker, Dashboard, Contacts CRM, and AI features (Claude). Design follows a locked Design Spec v2.0: periwinkle gradient, glassmorphism, Inter weight 300, royal blue #2B3FBF accent.

## Architecture
- **Frontend:** React (CRA) + Tailwind CSS + Zustand + dnd-kit + lucide-react
- **Backend:** FastAPI + MongoDB (to be wired in Phase 5+)
- **AI:** Anthropic Claude via Emergent LLM key (Phase 6+)
- **Auth:** Emergent-managed Google OAuth (Phase 5+)

## User Personas
- **Primary:** Professionals actively job searching
- **Secondary:** Recent graduates, career switchers

## Core Requirements
- Kanban board with 6 status columns + drag-and-drop
- Job cards with glassmorphism, company/title/salary/date/progress/contacts
- Right detail panel with score card, contacts, activity timeline
- ATS Checker with CV upload + JD analysis + AI scoring
- Dashboard for salary/role comparison
- Contacts CRM with follow-up nudges

## What's Been Implemented (Phase 1-4) — March 13, 2026
- [x] Phase 1: Scaffold — folder structure, CSS tokens, Inter font, periwinkle gradient
- [x] Phase 2: Shell — Sidebar (210px glass), Topbar (56px glass + CTA), React Router (4 routes)
- [x] Phase 3: Kanban Board — 6 columns, 10 mock jobs, drag-and-drop, full card anatomy
- [x] Phase 4: Right Panel — 268px glass, deep royal blue score card (44px weight 300), progress bars, People section, Activity timeline

## Prioritized Backlog
### P0 (Next)
- Phase 5: Backend — MongoDB models, CRUD endpoints, replace mock data
- Phase 5: Auth — Emergent Google OAuth + JWT

### P1
- Phase 6: Job Intake Modal — Paste JD (Claude AI parsing) + manual form
- Phase 7: ATS Checker — CV upload, AI scoring, skills grid, suggestions, compare mode, cover letter

### P2
- Phase 8: Polish — animations, skeleton loading, empty states, responsive, error states
- Dashboard page (salary comparison, charts)
- Contacts CRM page (full CRUD)
- Interview Prep Hub

## Next Tasks
1. Wire up FastAPI backend with MongoDB collections (job_applications, contacts, activity_items, cvs)
2. Implement auth with Emergent Google OAuth
3. Build Job Intake modal (paste + manual)
4. Integrate Claude AI for JD parsing
5. Build ATS Checker full page
