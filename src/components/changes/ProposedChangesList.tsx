import {
  useProposals,
  advanceProposal,
  rewindProposal,
  applyProposal,
  revertProposal,
  applyAllApproved,
  deleteProposal,
  type ProposalWithDetails,
} from "@/hooks/useProposals";
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";

interface Props {
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  applied: "Applied",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  applied: "bg-primary/15 text-primary",
};

const TYPE_LABELS: Record<string, string> = {
  assign: "Assign",
  release: "Release",
  move: "Move",
  create_position: "New Position",
  remove_position: "Remove Position",
};

function nextActionLabel(status: string): string | null {
  if (status === "draft") return "Submit for Approval";
  if (status === "pending_approval") return "Approve";
  return null;
}

function prevActionLabel(status: string): string | null {
  if (status === "pending_approval") return "Back to Draft";
  if (status === "approved") return "Unapprove";
  return null;
}

function ProposalCard({
  proposal,
}: {
  proposal: ProposalWithDetails;
}) {
  const [loading, setLoading] = useState(false);

  const handleAdvance = async () => {
    setLoading(true);
    await advanceProposal(proposal.id);
    setLoading(false);
  };

  const handleRewind = async () => {
    setLoading(true);
    await rewindProposal(proposal.id);
    setLoading(false);
  };

  const handleApply = async () => {
    setLoading(true);
    await applyProposal(proposal.id);
    setLoading(false);
  };

  const handleRevert = async () => {
    setLoading(true);
    await revertProposal(proposal.id);
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    await deleteProposal(proposal.id);
    setLoading(false);
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[proposal.status] ?? ""}`}
          >
            {STATUS_LABELS[proposal.status] ?? proposal.status}
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {TYPE_LABELS[proposal.type] ?? proposal.type}
          </span>
        </div>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      {/* Details */}
      <div className="text-sm">
        {proposal.organizationName && (
          <div className="text-xs text-muted-foreground">
            {proposal.organizationName}
          </div>
        )}
        <div className="font-medium">{proposal.positionName ?? "Unknown Position"}</div>

        {proposal.type === "assign" && (
          <div className="mt-1">
            <span className="text-success">
              ← {proposal.toMemberName ?? "Unknown"}
            </span>
          </div>
        )}

        {proposal.type === "release" && (
          <div className="mt-1">
            <span className="text-vacant">
              → Release {proposal.fromMemberName ?? "Unknown"}
            </span>
          </div>
        )}

        {proposal.type === "move" && (
          <div className="mt-1">
            <span className="text-muted-foreground">
              {proposal.fromMemberName ?? "Unknown"}
            </span>
            <span className="mx-1">→</span>
            <span className="text-success">
              {proposal.toMemberName ?? "Unknown"}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {prevActionLabel(proposal.status) && (
          <button
            onClick={handleRewind}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded border font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {prevActionLabel(proposal.status)}
          </button>
        )}
        {nextActionLabel(proposal.status) && (
          <button
            onClick={handleAdvance}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded border font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {nextActionLabel(proposal.status)}
          </button>
        )}
        {proposal.status === "approved" && (
          <button
            onClick={handleApply}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Apply Now
          </button>
        )}
        {proposal.status === "applied" && (
          <button
            onClick={handleRevert}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}

const ORG_SORT_ORDER = [
  "Bishopric", "Elders Quorum", "Relief Society", "Priests Quorum",
  "Teachers Quorum", "Deacons Quorum", "Young Men", "Young Women",
  "Primary", "Sunday School", "Ward Missionaries", "Ward Activities",
  "Temple & Family History", "Music", "Other Callings",
];

function orgSortKey(name: string): number {
  const i = ORG_SORT_ORDER.indexOf(name);
  return i === -1 ? 999 : i;
}

function SustainingReport({
  releases,
  assignments,
  onClose,
}: {
  releases: ProposalWithDetails[];
  assignments: ProposalWithDetails[];
  onClose: () => void;
}) {
  const today = format(new Date(), "MMMM d, yyyy");
  const [groupBy, setGroupBy] = useState<"type" | "org">("type");

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@media print { body > *:not(#sustaining-report-root) { display: none !important; } }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const POSITION_ORDER: string[] = [
    "bishop", "president", "1st counselor", "first counselor",
    "2nd counselor", "second counselor", "secretary", "executive secretary",
    "assistant secretary", "1st assistant", "2nd assistant", "adviser",
    "teacher", "specialist",
  ];

  function positionSortKey(positionName: string | undefined): number {
    if (!positionName) return 999;
    const lower = positionName.toLowerCase();
    for (let i = 0; i < POSITION_ORDER.length; i++) {
      if (lower.includes(POSITION_ORDER[i])) return i;
    }
    return 999;
  }

  function sortByPosition(items: ProposalWithDetails[]): ProposalWithDetails[] {
    return [...items].sort((a, b) => positionSortKey(a.positionName) - positionSortKey(b.positionName));
  }

  function groupByOrg(items: ProposalWithDetails[]) {
    const map = new Map<string, ProposalWithDetails[]>();
    for (const p of items) {
      const org = p.organizationName ?? "Other";
      if (!map.has(org)) map.set(org, []);
      map.get(org)!.push(p);
    }
    for (const [org, list] of map) map.set(org, sortByPosition(list));
    return new Map([...map.entries()].sort((a, b) => orgSortKey(a[0]) - orgSortKey(b[0])));
  }

  const releasesByOrg = useMemo(() => groupByOrg(releases), [releases]);
  const assignmentsByOrg = useMemo(() => groupByOrg(assignments), [assignments]);

  // By-org view: all orgs that appear in either releases or assignments
  const allOrgs = useMemo(() => {
    const orgs = new Set([...releasesByOrg.keys(), ...assignmentsByOrg.keys()]);
    return [...orgs].sort((a, b) => orgSortKey(a) - orgSortKey(b));
  }, [releasesByOrg, assignmentsByOrg]);

  const hasContent = releases.length > 0 || assignments.length > 0;

  return createPortal(
    <div id="sustaining-report-root" className="fixed inset-0 z-[60] bg-background flex flex-col print:static print:inset-auto print:block">
      {/* Screen-only header bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b print:hidden">
        <h2 className="text-lg font-semibold">Sustaining Report</h2>
        <div className="flex items-center gap-3">
          {/* Group-by toggle */}
          {hasContent && (
            <div className="flex rounded-md border overflow-hidden text-sm">
              <button
                onClick={() => setGroupBy("type")}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  groupBy === "type"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                By Type
              </button>
              <button
                onClick={() => setGroupBy("org")}
                className={`px-3 py-1.5 font-medium transition-colors border-l ${
                  groupBy === "org"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                By Organization
              </button>
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="text-sm px-4 py-2 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded border font-medium hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Printable report content */}
      <div className="flex-1 overflow-auto print:overflow-visible">
        <div className="max-w-2xl mx-auto px-8 py-10 print:max-w-none print:px-0 print:py-0">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Sustaining Report</h1>
            <p className="text-muted-foreground mt-1 print:text-gray-500">{today}</p>
          </div>

          {!hasContent && (
            <p className="text-center text-muted-foreground py-12">
              No proposed changes to report.
            </p>
          )}

          {hasContent && groupBy === "type" && (
            <>
              {releases.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-semibold border-b pb-2 mb-4">Releases</h2>
                  {Array.from(releasesByOrg.entries()).map(([org, items]) => (
                    <div key={org} className="mb-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 print:text-gray-600">
                        {org}
                      </h3>
                      <ul className="space-y-1.5 ml-1">
                        {items.map((p) => (
                          <li key={p.id} className="text-sm">
                            <span className="font-medium">{p.fromMemberName}</span>
                            <span className="text-muted-foreground print:text-gray-500">
                              {" "}&mdash; {p.positionName}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}
              {assignments.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-semibold border-b pb-2 mb-4">New Callings</h2>
                  {Array.from(assignmentsByOrg.entries()).map(([org, items]) => (
                    <div key={org} className="mb-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 print:text-gray-600">
                        {org}
                      </h3>
                      <ul className="space-y-1.5 ml-1">
                        {items.map((p) => (
                          <li key={p.id} className="text-sm">
                            <span className="font-medium">{p.toMemberName}</span>
                            <span className="text-muted-foreground print:text-gray-500">
                              {" "}&mdash; {p.positionName}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}

          {hasContent && groupBy === "org" && (
            <>
              {allOrgs.map((org) => {
                const orgReleases = releasesByOrg.get(org) ?? [];
                const orgAssignments = assignmentsByOrg.get(org) ?? [];
                return (
                  <section key={org} className="mb-8">
                    <h2 className="text-lg font-semibold border-b pb-2 mb-4">{org}</h2>
                    {orgReleases.length > 0 && (
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 print:text-gray-600">
                          Releases
                        </h3>
                        <ul className="space-y-1.5 ml-1">
                          {orgReleases.map((p) => (
                            <li key={p.id} className="text-sm">
                              <span className="font-medium">{p.fromMemberName}</span>
                              <span className="text-muted-foreground print:text-gray-500">
                                {" "}&mdash; {p.positionName}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {orgAssignments.length > 0 && (
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 print:text-gray-600">
                          New Callings
                        </h3>
                        <ul className="space-y-1.5 ml-1">
                          {orgAssignments.map((p) => (
                            <li key={p.id} className="text-sm">
                              <span className="font-medium">{p.toMemberName}</span>
                              <span className="text-muted-foreground print:text-gray-500">
                                {" "}&mdash; {p.positionName}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ProposedChangesList({ onClose }: Props) {
  const proposals = useProposals();
  const [showReport, setShowReport] = useState(false);

  const approvedCount =
    proposals?.filter((p) => p.status === "approved").length ?? 0;

  const handleApplyAll = async () => {
    const count = await applyAllApproved();
    if (count > 0) {
      // Applied successfully - proposals will be removed from the list reactively
    }
  };

  if (!proposals) return null;

  // Group for the report view (all non-applied proposals)
  const releases = proposals.filter((p) => p.type === "release" && p.status !== "applied");
  const assignments = proposals.filter((p) => (p.type === "assign" || p.type === "move") && p.status !== "applied");

  return (
    <>
      {showReport && (
        <SustainingReport
          releases={releases}
          assignments={assignments}
          onClose={() => setShowReport(false)}
        />
      )}

      <div className="fixed inset-0 bg-black/50 flex justify-end z-50 print:hidden">
        <div className="bg-background w-full max-w-md h-full flex flex-col shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Proposed Changes</h2>
              <p className="text-xs text-muted-foreground">
                {proposals.length} pending
                {approvedCount > 0 && ` · ${approvedCount} ready to apply`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* Actions bar */}
          {proposals.length > 0 && (
            <div className="flex items-center gap-2 px-5 py-2 border-b">
              {approvedCount > 0 && (
                <button
                  onClick={handleApplyAll}
                  className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Apply All Approved ({approvedCount})
                </button>
              )}
              <button
                onClick={() => setShowReport(true)}
                className="text-xs px-3 py-1.5 rounded border font-medium hover:bg-muted transition-colors"
              >
                Sustaining Report
              </button>
              <button
                onClick={async () => {
                  for (const p of proposals) {
                    await deleteProposal(p.id);
                  }
                }}
                className="text-xs px-3 py-1.5 rounded border font-medium text-destructive hover:bg-destructive/10 transition-colors ml-auto"
              >
                Remove All
              </button>
            </div>
          )}

          {/* Proposals list */}
          <div className="flex-1 overflow-auto p-5 space-y-3">
            {proposals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <p>No proposed changes yet.</p>
                <p className="mt-1 text-xs">
                  Drag members onto vacant slots in the board view to create proposals.
                </p>
              </div>
            ) : (
              proposals.map((p) => <ProposalCard key={p.id} proposal={p} />)
            )}
          </div>
        </div>
      </div>
    </>
  );
}
