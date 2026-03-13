import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import RightPanel from "./RightPanel";
import AddJobModal from "@/components/board/AddJobModal";
import useJobStore from "@/store/jobStore";

export default function Layout() {
  const selectedJobId = useJobStore((state) => state.selectedJobId);
  const fetchJobs = useJobStore((state) => state.fetchJobs);
  const [showAddModal, setShowAddModal] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1920);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

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
    </div>
  );
}
