import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileSearch, BarChart3, Users, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import useAuthStore from "@/store/authStore";

const navItems = [
  { path: "/", label: "Board", icon: LayoutDashboard },
  { path: "/ats", label: "ATS Checker", icon: FileSearch },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/contacts", label: "Contacts", icon: Users },
];

export default function Sidebar({ collapsed, onToggle, autoCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";

  return (
    <div
      data-testid="sidebar"
      style={{
        width: collapsed ? 56 : 210, flexShrink: 0,
        background: "rgba(255,255,255,0.70)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderRight: "1px solid rgba(255,255,255,0.90)",
        display: "flex", flexDirection: "column", zIndex: 20,
        transition: "width 0.2s ease",
      }}
    >
      {/* Logo + collapse toggle */}
      <div style={{
        padding: collapsed ? "22px 0" : "22px 20px",
        borderBottom: "1px solid rgba(43,63,191,0.08)",
        display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between",
      }}>
        <span style={{ fontSize: collapsed ? 15 : 17, fontWeight: 700, color: "#1a1f3c", letterSpacing: "-0.04em" }}>
          {collapsed ? "J" : "Jobflow"}
        </span>
        {!autoCollapsed && (
          <button
            data-testid="toggle-sidebar-btn"
            onClick={onToggle}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8892b0", padding: 2, display: collapsed ? "none" : "flex" }}
          >
            <PanelLeftClose size={14} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: collapsed ? "12px 6px" : "12px 10px", flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
                gap: collapsed ? 0 : 10,
                width: "100%", padding: collapsed ? "9px 0" : "9px 11px", borderRadius: 9,
                border: "none", cursor: "pointer",
                background: isActive ? "rgba(43,63,191,0.10)" : "transparent",
                marginBottom: 2, transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(43,63,191,0.06)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <Icon size={16} style={{ opacity: isActive ? 1 : 0.3, color: isActive ? "#2B3FBF" : "#1a1f3c", flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? "#2B3FBF" : "#8892b0" }}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
        {collapsed && !autoCollapsed && (
          <button
            onClick={onToggle}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", padding: "9px 0", borderRadius: 9, border: "none",
              cursor: "pointer", background: "transparent", marginTop: 4,
            }}
            title="Expand sidebar"
          >
            <PanelLeftOpen size={16} style={{ opacity: 0.3, color: "#1a1f3c" }} />
          </button>
        )}
      </nav>

      {/* User section */}
      <div style={{
        padding: collapsed ? "14px 0" : "14px 16px",
        borderTop: "1px solid rgba(43,63,191,0.08)",
        display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: collapsed ? 0 : 10,
      }}>
        {user?.picture ? (
          <img src={user.picture} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg, #6B7FE8, #4F63E0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}>{initials}</div>
        )}
        {!collapsed && (
          <>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1f3c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.name || "User"}
              </div>
              <div style={{ fontSize: 10, color: "#8892b0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email || ""}
              </div>
            </div>
            <button data-testid="logout-btn" onClick={logout} title="Logout" style={{ background: "none", border: "none", cursor: "pointer", color: "#8892b0", padding: 4, flexShrink: 0 }}>
              <LogOut size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
