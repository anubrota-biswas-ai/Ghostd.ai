import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import useAuthStore from '@/store/authStore';

export default function AuthCallback() {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) {
      navigate('/login');
      return;
    }

    const sessionId = match[1];
    api.exchangeSession(sessionId)
      .then((user) => {
        setUser(user);
        window.history.replaceState(null, '', '/');
        navigate('/', { state: { user } });
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate, setUser]);

  // Silent processing — no loading UI
  return null;
}
