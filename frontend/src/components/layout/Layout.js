import { useState, useEffect } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
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
    api.recheckAllSponsorship().then(() => fetchJobs()).catch(() => {});
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const g = searchParams.get("gmail");
    if (g === "connected") {
      setGmailToast({ type: "success", message: "Gmail connected! Running initial scan..." });
      searchParams.delete("gmail"); setSearchParams(searchParams, { replace: true });
      api.gmailScan().then((res) => {
        const n = res.new_notifications || 0, a = res.new_activities || 0;
        setGmailToast({ type: "success", message: n > 0 || a > 0 ? `Gmail synced: ${a} activities, ${n} suggestions` : "Gmail connected and synced" });
        setTimeout(() => setGmailToast(null), 5000);
      }).catch(() => { setGmailToast({ type: "success", message: "Gmail connected" }); setTimeout(() => setGmailToast(null), 4000); });
    } else if (g === "error") {
      setGmailToast({ type: "error", message: `Gmail connection failed. Try again.` });
      searchParams.delete("gmail"); searchParams.delete("reason"); setSearchParams(searchParams, { replace: true });
      setTimeout(() => setGmailToast(null), 5000);
    }
    // eslint-disable-next-line
  }, []);

  const isBottomSheet = windowWidth < 1000;
  const sidebarWidth = sidebarCollapsed ? 56 : 220;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#F7F5F0" }}>
      <Topbar onAddClick={() => setShowAddModal(true)} />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main style={{ flex: 1, overflow: "auto" }}>
          <Outlet />
        </main>
        {selectedJobId && !isBottomSheet && <RightPanel mode="panel" />}
      </div>
      {selectedJobId && isBottomSheet && <RightPanel mode="sheet" sidebarWidth={sidebarWidth} />}
      <AddJobModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {gmailToast && (
        <div style={{
          position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", zIndex: 60,
          padding: "10px 20px", borderRadius: 10, background: "#FFFFFF",
          border: `1px solid ${gmailToast.type === "success" ? "#2D6A4F" : "#B54A3F"}`,
          display: "flex", alignItems: "center", gap: 8, animation: "slideUp 0.3s ease-out",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: gmailToast.type === "success" ? "#2D6A4F" : "#B54A3F" }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: "#1C1917", fontFamily: "var(--gd-font-body)" }}>{gmailToast.message}</span>
          <button onClick={() => setGmailToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8B7A", padding: 2, fontFamily: "var(--gd-font-body)" }}>x</button>
        </div>
      )}
    </div>
  );
}
