export default function LoginPage() {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div data-testid="login-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F5F0' }}>
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E0D8', borderRadius: 10, padding: '48px 40px', textAlign: 'center', maxWidth: 380, width: '100%' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400, color: '#1C1917', letterSpacing: '-0.02em', marginBottom: 4 }}>
          ghostd<span style={{ fontSize: 10, color: '#C0A882', marginLeft: 2 }}>●</span>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#9B8B7A', marginBottom: 36, lineHeight: 1.6 }}>
          Track your applications.<br />The market won't fix itself.
        </p>
        <button
          data-testid="login-google-btn"
          onClick={handleLogin}
          style={{
            background: '#1C1917', color: '#F7F5F0', border: 'none', borderRadius: 6,
            padding: '12px 24px', fontSize: 14, fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer', width: '100%', transition: 'opacity 0.15s',
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
