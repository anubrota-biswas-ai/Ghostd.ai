import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import NotificationBell from "./NotificationBell";

const navItems = [
  { path: "/", label: "Pipeline" },
  { path: "/ats", label: "ATS Checker" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/contacts", label: "Contacts" },
];

export default function Topbar({ onAddClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";

  return (
    <div
      data-testid="topbar"
      style={{
        height: 52, flexShrink: 0,
        background: "#1C1917",
        display: "flex", alignItems: "center",
        padding: "0 24px",
        zIndex: 20,
      }}
    >
      {/* Logo */}
      <div
        onClick={() => navigate("/")}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 0, marginRight: 40 }}
      >
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#F7F5F0", fontWeight: 400 }}>
          ghostd
        </span>
        <span style={{ fontSize: 8, color: "#C0A882", marginLeft: 2, lineHeight: 1 }}>●</span>
      </div>

      {/* Nav links — centre */}
      <nav style={{ display: "flex", alignItems: "center", gap: 28, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => navigate(item.path)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400,
                color: isActive ? "#F7F5F0" : "#9B8B7A",
                padding: "4px 0",
                borderBottom: isActive ? "1px solid #F7F5F0" : "1px solid transparent",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "#E5E0D8"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#9B8B7A"; }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <NotificationBell />

        <button
          data-testid="add-application-btn"
          onClick={onAddClick}
          style={{
            background: "#C0A882", color: "#1C1917", border: "none", borderRadius: 6,
            padding: "6px 14px", fontSize: 12, fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Plus size={13} />
          Add
        </button>

        {/* User avatar */}
        <div
          onClick={logout}
          title="Logout"
          style={{
            width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
            background: user?.picture ? "transparent" : "#C0A882",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {user?.picture ? (
            <img src={user.picture} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: "#1C1917" }}>{initials}</span>
          )}
        </div>
      </div>
    </div>
  );
}
