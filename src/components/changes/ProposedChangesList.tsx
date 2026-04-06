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
import { useState } from "react";

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
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
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
              onClick={() => setShowReport(!showReport)}
              className="text-xs px-3 py-1.5 rounded border font-medium hover:bg-muted transition-colors"
            >
              {showReport ? "Hide Report" : "Sustaining Report"}
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

        {/* Sustaining Report */}
        {showReport && (releases.length > 0 || assignments.length > 0) && (
          <div className="px-5 py-3 border-b bg-muted/30 text-sm space-y-3 print:bg-white">
            <h3 className="font-semibold">Sustaining Report (Approved)</h3>

            {releases.length > 0 && (
              <div>
                <h4 className="font-medium text-xs uppercase text-muted-foreground mb-1">
                  Releases
                </h4>
                {releases.map((p) => (
                  <div key={p.id} className="py-0.5">
                    <span className="font-medium">{p.fromMemberName}</span>
                    <span className="text-muted-foreground">
                      {" "}as {p.positionName}
                      {p.organizationName && `, ${p.organizationName}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {assignments.length > 0 && (
              <div>
                <h4 className="font-medium text-xs uppercase text-muted-foreground mb-1">
                  New Callings
                </h4>
                {assignments.map((p) => (
                  <div key={p.id} className="py-0.5">
                    <span className="font-medium">{p.toMemberName}</span>
                    <span className="text-muted-foreground">
                      {" "}as {p.positionName}
                      {p.organizationName && `, ${p.organizationName}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => window.print()}
              className="text-xs px-3 py-1.5 rounded border font-medium hover:bg-muted transition-colors mt-2"
            >
              Print Report
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
  );
}
