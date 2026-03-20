import { useState, useEffect } from "react";
import { Bell, Check, X, ArrowRight, Mail } from "lucide-react";
import { api } from "@/lib/api";
import useJobStore from "@/store/jobStore";

const TYPE_ICONS = {
  rejection: { color: "#B91C1C", bg: "rgba(239,68,68,0.12)", label: "Rejection" },
  interview: { color: "#15803D", bg: "rgba(34,197,94,0.12)", label: "Interview" },
  assessment: { color: "#B45309", bg: "rgba(251,191,36,0.15)", label: "Assessment" },
  offer: { color: "#15803D", bg: "rgba(34,197,94,0.12)", label: "Offer" },
  follow_up: { color: "rgba(43,63,191,0.6)", bg: "rgba(43,63,191,0.08)", label: "Follow Up" },
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const fetchJobs = useJobStore((s) => s.fetchJobs);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirm = async (id) => {
    try {
      await api.confirmNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await fetchJobs();
    } catch {}
  };

  const handleDismiss = async (id) => {
    try {
      await api.dismissNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const count = notifications.length;

  return (
    <div style={{ position: "relative" }}>
      <button
        data-testid="notification-bell"
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#8892b0", display: "flex", alignItems: "center", position: "relative" }}
      >
        <Bell size={16} />
        {count > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2, width: 14, height: 14,
            borderRadius: "50%", background: "#2B3FBF", color: "#fff",
            fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          data-testid="notification-dropdown"
          style={{
            position: "absolute", top: "100%", right: 0, marginTop: 8,
            width: 340, maxHeight: 400, overflowY: "auto",
            background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)",
            borderRadius: 14, border: "1px solid rgba(255,255,255,0.95)",
            boxShadow: "0 8px 40px rgba(43,63,191,0.15)", zIndex: 100,
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(43,63,191,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1f3c" }}>Notifications</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8892b0" }}><X size={14} /></button>
          </div>

          {count === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "rgba(26,31,60,0.35)" }}>
              No pending notifications
            </div>
          ) : (
            notifications.map((n) => {
              const typeInfo = TYPE_ICONS[n.email_type] || TYPE_ICONS.follow_up;
              return (
                <div key={n.id} data-testid={`notification-${n.id}`} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(43,63,191,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: typeInfo.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Mail size={12} style={{ color: typeInfo.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: typeInfo.bg, color: typeInfo.color }}>{typeInfo.label}</span>
                        <span style={{ fontSize: 10, color: "rgba(26,31,60,0.25)" }}>{Math.round((n.confidence || 0) * 100)}%</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "#1a1f3c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.email_subject || "Email received"}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.email_from}
                      </div>
                      {n.suggested_status && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 10, color: "rgba(26,31,60,0.5)" }}>
                          <ArrowRight size={10} /> Move to <strong>{n.suggested_status.replace("_", " ")}</strong>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          data-testid={`confirm-${n.id}`}
                          onClick={() => handleConfirm(n.id)}
                          style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 10px", borderRadius: 6, background: "#2B3FBF", color: "#fff", border: "none", fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                        >
                          <Check size={10} /> Confirm
                        </button>
                        <button
                          data-testid={`dismiss-${n.id}`}
                          onClick={() => handleDismiss(n.id)}
                          style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 10px", borderRadius: 6, background: "none", color: "#8892b0", border: "1px solid rgba(43,63,191,0.12)", fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
