import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileSearch, BarChart3, Users, Ghost, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const navItems = [
  { path: "/", label: "Pipeline", icon: LayoutDashboard },
  { path: "/ats", label: "ATS Checker", icon: FileSearch },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/contacts", label: "Contacts", icon: Users },
];

const bottomItems = [
  { id: "ghost", label: "Job Search", icon: Ghost },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const width = collapsed ? 56 : 220;

  const itemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: collapsed ? 0 : 10,
    justifyContent: collapsed ? "center" : "flex-start",
    width: "100%",
    padding: collapsed ? "10px 0" : "8px 14px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    background: isActive ? "#E8E2D9" : "transparent",
    borderLeft: isActive ? "2px solid #C0A882" : "2px solid transparent",
    marginBottom: 2,
    transition: "background 0.15s",
  });

  const NavButton = ({ item, isActive }) => (
    <button
      data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={() => item.path ? navigate(item.path) : null}
      title={collapsed ? item.label : undefined}
      style={itemStyle(isActive)}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#EDEAE3"; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? "#E8E2D9" : "transparent"; }}
    >
      <item.icon
        size={18}
        strokeWidth={1.5}
        style={{ color: isActive ? "#1C1917" : "#9B8B7A", flexShrink: 0 }}
      />
      {!collapsed && (
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400,
          color: isActive ? "#1C1917" : "#9B8B7A",
        }}>
          {item.label}
        </span>
      )}
    </button>
  );

  return (
    <div
      data-testid="sidebar"
      style={{
        width,
        flexShrink: 0,
        background: "#F1EDE4",
        borderRight: "1px solid #E5E0D8",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Toggle button */}
      <div style={{
        padding: collapsed ? "12px 0" : "12px 14px",
        display: "flex",
        justifyContent: collapsed ? "center" : "flex-end",
      }}>
        <button
          data-testid="toggle-sidebar-btn"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#9B8B7A", padding: 4, display: "flex", alignItems: "center",
            borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#1C1917")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9B8B7A")}
        >
          {collapsed ? <ChevronRight size={16} strokeWidth={1.5} /> : <ChevronLeft size={16} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Main nav */}
      <nav style={{ padding: collapsed ? "0 6px" : "0 10px", flex: 1 }}>
        {navItems.map((item) => (
          <NavButton key={item.path} item={item} isActive={location.pathname === item.path} />
        ))}

        {/* Divider */}
        <div style={{ height: 1, background: "#E5E0D8", margin: "10px 0" }} />

        {/* Ghost / Job Search */}
        {bottomItems.map((item) => (
          <NavButton key={item.id} item={item} isActive={false} />
        ))}
      </nav>

      {/* Bottom: Settings */}
      <div style={{ padding: collapsed ? "0 6px 12px" : "0 10px 12px" }}>
        <div style={{ height: 1, background: "#E5E0D8", margin: "0 0 10px" }} />
        <button
          data-testid="sidebar-nav-settings"
          title={collapsed ? "Settings" : undefined}
          style={itemStyle(false)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#EDEAE3")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Settings size={18} strokeWidth={1.5} style={{ color: "#9B8B7A", flexShrink: 0 }} />
          {!collapsed && (
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400, color: "#9B8B7A" }}>
              Settings
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
