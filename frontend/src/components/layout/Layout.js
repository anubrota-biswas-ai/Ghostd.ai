import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import RightPanel from "./RightPanel";
import useJobStore from "@/store/jobStore";

export default function Layout() {
  const selectedJobId = useJobStore((state) => state.selectedJobId);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Topbar />
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <main style={{ flex: 1, overflow: "auto" }}>
            <Outlet />
          </main>
          {selectedJobId && <RightPanel />}
        </div>
      </div>
    </div>
  );
}
