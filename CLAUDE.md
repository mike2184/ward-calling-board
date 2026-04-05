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
    export-service.ts      — CSV export, JSON backup/restore
    import-parsers/
      lcr-json-parser.ts   — Parses LCR JSON from sub-orgs-with-callings endpoint
      csv-parser.ts        — Flexible CSV parser with column mapping
      pdf-parser.ts        — LCR PDF text extraction and parsing (pdfjs-dist)
  hooks/
    useCallings.ts         — Calling queries with org/position/member joins
    useMembers.ts          — Member queries (unassigned, multi-calling, etc.)
    useProposals.ts        — Proposed change CRUD, workflow transitions, apply/revert logic
    useDarkMode.ts         — Dark mode toggle with localStorage and system preference
  components/
    board/CallingList.tsx   — Table view of callings grouped by organization
    board/BoardView.tsx    — Kanban board with DndContext wrapping board + sidebar
    board/CallingCard.tsx  — Draggable calling card with status colors
    board/OrganizationColumn.tsx — Droppable organization column with vacant slots
    members/MemberSidebar.tsx — Sidebar showing unassigned/multi-calling members
    members/DraggableMemberCard.tsx — Draggable member card for board view
    filters/OrganizationFilter.tsx — Org filter pills + search + vacant toggle
    import/ImportWizard.tsx — Multi-step import dialog (LCR JSON + CSV + PDF tabs)
    changes/ProposedChangesList.tsx — Changes drawer with proposal cards and sustaining report
    dashboard/Dashboard.tsx — Summary stats modal with fill rates and longest serving
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
- Dexie database with schema and seed data for 15 ward organizations (~127 positions)
- Import parsers: LCR JSON paste + CSV upload with flexible column mapping
- Import Wizard with preview/confirm flow
- Calling list view with organization grouping, status dots, serving duration
- Organization filter pills with vacancy count badges
- Search and "show vacant only" filter
- Member sidebar (no calling, multiple callings, all members sections)
- Summary stats (total, filled, vacant)
- Reset data functionality

### Phase 2 — Drag-and-Drop Board & Member Management ✅
- Kanban-style board view with organization columns and calling cards
- Board/List view toggle in header
- CallingCard component with green (filled) / red dashed (vacant) / yellow (proposed) borders and serving duration
- OrganizationColumn with filled/total count header
- Vacant position drop targets that highlight on drag-over
- Draggable member cards in sidebar (drag onto vacant slots to assign)
- Draggable filled calling cards (move between positions)
- DndContext wrapping both board and sidebar for cross-component drag-and-drop
- BoardView component orchestrating dnd-kit sensors, collision detection, and drag handlers
- Drop onto filled callings to replace (proposes release + assign)
- Move vs Assign Only confirmation dialog when moving between callings
- Multi-proposal display per card (release + assign shown together)
- Release button on filled calling cards to propose release

### Phase 3 — Proposed Changes Workflow ✅
- Drag-and-drop now creates ProposedChange records instead of direct updates
- Changes drawer (slides in from right) showing all pending proposals
- Proposal cards with status badges (Draft/Pending Approval/Approved/Applied)
- Workflow: Draft → Submit for Approval → Approve → Apply Now
- Apply All Approved batch action
- Sustaining Report view (releases and new callings, grouped by org)
- Print Report button for sustaining meetings
- Delete/remove individual proposals
- Rewind proposals (step back in workflow)
- Revert applied proposals (undo changes to callings)
- Changes badge with count in header
- useProposals hook with full CRUD and workflow state transitions

### Phase 4 — Polish & Advanced Features ✅
- LCR PDF import parser (pdfjs-dist text extraction with regex parsing)
- Export to CSV
- Dashboard summary stats (fill rates, longest serving, per-org breakdowns)
- Data backup/restore (full JSON export/import)
- Dark mode (system preference + manual toggle, localStorage persistence)
