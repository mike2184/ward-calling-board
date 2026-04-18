import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatServingDurationShort } from "@/utils/time";
import type { CallingWithDetails } from "@/hooks/useCallings";
import type { CallingProposal } from "@/hooks/useProposals";
import { createReleaseProposal, deleteProposal } from "@/hooks/useProposals";
import { NotesButton } from "./NotesButton";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  approved: "Approved",
};

function GenderBadge({ restriction }: { restriction?: "M" | "F" }) {
  if (!restriction) return null;
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 inline-block ${
        restriction === "M" ? "bg-blue-400" : "bg-pink-400"
      }`}
      title={restriction === "M" ? "Men only" : "Women only"}
    />
  );
}

/** Sort proposals so releases come before assigns/moves */
function sortProposals(proposals: CallingProposal[]): CallingProposal[] {
  return [...proposals].sort((a, b) => {
    if (a.type === "release" && b.type !== "release") return -1;
    if (a.type !== "release" && b.type === "release") return 1;
    return 0;
  });
}

/**
 * Hover tooltip that shows a member's current callings.
 * Uses a portal to escape overflow containers.
 */
function MemberCallingTooltip({
  memberId,
  memberCallingsMap,
  children,
}: {
  memberId?: string;
  memberCallingsMap?: Map<string, string[]>;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, flipUp: false });
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  const callings = memberId ? (memberCallingsMap?.get(memberId) ?? []) : undefined;

  const showTooltip = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const estimatedHeight = 20 + (callings?.length ?? 1) * 18 + 16;
      const spaceBelow = window.innerHeight - rect.bottom - 4;
      const flipUp = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
      setPos({
        top: flipUp ? rect.top : rect.bottom + 4,
        left: rect.left,
        flipUp,
      });
    }
    setHovered(true);
  };

  // Re-adjust position after tooltip renders to use actual height
  useEffect(() => {
    if (hovered && tooltipRef.current && ref.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const triggerRect = ref.current.getBoundingClientRect();
      if (tooltipRect.bottom > window.innerHeight) {
        // Flip above
        setPos({
          top: triggerRect.top,
          left: triggerRect.left,
          flipUp: true,
        });
      }
    }
  }, [hovered]);

  const hideTooltip = () => {
    hideTimeout.current = setTimeout(() => setHovered(false), 100);
  };

  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  if (callings === undefined) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="cursor-default"
      >
        {children}
      </span>
      {hovered &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={() => {
              if (hideTimeout.current) clearTimeout(hideTimeout.current);
            }}
            onMouseLeave={hideTooltip}
            className="fixed z-[9999] bg-popover border rounded-md shadow-lg py-2 px-3 max-w-[260px]"
            style={{
              left: Math.max(8, pos.left),
              ...(pos.flipUp
                ? { bottom: window.innerHeight - pos.top + 4 }
                : { top: pos.top }),
            }}
          >
            {callings.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No current callings</div>
            ) : (
            <><div className="text-xs font-medium text-muted-foreground mb-1">
              {callings.length} Calling{callings.length !== 1 ? "s" : ""}
            </div>
            <ul className="space-y-0.5">
              {callings.map((name, i) => (
                <li key={i} className="text-xs text-foreground">
                  {name}
                </li>
              ))}
            </ul></>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

interface Props {
  item: CallingWithDetails;
  isDragOverlay?: boolean;
  proposals?: CallingProposal[];
  memberCallingsMap?: Map<string, string[]>;
}

export function CallingCard({ item, isDragOverlay, proposals, memberCallingsMap }: Props) {
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
        memberCallingsMap={memberCallingsMap}
        onRelease={!isVacant && !hasProposals ? handleRelease : undefined}
      />
    </div>
  );
}

function ProposalLine({
  proposal,
  memberCallingsMap,
}: {
  proposal: CallingProposal;
  memberCallingsMap?: Map<string, string[]>;
}) {
  const isRelease = proposal.type === "release";
  const pillColor = isRelease ? "bg-vacant/15 text-vacant" : "bg-success/15 text-success";
  const textColor = isRelease ? "text-vacant" : "text-success";

  const memberId = isRelease ? proposal.fromMemberId : proposal.toMemberId;
  const memberName = isRelease ? proposal.fromMemberName : proposal.toMemberName;
  const actionLabel = proposal.type === "release"
    ? "Release"
    : proposal.type === "assign"
      ? "Assign"
      : "Move";

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${pillColor} flex-shrink-0`}>
        {STATUS_LABEL[proposal.status] ?? proposal.status}
      </span>
      <span className={`text-xs ${textColor} flex-1 truncate`}>
        {actionLabel}{" "}
        <MemberCallingTooltip memberId={memberId} memberCallingsMap={memberCallingsMap}>
          <span className="underline decoration-dotted">{memberName ?? ""}</span>
        </MemberCallingTooltip>
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          deleteProposal(proposal.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

function CardContent({
  item,
  isVacant,
  proposals,
  memberCallingsMap,
  onRelease,
}: {
  item: CallingWithDetails;
  isVacant: boolean;
  proposals?: CallingProposal[];
  memberCallingsMap?: Map<string, string[]>;
  onRelease?: () => void;
}) {
  const hasProposals = !!proposals && proposals.length > 0;
  const hasReleaseProposal = hasProposals && proposals.some((p) => p.type === "release");
  const sorted = hasProposals ? sortProposals(proposals) : [];

  return (
    <>
      <div className="flex items-start justify-between gap-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
          <GenderBadge restriction={item.position.genderRestriction} />
          {item.position.positionName}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasProposals && (
            <NotesButton proposals={proposals!} positionName={item.position.positionName} />
          )}
          {onRelease && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRelease();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              Release
            </button>
          )}
        </div>
      </div>
      {isVacant ? (
        <div className="text-sm text-vacant italic">Vacant</div>
      ) : hasReleaseProposal ? (
        // When there's a release proposal, show the current member de-emphasized
        <div className="text-sm text-muted-foreground line-through">
          <MemberCallingTooltip memberId={item.member?.id} memberCallingsMap={memberCallingsMap}>
            {item.member?.fullName}
          </MemberCallingTooltip>
        </div>
      ) : (
        <>
          <div className="text-sm font-medium">
            <MemberCallingTooltip memberId={item.member?.id} memberCallingsMap={memberCallingsMap}>
              {item.member?.fullName}
            </MemberCallingTooltip>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatServingDurationShort(item.calling.activeDate)}
          </div>
        </>
      )}
      {hasProposals && (
        <div className="mt-1.5 pt-1.5 border-t border-warning/30 space-y-1">
          {sorted.map((proposal, i) => (
            <ProposalLine key={i} proposal={proposal} memberCallingsMap={memberCallingsMap} />
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
  memberCallingsMap,
  genderRestriction,
}: {
  positionName: string;
  isOver: boolean;
  proposals?: CallingProposal[];
  memberCallingsMap?: Map<string, string[]>;
  genderRestriction?: "M" | "F";
}) {
  if (proposals && proposals.length > 0) {
    const sorted = sortProposals(proposals);
    return (
      <div className="rounded-lg p-3 border-l-4 border-l-warning border border-warning/30 bg-warning/5 transition-colors">
        <div className="flex items-start justify-between gap-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
            <GenderBadge restriction={genderRestriction} />
            {positionName}
          </div>
          <NotesButton proposals={proposals} positionName={positionName} />
        </div>
        <div className="text-sm text-vacant italic">Vacant</div>
        <div className="mt-1.5 pt-1.5 border-t border-warning/30 space-y-1">
          {sorted.map((p, i) => (
            <ProposalLine key={i} proposal={p} memberCallingsMap={memberCallingsMap} />
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
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
        <GenderBadge restriction={genderRestriction} />
        {positionName}
      </div>
      <div className={`text-sm italic ${isOver ? "text-primary" : "text-vacant"}`}>
        {isOver ? "Drop to assign" : "Vacant"}
      </div>
    </div>
  );
}
