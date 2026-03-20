import { useState, useEffect } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import RightPanel from "./RightPanel";
import AddJobModal from "@/components/board/AddJobModal";
import useJobStore from "@/store/jobStore";
import { api } from "@/lib/api";

export default function Layout() {
  const selectedJobId = useJobStore((state) => state.selectedJobId);
  const fetchJobs = useJobStore((state) => state.fetchJobs);
  const [showAddModal, setShowAddModal] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1920);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [gmailToast, setGmailToast] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchJobs();
    // Recheck sponsorship for any jobs missing badges (run once on load)
    api.recheckAllSponsorship().then(() => fetchJobs()).catch(() => {});
    // eslint-disable-next-line
  }, []);

  // Handle ?gmail=connected or ?gmail=error after OAuth redirect
  useEffect(() => {
    const gmailParam = searchParams.get("gmail");
    if (gmailParam === "connected") {
      setGmailToast({ type: "success", message: "Gmail connected! Running initial scan..." });
      // Clean URL
      searchParams.delete("gmail");
      setSearchParams(searchParams, { replace: true });
      // Trigger initial scan
      api.gmailScan().then((res) => {
        const n = res.new_notifications || 0;
        const a = res.new_activities || 0;
        if (n > 0 || a > 0) {
          setGmailToast({ type: "success", message: `Gmail synced: ${a} new activities, ${n} new suggestions` });
        } else {
          setGmailToast({ type: "success", message: "Gmail connected and synced successfully" });
        }
        setTimeout(() => setGmailToast(null), 5000);
      }).catch(() => {
        setGmailToast({ type: "success", message: "Gmail connected" });
        setTimeout(() => setGmailToast(null), 4000);
      });
    } else if (gmailParam === "error") {
      const reason = searchParams.get("reason") || "unknown";
      setGmailToast({ type: "error", message: `Gmail connection failed (${reason}). Try again.` });
      searchParams.delete("gmail");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => setGmailToast(null), 5000);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const autoCollapse = windowWidth < 900;
  const collapsed = autoCollapse || sidebarCollapsed;
  const isBottomSheet = windowWidth < 1200;
  const sidebarWidth = collapsed ? 56 : 210;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} autoCollapsed={autoCollapse} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar onAddClick={() => setShowAddModal(true)} compact={windowWidth < 600} />
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
          <main style={{ flex: 1, overflow: "auto" }}>
            <Outlet />
          </main>
          {selectedJobId && !isBottomSheet && <RightPanel mode="panel" />}
        </div>
        {selectedJobId && isBottomSheet && <RightPanel mode="sheet" sidebarWidth={sidebarWidth} />}
      </div>
      <AddJobModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Gmail connection toast */}
      {gmailToast && (
        <div
          data-testid="gmail-toast"
          style={{
            position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", zIndex: 60,
            padding: "10px 20px", borderRadius: 10,
            background: gmailToast.type === "success" ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)", border: `1px solid ${gmailToast.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            boxShadow: "0 4px 20px rgba(43,63,191,0.12)",
            display: "flex", alignItems: "center", gap: 8, animation: "slideUp 0.3s ease-out",
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: gmailToast.type === "success" ? "#34D399" : "#FCA5A5",
          }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: "#1a1f3c" }}>{gmailToast.message}</span>
          <button onClick={() => setGmailToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8892b0", padding: 2, marginLeft: 8 }}>
            x
          </button>
        </div>
      )}
    </div>
  );
}
