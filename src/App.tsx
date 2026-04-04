import { useState, useEffect } from "react";
import { CallingList } from "@/components/board/CallingList";
import { BoardView } from "@/components/board/BoardView";
import { MemberSidebar } from "@/components/members/MemberSidebar";
import { OrganizationFilter } from "@/components/filters/OrganizationFilter";
import { ImportWizard } from "@/components/import/ImportWizard";
import { ProposedChangesList } from "@/components/changes/ProposedChangesList";
import { seedDefaultData, clearAllData } from "@/data/import-service";
import { useProposalCount } from "@/hooks/useProposals";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/data/db";

type ViewMode = "list" | "board";

function App() {
  const [showImport, setShowImport] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [showVacantOnly, setShowVacantOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  const memberCount = useLiveQuery(() => db.members.count());
  const callingCount = useLiveQuery(() => db.callings.count());
  const proposalCount = useProposalCount();

  // Seed default data on first load
  useEffect(() => {
    seedDefaultData();
  }, []);

  const handleReset = async () => {
    await clearAllData();
    await seedDefaultData();
    setShowResetConfirm(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            Ward Callings Manager
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{memberCount ?? 0} members</span>
            <span>&middot;</span>
            <span>{callingCount ?? 0} callings</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "board"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              List
            </button>
          </div>

          {/* Changes button with badge */}
          <button
            onClick={() => setShowChanges(true)}
            className="relative px-3 py-1.5 text-sm font-medium rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Changes
            {(proposalCount ?? 0) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {proposalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Reset Data
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Import Data
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b px-6 py-3 flex-shrink-0">
        <OrganizationFilter
          selected={selectedOrg}
          onSelect={setSelectedOrg}
          showVacantOnly={showVacantOnly}
          onToggleVacant={() => setShowVacantOnly(!showVacantOnly)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Main content */}
      {viewMode === "board" ? (
        <BoardView
          organizationFilter={selectedOrg}
          showVacantOnly={showVacantOnly}
          searchQuery={searchQuery}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 min-w-0 overflow-auto p-6">
            <CallingList
              organizationFilter={selectedOrg}
              showVacantOnly={showVacantOnly}
              searchQuery={searchQuery}
            />
          </main>
          <MemberSidebar isBoardView={false} />
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportWizard onClose={() => setShowImport(false)} />
      )}

      {/* Changes drawer */}
      {showChanges && (
        <ProposedChangesList onClose={() => setShowChanges(false)} />
      )}

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl p-6 max-w-sm">
            <h3 className="font-semibold mb-2">Reset All Data?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will delete all imported callings and members, and restore
              the default organization structure. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
