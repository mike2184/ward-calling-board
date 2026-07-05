# Ward Calling Board

A local-first web application for managing ward callings in The Church of Jesus Christ of Latter-day Saints. All data stays in your browser using IndexedDB — no backend, no accounts, no data leaves your machine.

![Board View](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-blue)

## Features

- **Kanban Board View** — Visual board with organization columns and calling cards showing fill status, serving duration, and proposed changes
- **List View** — Traditional table view of all callings grouped by organization
- **Drag-and-Drop** — Drag members onto vacant slots to propose assignments, or onto filled callings to propose replacements
- **Proposed Changes Workflow** — Draft → Submit for Approval → Approve → Apply, with sustaining report generation (group by type or by organization, print-ready)
- **Notes on Proposed Callings** — Click the note icon on any proposed card to add context; hover to see the note in a tooltip
- **Member Sidebar** — Filter members by age group (0-10, 11-17, 18+), gender (M/F), and activity status (active / less-active / inactive / serving-away / not-eligible); sort by name or age
- **Hover Tooltips** — Hover a member name on any calling card to see their other current callings
- **Gender Restrictions** — Positions can be marked men-only or women-only; drops are enforced and badges show the restriction
- **Organization Filters** — Multi-select organization filter pills with vacancy count badges
- **Dashboard** — Summary stats with fill rates, longest-serving members, and per-organization breakdowns
- **Import from LCR** — Import members and callings from LCR PDF exports (see below)
- **Export** — CSV export, full JSON backup/restore, and metadata-only backup/restore that survives a fresh LCR re-import
- **Dark Mode** — System preference detection with manual toggle

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm (included with Node.js)

### Installation

```bash
git clone git@github.com:mike2184/ward-calling-board.git
cd ward-calling-board
npm install
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. You can serve them with any static file server.

## Importing Data from LCR

The app imports member and calling data from PDF reports generated in [Leader and Clerk Resources (LCR)](https://lcr.churchofjesuschrist.org/).

### Recommended: Import Everything from One PDF

LCR can produce a single **Organizations and Callings** PDF that includes the member list, so you no longer need two separate exports. This one file gives the app both your callings and your members.

1. Log in to [LCR](https://lcr.churchofjesuschrist.org/)
2. Navigate to **Callings** > **Organizations and Callings**
3. Click **Print** — a **Print Options** dialog appears
4. In the dialog, select your unit and check **both** **Callings** and **Members** (leave **Ministering** unchecked), then download the PDF

   > This is the same report as the callings-only export; the Print Options dialog is simply where you add the member information to the same PDF.

5. In the app, go to **More** > **Import Data**
6. On the default **Ward PDF** tab, upload the downloaded PDF and click **Preview**
7. Verify the parsed callings and members look correct, then click **Import**

Organizations and positions are read directly from the PDF, so the board reflects your unit exactly — including any renamed classes. Re-import at any time to refresh; existing members are updated rather than duplicated.

> **Tip:** For a clean slate, use **More** > **Reset Data** before importing. Your annotations (proposals, notes, activity status) can be preserved across a re-import via **Backup Metadata** / **Restore Metadata** (see below).

### Alternative: Two Separate PDFs

If you prefer to export callings and members separately, the app still supports it:

- **Members PDF** tab — from **Membership** > **Member Directory**, click **Print**
- **Callings PDF** tab — from **Callings** > **Organizations and Callings**, click **Print** (Callings only)

Import members first, then callings, so the callings import can match members by name.

### Other Import Options

- **LCR JSON Paste** — For advanced users: paste raw JSON from LCR's internal API endpoint
- **CSV Upload** — Import from a CSV file with flexible column mapping

## Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Persistence:** IndexedDB via Dexie.js (all data stays in browser)
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/sortable
- **PDF Parsing:** pdfjs-dist (client-side text extraction)
- **Icons:** Lucide React
- **Dates:** date-fns

## Data Privacy

All data is stored locally in your browser's IndexedDB. Nothing is sent to any server.

## Backup & Restore

Two backup options are available from the **More** menu:

- **Backup Data / Restore Backup** — Full JSON snapshot of everything (members, organizations, positions, callings, proposals). Use this to move all data between browsers or take a point-in-time snapshot.
- **Backup Metadata / Restore Metadata** — Exports only the app-managed fields: proposed changes, member activity status, member notes, and calling notes. Keyed by names rather than IDs, so you can re-import fresh LCR data and then restore your annotations on top. Restore is additive (it never deletes existing data) and reports any members or positions it couldn't match.
