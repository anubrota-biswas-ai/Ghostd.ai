import { useState, useEffect } from "react";
import { Bell, Check, X, ArrowRight, Mail } from "lucide-react";
import { api } from "@/lib/api";
import useJobStore from "@/store/jobStore";

const TYPE_INFO = {
  rejection: { color: "#B54A3F", bg: "#FDF2F1", label: "Rejection" },
  interview: { color: "#C0A882", bg: "#F0EDE6", label: "Interview" },
  assessment: { color: "#C77B3F", bg: "#FDF5EE", label: "Assessment" },
  offer: { color: "#2D6A4F", bg: "#EAF2EC", label: "Offer" },
  follow_up: { color: "#9B8B7A", bg: "#F7F5F0", label: "Follow Up" },
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const fetchJobs = useJobStore((s) => s.fetchJobs);

  const load = async () => { try { const d = await api.getNotifications(); setNotifications(d || []); } catch {} };
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, []);

  const handleConfirm = async (id) => { try { await api.confirmNotification(id); setNotifications((p) => p.filter((n) => n.id !== id)); await fetchJobs(); } catch {} };
  const handleDismiss = async (id) => { try { await api.dismissNotification(id); setNotifications((p) => p.filter((n) => n.id !== id)); } catch {} };

  const count = notifications.length;
  return (
    <div style={{ position: "relative" }}>
      <button data-testid="notification-bell" onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#9B8B7A", display: "flex", alignItems: "center", position: "relative" }}>
        <Bell size={16} />
        {count > 0 && <span style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "#B54A3F", color: "#F7F5F0", fontSize: 8, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>{count > 9 ? "9+" : count}</span>}
      </button>
      {open && (
        <div data-testid="notification-dropdown" style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 340, maxHeight: 400, overflowY: "auto", background: "#FFFFFF", borderRadius: 10, border: "1px solid #E5E0D8", zIndex: 100 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E0D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#1C1917", fontFamily: "'DM Sans', sans-serif" }}>Notifications</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8B7A" }}><X size={14} /></button>
          </div>
          {count === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "#9B8B7A", fontFamily: "'DM Sans', sans-serif" }}>Nothing here yet.</div>
          ) : (
            notifications.map((n) => {
              const ti = TYPE_INFO[n.email_type] || TYPE_INFO.follow_up;
              return (
                <div key={n.id} data-testid={`notification-${n.id}`} style={{ padding: "12px 16px", borderBottom: "1px solid #F7F5F0" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: ti.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Mail size={12} style={{ color: ti.color }} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 500, padding: "1px 8px", borderRadius: 20, background: ti.bg, color: ti.color, fontFamily: "'DM Sans', sans-serif" }}>{ti.label}</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>{n.email_subject || "Email received"}</div>
                      <div style={{ fontSize: 10, color: "#9B8B7A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>{n.email_from}</div>
                      {n.suggested_status && <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 10, color: "#9B8B7A", fontFamily: "'DM Sans', sans-serif" }}><ArrowRight size={10} /> Move to <strong>{n.suggested_status.replace("_", " ")}</strong></div>}
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button data-testid={`confirm-${n.id}`} onClick={() => handleConfirm(n.id)} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 10px", borderRadius: 6, background: "#1C1917", color: "#F7F5F0", border: "none", fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}><Check size={10} /> Confirm</button>
                        <button data-testid={`dismiss-${n.id}`} onClick={() => handleDismiss(n.id)} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 10px", borderRadius: 6, background: "none", color: "#9B8B7A", border: "1px solid #E5E0D8", fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Dismiss</button>
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
