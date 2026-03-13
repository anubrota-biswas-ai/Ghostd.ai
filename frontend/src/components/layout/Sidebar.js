import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileSearch, BarChart3, Users } from "lucide-react";

const navItems = [
  { path: "/", label: "Board", icon: LayoutDashboard },
  { path: "/ats", label: "ATS Checker", icon: FileSearch },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/contacts", label: "Contacts", icon: Users },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      data-testid="sidebar"
      style={{
        width: 210,
        flexShrink: 0,
        background: "rgba(255,255,255,0.70)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRight: "1px solid rgba(255,255,255,0.90)",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "22px 20px",
          borderBottom: "1px solid rgba(43,63,191,0.08)",
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#1a1f3c",
            letterSpacing: "-0.04em",
          }}
        >
          Jobflow
        </span>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 10px", flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 11px",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                background: isActive
                  ? "rgba(43,63,191,0.10)"
                  : "transparent",
                marginBottom: 2,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = "rgba(43,63,191,0.06)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon
                size={16}
                style={{
                  opacity: isActive ? 1 : 0.3,
                  color: isActive ? "#2B3FBF" : "#1a1f3c",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#2B3FBF" : "#8892b0",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div
        style={{
          padding: "14px 16px",
          borderTop: "1px solid rgba(43,63,191,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6B7FE8, #4F63E0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          JD
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#1a1f3c",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Jane Doe
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#8892b0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            jane@email.com
          </div>
        </div>
      </div>
    </div>
  );
}
