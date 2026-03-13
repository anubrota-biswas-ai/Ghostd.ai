import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import BoardPage from "@/pages/BoardPage";
import ATSCheckerPage from "@/pages/ATSCheckerPage";
import DashboardPage from "@/pages/DashboardPage";
import ContactsPage from "@/pages/ContactsPage";
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/components/auth/AuthCallback";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

function AppRouter() {
  const location = useLocation();

  // CRITICAL: Detect session_id synchronously during render (before routing)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<BoardPage />} />
        <Route path="/ats" element={<ATSCheckerPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
