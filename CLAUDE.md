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
    seed.ts                — Default organization shells (PDF taxonomy, ordered); positions/callings come from the imported PDF
    import-service.ts      — Import orchestration (callings + members); creates orgs/positions dynamically, infers gender restrictions from org
    export-service.ts      — CSV export, full JSON backup/restore, and metadata-only backup/restore (proposals + activity status + notes)
    import-parsers/
      lcr-json-parser.ts   — Parses LCR JSON from sub-orgs-with-callings endpoint
      csv-parser.ts        — Flexible CSV parser with column mapping
      combined-pdf-parser.ts — Generic parser for the LCR "Organizations and Callings" PDF *with member list*: reads orgs from the PDF's header font size, positions from calling names verbatim (class-qualified), and members (callings + members from one file). PDF is the source of truth — no hardcoded org/position tables. Primary import path.
      pdf-parser.ts        — Legacy callings-only PDF parser (maps into a fixed taxonomy via prefix rules)
      member-pdf-parser.ts — LCR members PDF parser ("Member List" / "Members without Callings")
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
    board/NotesButton.tsx  — Note icon + edit dialog + hover tooltip for proposed calling cards
    import/ImportWizard.tsx — Multi-step import dialog (Ward PDF [default, combined callings+members], Members PDF, Callings PDF, LCR JSON, CSV tabs)
    changes/ProposedChangesList.tsx — Changes drawer with proposal cards, notes display, and sustaining report
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
- Node.js: on Windows installed at `C:\Program Files\nodejs` (PATH export in bash: `export PATH="/c/Program Files/nodejs:$PATH"`); on macOS via Homebrew at `/opt/homebrew/bin` (already on PATH)
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
- Members PDF parser supporting both "Member List" and "Members without Callings" formats
- Export to CSV
- Dashboard summary stats (fill rates, longest serving, per-org breakdowns)
- Data backup/restore (full JSON export/import)
- Dark mode (system preference + manual toggle, localStorage persistence)

### Phase 5 — Member Management & Sustaining Report ✅
- Member activity status (active / less-active / inactive / serving-away / not-eligible) — app-managed, preserved across LCR re-imports
- Member-level filters: age bucket, gender, activity status
- Hover tooltip on member names showing their other current callings
- Gender restrictions on positions (enforced on drop with dot badges)
- Sustaining Report: group-by-type / group-by-organization toggle, print layout isolated to report content

### Phase 6 — Notes & Metadata Backup ✅
- Notes on proposed calling cards: icon in top-right of each proposed card opens an edit dialog; subtle when empty, primary-colored with hover tooltip when set. Stored in `ProposedChange.reason`
- Metadata-only backup/restore: exports proposed changes, member activity status, member notes, and calling notes keyed by names (organization/position/member) rather than IDs, so the file survives a fresh LCR re-import. Restore is additive and reports warnings for unresolved references
- Import Wizard tab order: Members PDF, Callings PDF, LCR JSON Paste, CSV Upload (Members PDF default)

### Phase 7 — Single Combined PDF & PDF-Driven Taxonomy ✅
- New primary import: one LCR "Organizations and Callings" PDF that *includes the member list* imports both callings and members (`combined-pdf-parser.ts`). Verified against the ward's data to contain every member except infants below nursery age (irrelevant to callings). "Ward PDF" is the default Import Wizard tab.
- Generic, PDF-as-source-of-truth parsing: organizations are read from the PDF's large section headers (detected by font height, e.g. "Aaronic Priesthood Quorums", "Young Single Adult"), positions are the calling names verbatim, class/room sub-headers qualify repeated positions (e.g. "Course 14 Teacher"). No hardcoded org/position mapping tables — church renames (e.g. Young Women classes → "Gatherers of Light" / "Messengers of Hope" / "Builders of Faith") flow through automatically.
- `seed.ts` now seeds only organization shells matching the PDF taxonomy; positions/callings are defined entirely by the imported PDF. `import-service.ts` no longer injects a default position set and infers per-position gender restrictions from the organization.
- Note: for a clean PDF-driven board, Reset (clears to org shells) then import the Ward PDF. The bishopric is listed under both "Bishopric" and "Aaronic Priesthood Quorums" because LCR's report lists them under "Presidency of the Aaronic Priesthood" — faithful to the PDF.
