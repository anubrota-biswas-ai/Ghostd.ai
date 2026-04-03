import { Info } from "lucide-react";

const STATUS_PILLS = {
  wishlist: { bg: "#F7F5F0", text: "#9B8B7A", label: "Saved" },
  applied: { bg: "#F7F5F0", text: "#1C1917", label: "Applied" },
  interview: { bg: "#F0EDE6", text: "#C0A882", label: "Interview" },
  in_progress: { bg: "#F0EDE6", text: "#C0A882", label: "In Progress" },
  offer: { bg: "#EAF2EC", text: "#2D6A4F", label: "Offer" },
  rejected: { bg: "#F0EDEA", text: "#9B8B7A", label: "Ghosted" },
};

export default function JobCard({ job, isSelected }) {
  const isGhosted = job.status === "rejected";
  const sp = job.sponsorship;
  const pill = STATUS_PILLS[job.status] || STATUS_PILLS.applied;

  const daysSinceApplied = job.date_applied
    ? Math.floor((Date.now() - new Date(job.date_applied)) / 86400000)
    : null;

  return (
    <div
      data-testid={`job-card-${job.id}`}
      className={`gd-card${isGhosted ? " gd-ghosted" : ""}`}
      style={{
        background: "#FFFFFF",
        border: `1px solid ${isSelected ? "#C0A882" : "#E5E0D8"}`,
        borderLeft: isSelected ? "2px solid #C0A882" : `1px solid ${isSelected ? "#C0A882" : "#E5E0D8"}`,
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* Company initials avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: isGhosted ? "#9B8B7A" : "#1C1917",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: "#F7F5F0",
        }}>
          {(job.company || "?").substring(0, 2).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
            color: isGhosted ? "#9B8B7A" : "#1C1917",
            lineHeight: 1.3, marginBottom: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {job.title}
          </div>

          {/* Company + location */}
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 400,
            color: "#9B8B7A", lineHeight: 1.3,
          }}>
            {job.company}{job.location ? ` · ${job.location}` : ""}
          </div>

          {/* Sponsorship badge */}
          {sp && (
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              {sp.status === "found" ? (
                <span title={`Matched to: ${sp.matched_name || "—"} — ${Math.round((sp.confidence || 0) * 100)}%`} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500, padding: "1px 8px", borderRadius: 20, background: "#EAF2EC", color: "#2D6A4F", cursor: "help" }}>Sponsors visas</span>
              ) : sp.status === "not_found" ? (
                <span title={sp.matched_name && sp.confidence > 0.3 ? `Best match: ${sp.matched_name} — ${Math.round((sp.confidence || 0) * 100)}%` : "No close match found"} style={{ fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 500, padding: "1px 8px", borderRadius: 20, background: "#FDF2F1", color: "#B54A3F", cursor: "help" }}>
                  No sponsor licence <Info size={9} />
                </span>
              ) : null}
              {sp.manual_override && <span style={{ fontSize: 8, fontWeight: 500, color: "#9B8B7A" }}>MANUAL</span>}
            </div>
          )}

          {/* Bottom row: days + score */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#9B8B7A" }}>
              {daysSinceApplied != null ? `${daysSinceApplied}d ago` : ""}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {job.match_score != null && job.match_score > 0 && (
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500, padding: "1px 8px", borderRadius: 20, background: "#F0EDE6", color: "#C0A882" }}>
                  {job.match_score}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
