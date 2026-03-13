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

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar onAddClick={() => setShowAddModal(true)} />
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <main style={{ flex: 1, overflow: "auto" }}>
            <Outlet />
          </main>
          {selectedJobId && <RightPanel />}
        </div>
      </div>
      <AddJobModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
