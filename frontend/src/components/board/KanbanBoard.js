import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import useJobStore from "@/store/jobStore";
import KanbanColumn from "./KanbanColumn";
import JobCard from "./JobCard";

const COLUMNS = [
  { id: "wishlist", label: "Wishlist", color: "#9CA3AF" },
  { id: "applied", label: "Applied", color: "#60A5FA" },
  { id: "interview", label: "Interview", color: "#FCD34D" },
  { id: "in_progress", label: "In Progress", color: "#F97316" },
  { id: "offer", label: "Offer", color: "#34D399" },
  { id: "rejected", label: "Rejected", color: "#FCA5A5" },
];

export default function KanbanBoard() {
  const [activeId, setActiveId] = useState(null);
  const jobs = useJobStore((state) => state.jobs);
  const moveJob = useJobStore((state) => state.moveJob);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = () => {};

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over) {
      const overId = over.id;
      const isColumn = COLUMNS.some((c) => c.id === overId);
      if (isColumn) {
        const currentJob = jobs.find((j) => j.id === active.id);
        if (currentJob && currentJob.status !== overId) {
          moveJob(active.id, overId);
        }
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        data-testid="kanban-board"
        style={{
          display: "flex",
          gap: 14,
          padding: "20px 24px",
          overflowX: "auto",
          overflowY: "hidden",
          height: "100%",
          alignItems: "flex-start",
        }}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            jobs={jobs.filter((j) => j.status === col.id)}
          />
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
