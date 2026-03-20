import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  DndContext, DragOverlay, rectIntersection,
  PointerSensor, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal } from "lucide-react";
import useJobStore from "@/store/jobStore";
import JobCard from "./JobCard";

const COLUMNS = [
  { id: "wishlist", label: "Wishlist", color: "#9CA3AF" },
  { id: "applied", label: "Applied", color: "#60A5FA" },
  { id: "interview", label: "Interview", color: "#FCD34D" },
  { id: "in_progress", label: "In Progress", color: "#F97316" },
  { id: "offer", label: "Offer", color: "#34D399" },
  { id: "rejected", label: "Rejected", color: "#FCA5A5" },
];

/* Context menu for moving cards */
function CardContextMenu({ jobId, currentStatus, onClose }) {
  const moveJob = useJobStore((s) => s.moveJob);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} data-testid={`context-menu-${jobId}`} style={{
      position: "absolute", top: 4, right: 4, zIndex: 50,
      background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
      borderRadius: 10, border: "1px solid rgba(43,63,191,0.12)",
      boxShadow: "0 4px 16px rgba(43,63,191,0.12)", padding: "4px 0", minWidth: 140,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(43,63,191,0.4)", padding: "4px 12px" }}>Move to</div>
      {COLUMNS.filter((c) => c.id !== currentStatus).map((c) => (
        <button
          key={c.id}
          data-testid={`move-to-${c.id}`}
          onClick={(e) => { e.stopPropagation(); moveJob(jobId, c.id); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "6px 12px", background: "none", border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 500, color: "#1a1f3c", textAlign: "left",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(43,63,191,0.04)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} />
          {c.label}
        </button>
      ))}
    </div>
  );
}

function SortableJobCard({ id, status }) {
  const job = useJobStore((s) => s.jobs.find((j) => j.id === id));
  const selectedJobId = useJobStore((s) => s.selectedJobId);
  const selectJob = useJobStore((s) => s.selectJob);
  const [showMenu, setShowMenu] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 100 : "auto",
    position: "relative",
  };

  if (!job) return null;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => selectJob(id)}>
      <JobCard job={job} isSelected={selectedJobId === id} />
      <button
        data-testid={`card-menu-${id}`}
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        style={{
          position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.80)",
          border: "none", borderRadius: 4, cursor: "pointer", padding: "2px 3px",
          color: "#8892b0", opacity: 0, transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <MoreHorizontal size={12} />
      </button>
      {showMenu && <CardContextMenu jobId={id} currentStatus={status} onClose={() => setShowMenu(false)} />}
    </div>
  );
}

function DroppableColumn({ column, jobIds }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${column.id}`}
      style={{
        width: 215, flexShrink: 0, display: "flex", flexDirection: "column",
        transition: "background 0.2s", borderRadius: 12,
        background: isOver ? "rgba(43,63,191,0.06)" : "transparent",
        minHeight: 0, height: "100%", padding: "0 4px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px 12px", flexShrink: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: column.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(26,31,60,0.4)" }}>
          {column.label}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(26,31,60,0.25)" }}>
          {jobIds.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto", paddingRight: 2, paddingBottom: 20, minHeight: "100%" }}>
        <SortableContext items={jobIds} strategy={verticalListSortingStrategy}>
          {jobIds.map((id) => (
            <SortableJobCard key={id} id={id} status={column.id} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const jobs = useJobStore((s) => s.jobs);
  const moveJob = useJobStore((s) => s.moveJob);
  const [activeId, setActiveId] = useState(null);
  const [dragColumns, setDragColumns] = useState(null);

  const baseColumns = useMemo(() => {
    const cols = {};
    COLUMNS.forEach((c) => { cols[c.id] = []; });
    jobs.forEach((j) => { if (cols[j.status]) cols[j.status].push(j.id); });
    return cols;
  }, [jobs]);

  const columns = dragColumns || baseColumns;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const findContainer = useCallback(
    (id) => {
      if (columns[id]) return id;
      return Object.keys(columns).find((key) => columns[key].includes(id));
    },
    [columns]
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setDragColumns({ ...baseColumns });
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id);
    let overContainer = findContainer(over.id);
    if (!overContainer && COLUMNS.some((c) => c.id === over.id)) overContainer = over.id;
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setDragColumns((prev) => {
      if (!prev) return prev;
      const activeItems = [...(prev[activeContainer] || [])];
      const overItems = [...(prev[overContainer] || [])];
      const activeIndex = activeItems.indexOf(active.id);
      if (activeIndex === -1) return prev;
      activeItems.splice(activeIndex, 1);

      const overIndex = overItems.indexOf(over.id);
      overItems.splice(overIndex >= 0 ? overIndex : overItems.length, 0, active.id);

      return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems };
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    const currentDragCols = dragColumns;
    setActiveId(null);
    setDragColumns(null);
    if (!over || !currentDragCols) return;

    const activeContainer = (() => {
      if (currentDragCols[active.id]) return active.id;
      return Object.keys(currentDragCols).find((key) => currentDragCols[key].includes(active.id));
    })();

    const job = jobs.find((j) => j.id === active.id);
    if (job && activeContainer && job.status !== activeContainer) {
      moveJob(active.id, activeContainer);
    }
  };

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        data-testid="kanban-board"
        style={{
          display: "flex", gap: 14, padding: "20px 20px",
          overflowX: "auto", overflowY: "hidden",
          height: "100%", alignItems: "flex-start",
        }}
      >
        {COLUMNS.map((col) => (
          <DroppableColumn key={col.id} column={col} jobIds={columns[col.id] || []} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeJob ? (
          <div style={{ opacity: 0.9, transform: "rotate(2deg)", width: 215 }}>
            <JobCard job={activeJob} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
