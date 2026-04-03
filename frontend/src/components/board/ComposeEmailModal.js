import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { api } from '@/lib/api';

export default function ComposeEmailModal({ isOpen, onClose, to = '', subject = '', jobCompany = '' }) {
  const [form, setForm] = useState({ to, subject, body: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!form.to || !form.subject || !form.body) return;
    setSending(true);
    try {
      await api.gmailSend(form.to, form.subject, form.body);
      setSent(true);
      setTimeout(() => { onClose(); setSent(false); setForm({ to: '', subject: '', body: '' }); }, 1500);
    } catch (e) {
      console.error('Send failed:', e);
    }
    setSending(false);
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', fontSize: 13,
    border: '1px solid #E5E0D8', borderRadius: 8,
    background: '#FFFFFF', outline: 'none',
    color: '#1C1917', fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div
      data-testid="compose-email-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(26,31,60,0.20)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
          borderRadius: 10, border: '1px solid #E5E0D8',
          boxShadow: '0 8px 40px #E5E0D8',
          maxWidth: 520, width: '100%', padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 300, color: '#1C1917', letterSpacing: '-0.03em' }}>
            {jobCompany ? `Email — ${jobCompany}` : 'Compose Email'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B8B7A' }}>
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <Send size={32} style={{ color: '#2D6A4F', marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 300, color: '#1C1917' }}>Email sent</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B8B7A', marginBottom: 4 }}>To</div>
              <input data-testid="email-to" style={inputStyle} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="recruiter@company.com" />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B8B7A', marginBottom: 4 }}>Subject</div>
              <input data-testid="email-subject" style={inputStyle} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Re: Application for..." />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B8B7A', marginBottom: 4 }}>Message</div>
              <textarea
                data-testid="email-body"
                style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }}
                value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Write your message..."
              />
            </div>
            <button
              data-testid="send-email-btn"
              onClick={handleSend}
              disabled={sending || !form.to || !form.body}
              style={{
                background: '#1C1917', color: '#fff',
                border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600,
                cursor: sending ? 'wait' : 'pointer', width: '100%',
                opacity: sending || !form.to || !form.body ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Send size={14} />
              {sending ? 'Sending...' : 'Send via Gmail'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
