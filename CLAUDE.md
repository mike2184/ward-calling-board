# Ward Callings Manager

A local-first web application for managing ward callings in The Church of Jesus Christ of Latter-day Saints.

## Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Persistence:** IndexedDB via Dexie.js (all data stays in browser)
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/sortable (Phase 2)
- **Icons:** Lucide React
- **Dates:** date-fns

## Project Structure

```
src/
  types/models.ts          — Domain type definitions (Member, Calling, Organization, etc.)
  data/
    db.ts                  — Dexie database schema and initialization
    seed.ts                — Default ward organizations and positions
    import-service.ts      — Import orchestration (callings + members)
    import-parsers/
      lcr-json-parser.ts   — Parses LCR JSON from sub-orgs-with-callings endpoint
      csv-parser.ts        — Flexible CSV parser with column mapping
  hooks/
    useCallings.ts         — Calling queries with org/position/member joins
    useMembers.ts          — Member queries (unassigned, multi-calling, etc.)
  components/
    board/CallingList.tsx   — Table view of callings grouped by organization
    members/MemberSidebar.tsx — Sidebar showing unassigned/multi-calling members
    filters/OrganizationFilter.tsx — Org filter pills + search + vacant toggle
    import/ImportWizard.tsx — Multi-step import dialog (LCR JSON + CSV tabs)
  utils/time.ts            — Serving duration formatting
  lib/utils.ts             — Tailwind merge utility (cn)
```

## Commands

- `npm run dev` — Start dev server (http://localhost:5173)
- `npm run build` — TypeScript check + production build
- `npx tsc --noEmit` — Type check only

## Development Notes

- Path alias `@/` maps to `src/`
- Node.js installed at `C:\Program Files\nodejs` (may need PATH export in bash: `export PATH="/c/Program Files/nodejs:$PATH"`)
- No backend — all data persists in browser IndexedDB
- LCR has no official API; primary import is pasting raw JSON from LCR's internal endpoint

## Progress

### Phase 1 — Core Data & Import (MVP) ✅
- Vite + React + TypeScript project scaffold
- TypeScript data model (Member, Organization, CallingPosition, Calling, ProposedChange)
- Dexie database with schema and seed data for 10 ward organizations
- Import parsers: LCR JSON paste + CSV upload with flexible column mapping
- Import Wizard with preview/confirm flow
- Calling list view with organization grouping, status dots, serving duration
- Organization filter pills with vacancy count badges
- Search and "show vacant only" filter
- Member sidebar (no calling, multiple callings, all members sections)
- Summary stats (total, filled, vacant)
- Reset data functionality

### Phase 2 — Drag-and-Drop Board & Member Management
- [ ] Kanban-style board view (org columns, calling cards)
- [ ] Vacant position drop targets
- [ ] Drag members from sidebar to vacant slots
- [ ] Drag callings between positions
- [ ] Color-coded calling cards (green/red/yellow borders)

### Phase 3 — Proposed Changes Workflow
- [ ] ProposedChange records from drag-and-drop actions
- [ ] Changes panel/drawer with diff view
- [ ] Workflow: Draft → Pending Approval → Approved → Applied
- [ ] Sustaining report printing

### Phase 4 — Polish & Advanced Features
- [ ] PDF import parser
- [ ] Export to CSV/PDF
- [ ] Dashboard summary stats
- [ ] Data backup/restore
- [ ] Dark mode
