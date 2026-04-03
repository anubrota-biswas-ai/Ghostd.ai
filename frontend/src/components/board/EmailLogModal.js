import { useState } from 'react';
import { X, Mail, Sparkles, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import useJobStore from '@/store/jobStore';

const TYPE_LABELS = {
  interview_invitation: { label: "Interview Invitation", bg: "#EAF2EC", color: "#2D6A4F" },
  rejection: { label: "Rejection", bg: "#FDF2F1", color: "#B54A3F" },
  offer: { label: "Offer", bg: "#EAF2EC", color: "#2D6A4F" },
  follow_up: { label: "Follow Up", bg: "#FDF5EE", color: "#C77B3F" },
  thank_you: { label: "Thank You", bg: "#F0EDE6", color: "#C0A882" },
  info_request: { label: "Info Request", bg: "#FDF5EE", color: "#C77B3F" },
  general: { label: "General", bg: "#F0EDE6", color: "#C0A882" },
};

export default function EmailLogModal({ isOpen, onClose, job }) {
  const [emailText, setEmailText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState(false);
  const moveJob = useJobStore((s) => s.moveJob);
  const fetchJobs = useJobStore((s) => s.fetchJobs);

  if (!isOpen || !job) return null;

  const handleAnalyze = async () => {
    if (!emailText.trim()) return;
    setAnalyzing(true);
    setResult(null);
    setApplied(false);
    try {
      const data = await api.parseEmail(emailText, job.id);
      setResult(data);
    } catch (e) {
      console.error('Email analysis failed:', e);
    }
    setAnalyzing(false);
  };

  const handleApplyStatus = async () => {
    if (result?.suggested_status && result.suggested_status !== job.status) {
      await moveJob(job.id, result.suggested_status);
      await fetchJobs();
      setApplied(true);
    }
  };

  const handleClose = () => {
    setEmailText('');
    setResult(null);
    setApplied(false);
    onClose();
  };

  const typeInfo = result ? TYPE_LABELS[result.email_type] || TYPE_LABELS.general : null;

  return (
    <div
      data-testid="email-log-overlay"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(26,31,60,0.20)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        data-testid="email-log-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
          borderRadius: 10, border: '1px solid #E5E0D8',
          boxShadow: '0 8px 40px #E5E0D8',
          maxWidth: 580, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 28,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9B8B7A', marginBottom: 4 }}>
              {job.company}
            </div>
            <div style={{ fontSize: 18, fontWeight: 300, color: '#1C1917', letterSpacing: '-0.03em' }}>
              Log Email
            </div>
          </div>
          <button data-testid="close-email-btn" onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B8B7A', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Email paste */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B8B7A', marginBottom: 6 }}>
            Paste Email Content
          </div>
          <textarea
            data-testid="email-textarea"
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder="Paste the recruiter email here... Include sender, subject, and body."
            style={{
              width: '100%', minHeight: 140, padding: 12, fontSize: 12,
              fontFamily: "'DM Sans', sans-serif", border: '1px solid #E5E0D8',
              borderRadius: 10, background: '#FFFFFF',
              color: '#1C1917', resize: 'vertical', outline: 'none',
            }}
          />
        </div>

        <button
          data-testid="analyze-email-btn"
          onClick={handleAnalyze}
          disabled={analyzing || !emailText.trim()}
          style={{
            background: '#1C1917', color: '#fff',
            border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600,
            cursor: analyzing ? 'wait' : 'pointer', width: '100%', marginBottom: 20,
            opacity: analyzing || !emailText.trim() ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Sparkles size={14} />
          {analyzing ? 'Analyzing...' : 'Analyze with AI'}
        </button>

        {/* Results */}
        {result && !result.error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Type + Sentiment */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {typeInfo && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: typeInfo.bg, color: typeInfo.color }}>
                  {typeInfo.label}
                </span>
              )}
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: result.sentiment === 'positive' ? '#EAF2EC' : result.sentiment === 'negative' ? '#FDF2F1' : '#F0EDE6',
                color: result.sentiment === 'positive' ? '#2D6A4F' : result.sentiment === 'negative' ? '#B54A3F' : '#C0A882',
              }}>
                {result.sentiment}
              </span>
            </div>

            {/* Summary */}
            <div style={{ background: '#FFFFFF', borderRadius: 10, padding: 14, border: '1px solid #E5E0D8' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9B8B7A', marginBottom: 6 }}>Summary</div>
              <p style={{ fontSize: 12, color: '#444', lineHeight: 1.5, margin: 0 }}>{result.summary}</p>
            </div>

            {/* Sender */}
            {result.sender_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C0A882', fontSize: 11, fontWeight: 600 }}>
                  {result.sender_name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1C1917' }}>{result.sender_name}</div>
                  <div style={{ fontSize: 11, color: '#9B8B7A' }}>{result.sender_role} {result.sender_email ? `— ${result.sender_email}` : ''}</div>
                </div>
              </div>
            )}

            {/* Key dates */}
            {result.key_dates?.length > 0 && (
              <div style={{ fontSize: 11, color: '#1C1917' }}>
                <span style={{ fontWeight: 600 }}>Key dates: </span>
                {result.key_dates.join(', ')}
              </div>
            )}

            {/* Suggested status change */}
            {result.suggested_status && result.suggested_status !== job.status && (
              <div style={{ background: '#F7F5F0', borderRadius: 10, padding: 14, border: '1px solid #E5E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowRight size={14} style={{ color: '#C0A882' }} />
                  <span style={{ fontSize: 12, color: '#1C1917' }}>
                    Move to <strong>{result.suggested_status.replace('_', ' ')}</strong>?
                  </span>
                </div>
                {applied ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#2D6A4F' }}>
                    <CheckCircle size={12} /> Applied
                  </span>
                ) : (
                  <button
                    data-testid="apply-status-btn"
                    onClick={handleApplyStatus}
                    style={{ background: '#C0A882', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Apply
                  </button>
                )}
              </div>
            )}

            {/* Activity logged */}
            {result.suggested_activity && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#2D6A4F' }}>
                <CheckCircle size={12} /> Activity logged: "{result.suggested_activity}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
