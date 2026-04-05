import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatServingDurationShort } from "@/utils/time";
import type { CallingWithDetails } from "@/hooks/useCallings";
import type { CallingProposal } from "@/hooks/useProposals";
import { createReleaseProposal, deleteProposal } from "@/hooks/useProposals";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  approved: "Approved",
};

interface Props {
  item: CallingWithDetails;
  isDragOverlay?: boolean;
  proposals?: CallingProposal[];
}

export function CallingCard({ item, isDragOverlay, proposals }: Props) {
  const isVacant = item.calling.status === "vacant";
  const hasProposals = !!proposals && proposals.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.calling.id,
    data: {
      type: "calling",
      calling: item,
    },
    disabled: isVacant || hasProposals,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleRelease = async () => {
    if (!item.calling.memberId) return;
    await createReleaseProposal(item.calling.id, item.calling.memberId);
  };

  if (isDragOverlay) {
    return (
      <div className="bg-background border-2 border-primary rounded-lg p-3 shadow-lg w-56">
        <CardContent item={item} isVacant={isVacant} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg p-3 border-l-4 transition-colors ${
        hasProposals
          ? "bg-warning/5 border-l-warning border border-warning/30 shadow-sm cursor-default"
          : isVacant
            ? "bg-vacant/5 border-l-vacant border border-dashed border-border cursor-default"
            : "bg-background border-l-success border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md"
      }`}
    >
      <CardContent
        item={item}
        isVacant={isVacant}
        proposals={proposals}
        onRelease={!isVacant && !hasProposals ? handleRelease : undefined}
      />
    </div>
  );
}

function CardContent({
  item,
  isVacant,
  proposals,
  onRelease,
}: {
  item: CallingWithDetails;
  isVacant: boolean;
  proposals?: CallingProposal[];
  onRelease?: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {item.position.positionName}
        </div>
        {onRelease && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRelease();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors flex-shrink-0"
          >
            Release
          </button>
        )}
      </div>
      {isVacant ? (
        <div className="text-sm text-vacant italic">Vacant</div>
      ) : (
        <>
          <div className="text-sm font-medium">{item.member?.fullName}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatServingDurationShort(item.calling.activeDate)}
          </div>
        </>
      )}
      {proposals && proposals.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-warning/30 space-y-1">
          {proposals.map((proposal, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">
                {STATUS_LABEL[proposal.status] ?? proposal.status}
              </span>
              <span className="text-xs text-warning flex-1">
                {proposal.type === "release" && "Release"}
                {proposal.type === "assign" && `← ${proposal.toMemberName}`}
                {proposal.type === "move" && `→ ${proposal.toMemberName}`}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  deleteProposal(proposal.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function VacantDropTarget({
  positionName,
  isOver,
  proposals,
}: {
  positionName: string;
  isOver: boolean;
  proposals?: CallingProposal[];
}) {
  if (proposals && proposals.length > 0) {
    const assignProposal = proposals.find((p) => p.type === "assign");
    return (
      <div className="rounded-lg p-3 border-l-4 border-l-warning border border-warning/30 bg-warning/5 transition-colors">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {positionName}
        </div>
        {assignProposal && (
          <div className="text-sm font-medium text-warning">
            {assignProposal.toMemberName ?? "Unknown"}
          </div>
        )}
        <div className="space-y-1 mt-1">
          {proposals.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">
                {STATUS_LABEL[p.status] ?? p.status}
              </span>
              <span className="text-xs text-muted-foreground flex-1">
                {p.type === "assign" ? "Proposed" : p.type}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  deleteProposal(p.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-3 border-2 border-dashed transition-colors ${
        isOver
          ? "border-primary bg-primary/10"
          : "border-border bg-muted/20"
      }`}
    >
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        {positionName}
      </div>
      <div className={`text-sm italic ${isOver ? "text-primary" : "text-vacant"}`}>
        {isOver ? "Drop to assign" : "Vacant"}
      </div>
    </div>
  );
}
