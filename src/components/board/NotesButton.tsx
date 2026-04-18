import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, MessageSquareText } from "lucide-react";
import {
  updateProposalNotes,
  type CallingProposal,
} from "@/hooks/useProposals";

/**
 * Picks which proposal on a calling card should carry the note.
 * Prefer the assign/move proposal; fall back to release.
 */
export function pickNoteProposal(
  proposals: CallingProposal[]
): CallingProposal | undefined {
  if (proposals.length === 0) return undefined;
  return (
    proposals.find((p) => p.type === "assign" || p.type === "move") ??
    proposals[0]
  );
}

export function NotesButton({
  proposals,
  positionName,
}: {
  proposals: CallingProposal[];
  positionName: string;
}) {
  const target = pickNoteProposal(proposals);
  const existingNote = proposals.find((p) => p.reason && p.reason.trim())?.reason ?? "";
  const hasNote = existingNote.length > 0;

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });

  const showTip = () => {
    if (!hasNote) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setTipPos({ top: r.bottom + 4, left: r.right });
    }
    setHovered(true);
  };

  if (!target) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseEnter={showTip}
        onMouseLeave={() => setHovered(false)}
        title={hasNote ? "Edit note" : "Add note"}
        className={`flex-shrink-0 transition-colors ${
          hasNote
            ? "text-primary hover:text-primary/80"
            : "text-muted-foreground/30 hover:text-muted-foreground"
        }`}
      >
        {hasNote ? (
          <MessageSquareText className="w-3.5 h-3.5" />
        ) : (
          <MessageSquare className="w-3.5 h-3.5" />
        )}
      </button>
      {hovered && hasNote &&
        createPortal(
          <div
            className="fixed z-[9999] bg-popover border rounded-md shadow-lg py-2 px-3 max-w-[280px] text-xs whitespace-pre-wrap pointer-events-none"
            style={{
              top: tipPos.top,
              left: Math.max(8, Math.min(tipPos.left - 280, window.innerWidth - 288)),
            }}
          >
            {existingNote}
          </div>,
          document.body
        )}
      {open && (
        <NotesDialog
          proposalId={target.id}
          initialValue={existingNote}
          positionName={positionName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function NotesDialog({
  proposalId,
  initialValue,
  positionName,
  onClose,
}: {
  proposalId: string;
  initialValue: string;
  positionName: string;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    await updateProposalNotes(proposalId, value);
    setSaving(false);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg shadow-xl w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-1">Notes</h3>
        <p className="text-xs text-muted-foreground mb-3">{positionName}</p>
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a note about this proposed change..."
          className="w-full min-h-[120px] text-sm rounded border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-sm px-3 py-1.5 rounded border font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
