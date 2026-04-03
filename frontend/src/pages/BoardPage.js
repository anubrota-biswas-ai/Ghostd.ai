import KanbanBoard from "@/components/board/KanbanBoard";
import useJobStore from "@/store/jobStore";

export default function BoardPage() {
  const loading = useJobStore((s) => s.loading);
  const jobs = useJobStore((s) => s.jobs);

  if (loading) {
    return (
      <div style={{ display: "flex", gap: 10, padding: "16px 20px", height: "100%" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ width: 215, flexShrink: 0 }}>
            <div style={{ height: 16, background: "#E5E0D8", borderRadius: 6, marginBottom: 12, width: 80 }} />
            {Array.from({ length: i < 3 ? 2 : 1 }).map((_, j) => (
              <div key={j} style={{ background: "#FFFFFF", border: "1px solid #E5E0D8", borderRadius: 10, height: 120, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, color: "#1C1917", letterSpacing: "-0.02em", marginBottom: 8 }}>
            Nothing here yet.
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#9B8B7A", lineHeight: 1.6 }}>
            The market won't fix itself. Add your first application to start tracking.
          </p>
        </div>
      </div>
    );
  }

  return <KanbanBoard />;
}
