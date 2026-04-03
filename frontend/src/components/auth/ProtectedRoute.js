import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

export default function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { if (location.state?.user) { useAuthStore.getState().setUser(location.state.user); return; } checkAuth(); }, []);
  useEffect(() => { if (!loading && !user) navigate('/login'); }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F5F0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 400, color: '#1C1917', letterSpacing: '-0.02em', marginBottom: 12 }}>
            ghostd<span style={{ fontSize: 8, color: '#C0A882', marginLeft: 2 }}>●</span>
          </div>
          <div className="jf-spinner" />
        </div>
      </div>
    );
  }

  return children;
}
