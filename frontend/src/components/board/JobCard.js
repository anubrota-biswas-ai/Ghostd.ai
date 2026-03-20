import { Info } from "lucide-react";

export default function JobCard({ job, isSelected }) {
  const hasContacts = job.contacts && job.contacts.length > 0;

  /* Check if follow-up is needed (last activity > 7 days ago) */
  const needsFollowUp = (() => {
    if (!job.activity || job.activity.length === 0) return false;
    const last = new Date(job.activity[job.activity.length - 1].timestamp);
    return (Date.now() - last) / (1000 * 60 * 60 * 24) >= 7;
  })();

  /* Match score pill styling */
  const scorePill = job.matchScore
    ? job.matchScore >= 80
      ? { bg: "rgba(34,197,94,0.12)", color: "#15803D" }
      : job.matchScore >= 60
      ? { bg: "rgba(251,191,36,0.15)", color: "#B45309" }
      : { bg: "rgba(239,68,68,0.12)", color: "#B91C1C" }
    : null;

  return (
    <div
      data-testid={`job-card-${job.id}`}
      className={`jf-card${isSelected ? " selected" : ""}`}
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: `1px solid ${
          isSelected ? "rgba(43,63,191,0.40)" : "rgba(255,255,255,0.95)"
        }`,
        borderRadius: 14,
        padding: 16,
        boxShadow: isSelected
          ? "0 4px 20px rgba(43,63,191,0.15)"
          : "0 2px 12px rgba(43,63,191,0.06)",
      }}
    >
      {/* Company label */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "rgba(43,63,191,0.5)",
          marginBottom: 6,
        }}
      >
        {job.company}
      </div>

      {/* Sponsorship badge */}
      {job.sponsorship && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
          {job.sponsorship.status === "found" ? (
            <span data-testid={`sponsorship-badge-${job.id}`} style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: "#15803D" }}>
              Sponsors visas
            </span>
          ) : job.sponsorship.status === "not_found" ? (
            <span data-testid={`sponsorship-badge-${job.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: "rgba(245,158,11,0.12)", color: "#B45309" }}>
              Not found on register
              <span title="This company was not found on the UK Home Office Register of Licensed Sponsors. This does not necessarily mean they cannot sponsor — some companies use umbrella sponsors or haven't registered yet." style={{ cursor: "help" }}>
                <Info size={9} />
              </span>
            </span>
          ) : (
            <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: "rgba(156,163,175,0.15)", color: "#9CA3AF" }}>
              Sponsorship unknown
            </span>
          )}
        </div>
      )}

      {/* Title — weight 300 */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 300,
          color: "#1a1f3c",
          letterSpacing: "-0.02em",
          lineHeight: 1.3,
          marginBottom: 10,
        }}
      >
        {job.title}
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "rgba(43,63,191,0.07)",
          marginBottom: 10,
        }}
      />

      {/* Salary */}
      {job.salaryMin && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: "rgba(26,31,60,0.35)",
            }}
          >
            Salary
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1f3c" }}>
            ${(job.salaryMin / 1000).toFixed(0)}k – $
            {(job.salaryMax / 1000).toFixed(0)}k
          </span>
        </div>
      )}

      {/* Date */}
      {job.dateApplied && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: "rgba(26,31,60,0.35)",
            }}
          >
            Applied
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1f3c" }}>
            {new Date(job.dateApplied).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {job.matchScore != null && (
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              height: 3,
              borderRadius: 2,
              background: "rgba(43,63,191,0.10)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${job.matchScore}%`,
                background: "linear-gradient(90deg, #6B7FE8, #2B3FBF)",
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "rgba(43,63,191,0.07)",
          marginBottom: 10,
        }}
      />

      {/* Footer: avatar stack + pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Avatar stack */}
        <div style={{ display: "flex" }}>
          {hasContacts ? (
            job.contacts.slice(0, 3).map((contact, i) => {
              const gradients = [
                ["#6B7FE8", "#4F63E0"],
                ["#5B6FD8", "#3B4FD0"],
                ["#7B8FF0", "#5B6FD8"],
              ];
              const [from, to] = gradients[i % 3];
              return (
                <div
                  key={contact.id}
                  title={`${contact.name} — ${contact.roleType}`}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${from}, ${to})`,
                    border: "2px solid rgba(255,255,255,0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 8,
                    fontWeight: 600,
                    marginLeft: i > 0 ? -6 : 0,
                    position: "relative",
                    zIndex: 3 - i,
                  }}
                >
                  {contact.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
              );
            })
          ) : (
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "rgba(43,63,191,0.06)",
                border: "2px solid rgba(255,255,255,0.9)",
              }}
            />
          )}
        </div>

        {/* Pill */}
        {scorePill ? (
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 20,
              background: scorePill.bg,
              color: scorePill.color,
              whiteSpace: "nowrap",
            }}
          >
            {job.matchScore}% match
          </div>
        ) : needsFollowUp ? (
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 20,
              background: "rgba(251,191,36,0.15)",
              color: "#B45309",
              whiteSpace: "nowrap",
            }}
          >
            Follow up
          </div>
        ) : null}
      </div>
    </div>
  );
}
