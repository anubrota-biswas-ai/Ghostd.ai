import KanbanBoard from "@/components/board/KanbanBoard";
import useJobStore from "@/store/jobStore";
import { Inbox } from "lucide-react";

export default function BoardPage() {
  const loading = useJobStore((s) => s.loading);
  const jobs = useJobStore((s) => s.jobs);

  if (loading) {
    return (
      <div style={{ display: "flex", gap: 14, padding: "20px 24px", height: "100%" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ width: 215, flexShrink: 0 }}>
            <div style={{ height: 20, background: "rgba(43,63,191,0.06)", borderRadius: 6, marginBottom: 12, width: 100 }} />
            {Array.from({ length: i < 3 ? 2 : 1 }).map((_, j) => (
              <div key={j} style={{
                background: "rgba(255,255,255,0.50)", borderRadius: 14, height: 160, marginBottom: 10,
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
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
          <Inbox size={48} style={{ color: "rgba(43,63,191,0.2)", marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 300, color: "#1a1f3c", letterSpacing: "-0.03em", marginBottom: 8 }}>
            No applications yet
          </div>
          <p style={{ fontSize: 12, color: "#8892b0", lineHeight: 1.5 }}>
            Click "Add Application" to start tracking your job search.
            You can paste a job description and let AI fill in the details.
          </p>
        </div>
      </div>
    );
  }

  return <KanbanBoard />;
}
