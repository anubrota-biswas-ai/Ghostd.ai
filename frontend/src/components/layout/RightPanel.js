import { X } from "lucide-react";
import useJobStore from "@/store/jobStore";

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 14) return "Last week";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function RightPanel() {
  const selectedJobId = useJobStore((state) => state.selectedJobId);
  const jobs = useJobStore((state) => state.jobs);
  const clearSelection = useJobStore((state) => state.clearSelection);

  const job = jobs.find((j) => j.id === selectedJobId);
  if (!job) return null;

  const progress = job.progress || { skills: 0, experience: 0, language: 0 };
  const overallScore = job.matchScore || 0;

  return (
    <div
      data-testid="right-panel"
      className="jf-panel-enter"
      style={{
        width: 268,
        flexShrink: 0,
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderLeft: "1px solid rgba(255,255,255,0.90)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 18px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "rgba(43,63,191,0.5)",
              marginBottom: 4,
            }}
          >
            {job.company}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 300,
              color: "#1a1f3c",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}
          >
            {job.title}
          </div>
        </div>
        <button
          data-testid="close-panel-btn"
          onClick={clearSelection}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: "#8892b0",
            flexShrink: 0,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Score Card */}
      <div style={{ padding: "14px 18px" }}>
        <div
          data-testid="score-card"
          style={{
            background: "linear-gradient(135deg, #2B3FBF, #1a2d9f)",
            borderRadius: 14,
            padding: "18px 16px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.40)",
              marginBottom: 6,
            }}
          >
            CV Match Score
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 300,
              color: "#fff",
              letterSpacing: "-0.05em",
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            {overallScore}%
          </div>

          {/* Progress bars */}
          {[
            { label: "Skills", value: progress.skills },
            { label: "Experience", value: progress.experience },
            { label: "Language", value: progress.language },
          ].map((item, i) => (
            <div key={item.label} style={{ marginBottom: i < 2 ? 10 : 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.60)",
                    fontWeight: 400,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.60)",
                    fontWeight: 400,
                  }}
                >
                  {item.value}%
                </span>
              </div>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.15)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${item.value}%`,
                    background: "#fff",
                    borderRadius: 2,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* People section */}
      <div style={{ padding: "0 18px" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "rgba(43,63,191,0.5)",
            marginBottom: 10,
          }}
        >
          People
        </div>

        {(!job.contacts || job.contacts.length === 0) ? (
          <div
            style={{
              fontSize: 11,
              color: "rgba(26,31,60,0.35)",
              marginBottom: 16,
            }}
          >
            No contacts added yet
          </div>
        ) : (
          job.contacts.map((contact) => (
            <div
              key={contact.id}
              data-testid={`contact-${contact.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "rgba(43,63,191,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2B3FBF",
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {contact.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{ fontSize: 12, fontWeight: 500, color: "#1a1f3c" }}
                >
                  {contact.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: "rgba(26,31,60,0.35)",
                  }}
                >
                  {contact.roleType}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Activity timeline */}
      <div
        style={{
          padding: "14px 18px",
          borderTop: "1px solid rgba(43,63,191,0.07)",
          marginTop: 4,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "rgba(43,63,191,0.5)",
            marginBottom: 12,
          }}
        >
          Activity
        </div>

        {(!job.activity || job.activity.length === 0) ? (
          <div style={{ fontSize: 11, color: "rgba(26,31,60,0.35)" }}>
            No activity yet
          </div>
        ) : (
          [...job.activity].reverse().map((item, i, arr) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 14,
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 5,
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "rgba(43,63,191,0.25)",
                    flexShrink: 0,
                  }}
                />
                {i < arr.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      flex: 1,
                      background: "rgba(43,63,191,0.10)",
                      marginTop: 4,
                      minHeight: 16,
                    }}
                  />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: "rgba(26,31,60,0.50)",
                    lineHeight: 1.4,
                  }}
                >
                  {item.message}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: "rgba(26,31,60,0.25)",
                    marginTop: 2,
                  }}
                >
                  {formatTimestamp(item.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
