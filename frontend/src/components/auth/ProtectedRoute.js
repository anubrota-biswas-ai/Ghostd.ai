import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

export default function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.user) {
      useAuthStore.getState().setUser(location.state.user);
      return;
    }
    checkAuth();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(145deg, #E8EDF8 0%, #D4DCF4 100%)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1f3c', letterSpacing: '-0.04em', marginBottom: 12 }}>
            Jobflow
          </div>
          <div className="jf-spinner" />
        </div>
      </div>
    );
  }

  return children;
}
