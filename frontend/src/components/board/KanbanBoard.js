import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { DndContext, DragOverlay, rectIntersection, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal } from "lucide-react";
import useJobStore from "@/store/jobStore";
import JobCard from "./JobCard";

const COLUMNS = [
  { id: "wishlist", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "in_progress", label: "In Progress" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Ghosted" },
];

function CardContextMenu({ jobId, currentStatus, onClose }) {
  const moveJob = useJobStore((s) => s.moveJob);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [onClose]);
  return (
    <div ref={ref} data-testid={`context-menu-${jobId}`} style={{ position: "absolute", top: 4, right: 4, zIndex: 50, background: "#FFFFFF", borderRadius: 10, border: "1px solid #E5E0D8", padding: "4px 0", minWidth: 140 }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B8B7A", padding: "4px 12px" }}>Move to</div>
      {COLUMNS.filter((c) => c.id !== currentStatus).map((c) => (
        <button key={c.id} data-testid={`move-to-${c.id}`} onClick={(e) => { e.stopPropagation(); moveJob(jobId, c.id); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 12px", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 400, color: "#1C1917", textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#F7F5F0")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>{c.label}</button>
      ))}
    </div>
  );
}

function SortableJobCard({ id, status }) {
  const job = useJobStore((s) => s.jobs.find((j) => j.id === id));
  const selectedJobId = useJobStore((s) => s.selectedJobId);
  const selectJob = useJobStore((s) => s.selectJob);
  const [showMenu, setShowMenu] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1, cursor: isDragging ? "grabbing" : "grab", position: "relative" };
  if (!job) return null;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => selectJob(id)}>
      <JobCard job={job} isSelected={selectedJobId === id} />
      <button data-testid={`card-menu-${id}`} onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.8)", border: "none", borderRadius: 4, cursor: "pointer", padding: "2px 3px", color: "#9B8B7A", opacity: 0, transition: "opacity 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}><MoreHorizontal size={12} /></button>
      {showMenu && <CardContextMenu jobId={id} currentStatus={status} onClose={() => setShowMenu(false)} />}
    </div>
  );
}

function DroppableColumn({ column, jobIds }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div ref={setNodeRef} data-testid={`column-${column.id}`} style={{ width: 215, flexShrink: 0, display: "flex", flexDirection: "column", borderRadius: 10, background: isOver ? "#F0EDE6" : "#F7F5F0", minHeight: 0, height: "100%", padding: "0 4px", transition: "background 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 8px 10px", flexShrink: 0 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9B8B7A" }}>{column.label}</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 400, color: "#9B8B7A" }}>{jobIds.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: "auto", paddingRight: 2, paddingBottom: 20, minHeight: "100%" }}>
        <SortableContext items={jobIds} strategy={verticalListSortingStrategy}>
          {jobIds.map((id) => <SortableJobCard key={id} id={id} status={column.id} />)}
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
  const baseColumns = useMemo(() => { const c = {}; COLUMNS.forEach((col) => { c[col.id] = []; }); jobs.forEach((j) => { if (c[j.status]) c[j.status].push(j.id); }); return c; }, [jobs]);
  const columns = dragColumns || baseColumns;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const findContainer = useCallback((id) => { if (columns[id]) return id; return Object.keys(columns).find((key) => columns[key].includes(id)); }, [columns]);

  const handleDragStart = (e) => { setActiveId(e.active.id); setDragColumns({ ...baseColumns }); };
  const handleDragOver = (e) => {
    const { active, over } = e; if (!over) return;
    const ac = findContainer(active.id); let oc = findContainer(over.id);
    if (!oc && COLUMNS.some((c) => c.id === over.id)) oc = over.id;
    if (!ac || !oc || ac === oc) return;
    setDragColumns((p) => { if (!p) return p; const ai = [...(p[ac] || [])]; const oi = [...(p[oc] || [])]; const idx = ai.indexOf(active.id); if (idx === -1) return p; ai.splice(idx, 1); const oIdx = oi.indexOf(over.id); oi.splice(oIdx >= 0 ? oIdx : oi.length, 0, active.id); return { ...p, [ac]: ai, [oc]: oi }; });
  };
  const handleDragEnd = (e) => {
    const { active, over } = e; const dc = dragColumns; setActiveId(null); setDragColumns(null); if (!over || !dc) return;
    const ac = (() => { if (dc[active.id]) return active.id; return Object.keys(dc).find((k) => dc[k].includes(active.id)); })();
    const job = jobs.find((j) => j.id === active.id);
    if (job && ac && job.status !== ac) moveJob(active.id, ac);
  };

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;
  return (
    <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div data-testid="kanban-board" style={{ display: "flex", gap: 10, padding: "16px 20px", overflowX: "auto", overflowY: "hidden", height: "100%", alignItems: "flex-start" }}>
        {COLUMNS.map((col) => <DroppableColumn key={col.id} column={col} jobIds={columns[col.id] || []} />)}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeJob ? <div style={{ opacity: 0.9, transform: "rotate(2deg)", width: 215 }}><JobCard job={activeJob} /></div> : null}
      </DragOverlay>
    </DndContext>
  );
}
