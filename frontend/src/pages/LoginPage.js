export default function LoginPage() {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div
      data-testid="login-page"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(145deg, #E8EDF8 0%, #D4DCF4 100%)',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.95)',
          borderRadius: 16, padding: '48px 40px',
          textAlign: 'center', maxWidth: 380, width: '100%',
          boxShadow: '0 8px 40px rgba(43,63,191,0.10)',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1f3c', letterSpacing: '-0.04em', marginBottom: 4 }}>
          Jobflow
        </div>
        <p style={{ fontSize: 13, fontWeight: 300, color: '#8892b0', marginBottom: 36, lineHeight: 1.5 }}>
          Your AI-powered job application tracker.<br />Track, analyse, and win.
        </p>
        <button
          data-testid="login-google-btn"
          onClick={handleLogin}
          style={{
            background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '12px 24px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', width: '100%',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
