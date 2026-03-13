import { Plus, Search, Bell } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageTitles = {
  "/": "Application Board",
  "/ats": "ATS Checker",
  "/dashboard": "Dashboard",
  "/contacts": "Contacts",
};

export default function Topbar({ onAddClick }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Jobflow";

  return (
    <div
      data-testid="topbar"
      style={{
        height: 56, flexShrink: 0,
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.90)",
        padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 10,
      }}
    >
      <h1 style={{ fontSize: 15, fontWeight: 700, color: "#1a1f3c", letterSpacing: "-0.03em", margin: 0 }}>
        {title}
      </h1>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button data-testid="search-btn" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#8892b0", display: "flex", alignItems: "center" }}>
          <Search size={16} />
        </button>
        <button data-testid="notifications-btn" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#8892b0", display: "flex", alignItems: "center" }}>
          <Bell size={16} />
        </button>
        <button
          data-testid="add-application-btn"
          onClick={onAddClick}
          style={{
            background: "linear-gradient(135deg, #3B4FD0, #2B3FBF)",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            letterSpacing: "-0.01em", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Plus size={14} />
          Add Application
        </button>
      </div>
    </div>
  );
}
