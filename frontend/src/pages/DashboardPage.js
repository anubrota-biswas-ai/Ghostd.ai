import { BarChart3, Briefcase, Clock, CheckCircle, XCircle, Star } from "lucide-react";
import useJobStore from "@/store/jobStore";

const STATUS_CONFIG = {
  wishlist: { label: "Wishlist", color: "#9CA3AF", icon: Star },
  applied: { label: "Applied", color: "#60A5FA", icon: Briefcase },
  interview: { label: "Interview", color: "#FCD34D", icon: Clock },
  in_progress: { label: "In Progress", color: "#F97316", icon: Clock },
  offer: { label: "Offer", color: "#34D399", icon: CheckCircle },
  rejected: { label: "Rejected", color: "#FCA5A5", icon: XCircle },
};

export default function DashboardPage() {
  const jobs = useJobStore((s) => s.jobs);

  const statusCounts = {};
  Object.keys(STATUS_CONFIG).forEach((s) => { statusCounts[s] = jobs.filter((j) => j.status === s).length; });

  if (jobs.length === 0) {
    return (
      <div data-testid="dashboard-page" style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E0D8", borderRadius: 10, padding: 40, textAlign: "center", maxWidth: 400 }}>
          <BarChart3 size={40} style={{ color: "rgba(43,63,191,0.3)", marginBottom: 16 }} />
          <h2 style={{ fontSize: 18, fontWeight: 300, color: "#1C1917", letterSpacing: "-0.03em", marginBottom: 8 }}>Dashboard</h2>
          <p style={{ fontSize: 12, color: "#9B8B7A", lineHeight: 1.5 }}>Add applications to see your overview here.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      {/* Status pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#FFFFFF", backdropFilter: "blur(8px)",
            border: "1px solid #E5E0D8", borderRadius: 10, padding: "10px 16px",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#1C1917" }}>{statusCounts[key]}</span>
            <span style={{ fontSize: 11, fontWeight: 400, color: "#9B8B7A" }}>{cfg.label}</span>
          </div>
        ))}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#1C1917", borderRadius: 10, padding: "10px 16px",
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{jobs.length}</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: "#FFFFFF" }}>Total</span>
        </div>
      </div>

      {/* Applications table */}
      <div style={{
        background: "#FFFFFF", backdropFilter: "blur(8px)",
        border: "1px solid #E5E0D8", borderRadius: 10, overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E5E0D8" }}>
              {["Role", "Company", "Status", "Match", "Applied", "Salary"].map((h) => (
                <th key={h} style={{
                  padding: "12px 16px", textAlign: "left",
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.08em", color: "#9B8B7A",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.wishlist;
              return (
                <tr key={job.id} style={{ borderBottom: "1px solid #F7F5F0" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 300, color: "#1C1917", letterSpacing: "-0.02em" }}>{job.title}</td>
                  <td style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>{job.company}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: `${cfg.color}20`, color: cfg.color,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color }} />
                      {cfg.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: job.match_score ? "#1C1917" : "#9B8B7A" }}>
                    {job.match_score ? `${job.match_score}%` : "—"}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: "#9B8B7A" }}>
                    {job.date_applied ? new Date(job.date_applied).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#1C1917" }}>
                    {job.salary_min ? `$${(job.salary_min / 1000).toFixed(0)}k – $${(job.salary_max / 1000).toFixed(0)}k` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
