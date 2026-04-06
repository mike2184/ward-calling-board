# Ward Calling Board

A local-first web application for managing ward callings in The Church of Jesus Christ of Latter-day Saints. All data stays in your browser using IndexedDB — no backend, no accounts, no data leaves your machine.

![Board View](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-blue)

## Features

- **Kanban Board View** — Visual board with organization columns and calling cards showing fill status, serving duration, and proposed changes
- **List View** — Traditional table view of all callings grouped by organization
- **Drag-and-Drop** — Drag members onto vacant slots to propose assignments, or onto filled callings to propose replacements
- **Proposed Changes Workflow** — Draft → Submit for Approval → Approve → Apply, with sustaining report generation
- **Member Sidebar** — Filter members by age group (0-10, 11-17, 18+), gender (M/F), and sort by name or age
- **Organization Filters** — Multi-select organization filter pills with vacancy count badges
- **Dashboard** — Summary stats with fill rates, longest-serving members, and per-organization breakdowns
- **Import from LCR** — Import members and callings from LCR PDF exports (see below)
- **Export** — CSV export and full JSON backup/restore
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

The app supports importing member and calling data from PDF reports generated in [Leader and Clerk Resources (LCR)](https://lcr.churchofjesuschrist.org/).

### Step 1: Import All Members

This imports every member in your ward with their name, gender, age, phone number, and email address.

1. Log in to [LCR](https://lcr.churchofjesuschrist.org/)
2. Navigate to **Membership** > **Member Directory**
3. Click **Print** to download the PDF
4. In the app, go to **More** > **Import Data**
5. Select the **Members PDF** tab
6. Upload the downloaded PDF and click **Preview**
7. Verify the parsed data looks correct, then click **Import**

### Step 2: Import Callings

This imports all current callings and assignments, matching them to the members you already imported.

1. Log in to [LCR](https://lcr.churchofjesuschrist.org/)
2. Navigate to **Callings** > **Callings by Organization**
3. Click **Print** to download the PDF
4. In the app, go to **More** > **Import Data**
5. Select the **Callings PDF** tab
6. Upload the downloaded PDF and click **Preview**
7. Verify the parsed data looks correct, then click **Import**

> **Tip:** Import members first, then callings. The callings import will automatically match members by name. You can re-import at any time to update data — existing members will be updated with any new information rather than duplicated.

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

All data is stored locally in your browser's IndexedDB. Nothing is sent to any server. You can back up your data at any time via **More** > **Backup Data** and restore it later with **More** > **Restore Backup**.
