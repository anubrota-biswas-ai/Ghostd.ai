# Jobflow — PRD & Build Log v2.0

## Architecture
- **Frontend:** React (CRA) + Tailwind CSS + Zustand + dnd-kit/sortable + lucide-react
- **Backend:** FastAPI + MongoDB  
- **AI:** Anthropic Claude (claude-4-sonnet-20250514) via Emergent LLM key
- **Auth:** Emergent-managed Google OAuth + Gmail API OAuth
- **Design:** Periwinkle gradient, glassmorphism, Inter font weight 300, #2B3FBF royal blue accent

## Implemented Features

### Phase 1: Remove Interview Prep ✅
- Removed InterviewPrepModal, endpoints, MongoDB collection, Pydantic model

### Phase 2: UK Sponsorship Licence Checker ✅
- 140K+ UK Home Office Register of Licensed Sponsors loaded into MongoDB
- Fuzzy matching with rapidfuzz (WRatio, >=85% threshold)
- Green "Sponsors visas" / Amber "Not found on register" / Grey "Unknown" badges on job cards
- Auto-check on job creation, stored in job document
- Info tooltip on amber badge explaining absence ≠ inability to sponsor

### Phase 3: Company Intelligence Panel ✅
- Section A: Company logo (Clearbit), name, website, industry, size, sponsorship badge
- Section B: Editable links (LinkedIn, Glassdoor, website)
- Section C: Funding stage dropdown, tech stack tags (add/remove), notes field
- Section D: People with inline add contact form
- Section E: Activity timeline + Gmail emails
- Section F: CV Match Score moved to bottom; "No ATS check yet" prompt when empty

### Phase 4: Gmail Auto-Progression with Notifications ✅
- Gmail scan classifies emails with Claude (rejection/interview/offer/assessment/follow_up)
- Creates notifications for high-confidence (>=70%) classifications
- NotificationBell in topbar with count badge and dropdown
- Confirm (moves card + logs activity) or Dismiss actions
- Never auto-moves cards — always requires user confirmation

### Phase 5: Persistent ATS Results ✅
- ats_results MongoDB collection with full analysis data
- Auto-save after analysis, auto-load on page return
- "Re-run Analysis" button for fresh results
- Right panel shows "Run ATS Check" prompt instead of 0%

### Phase 6: Cover Letter Inline Editor ✅
- Editable paragraphs with contentEditable
- Paragraph-level regeneration with optional instructions
- Tone re-generate with overwrite confirmation
- Word count display
- Save Draft / Copy / Download buttons
- Persistent storage in cover_letters MongoDB collection

### Previous Phases (still active):
- Kanban Board: 6 columns, drag-and-drop reorder within+between columns
- Job Intake: Paste JD (AI parse) + Manual Entry modal
- ATS Checker: CV upload (PDF/TXT), analysis, skills grid, suggestions, compare mode
- Gmail Integration: OAuth, email reading, sending, auto-scan
- Contacts CRM: Grouped by job, search, add/delete, follow-up nudges
- Responsive: Sidebar collapse (<900px), bottom sheet panel (<1200px)
- Auth: Emergent Google OAuth with session cookies
