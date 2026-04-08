import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import PhaseCard from "./PhaseCard";

interface Props {
  id: string;
  phase: any;
  canManage: boolean;
  canDelete?: boolean;
  canCreateItems?: boolean;
  canCompleteItems?: boolean;
  isLocked?: boolean;
  maxFiles?: number;
  allowedExtensions?: string[];
  searchTerm?: string;
  onEdit: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
  isDragDisabled?: boolean;
}

export default function SortablePhaseCard({ id, isDragDisabled, ...props }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex gap-1 items-start">
        {!isDragDisabled && (
          <button
            className="mt-3 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 shrink-0 touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <PhaseCard {...props} phase={props.phase} />
        </div>
      </div>
    </div>
  );
}
