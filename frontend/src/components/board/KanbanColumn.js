import { useDroppable, useDraggable } from "@dnd-kit/core";
import useJobStore from "@/store/jobStore";
import JobCard from "./JobCard";

function DraggableCard({ job }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: job.id });
  const selectJob = useJobStore((state) => state.selectJob);
  const selectedJobId = useJobStore((state) => state.selectedJobId);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.35 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: isDragging ? 100 : "auto",
      }}
      {...attributes}
      {...listeners}
      onClick={() => selectJob(job.id)}
    >
      <JobCard job={job} isSelected={selectedJobId === job.id} />
    </div>
  );
}

export default function KanbanColumn({ column, jobs }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${column.id}`}
      style={{
        width: 215,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        transition: "background 0.2s, padding 0.2s",
        borderRadius: 12,
        background: isOver ? "rgba(43,63,191,0.04)" : "transparent",
        minHeight: 0,
        height: "100%",
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 4px 12px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: column.color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "rgba(26,31,60,0.4)",
          }}
        >
          {column.label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(26,31,60,0.25)",
          }}
        >
          {jobs.length}
        </span>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
          overflowY: "auto",
          paddingRight: 2,
          paddingBottom: 20,
          minHeight: 80,
        }}
      >
        {jobs.map((job) => (
          <DraggableCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
