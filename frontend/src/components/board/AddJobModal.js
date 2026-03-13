import { useState } from 'react';
import { X, Sparkles, FileText } from 'lucide-react';
import useJobStore from '@/store/jobStore';
import { api } from '@/lib/api';

const STATUS_OPTIONS = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AddJobModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('paste');
  const [jdText, setJdText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', company: '', location: '', remote: false,
    url: '', salary_min: '', salary_max: '', currency: 'USD',
    status: 'wishlist', date_applied: '', jd_raw_text: '', notes: '',
  });

  const addJob = useJobStore((s) => s.addJob);

  if (!isOpen) return null;

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleParse = async () => {
    if (!jdText.trim()) return;
    setParsing(true);
    try {
      const parsed = await api.parseJD(jdText);
      if (!parsed.error) {
        setForm((f) => ({
          ...f,
          title: parsed.title || f.title,
          company: parsed.company || f.company,
          location: parsed.location || f.location,
          remote: parsed.remote ?? f.remote,
          salary_min: parsed.salary_min || '',
          salary_max: parsed.salary_max || '',
          currency: parsed.currency || 'USD',
          jd_raw_text: jdText,
        }));
        setTab('manual');
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
    setParsing(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.company) return;
    setSaving(true);
    try {
      await addJob({
        ...form,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        date_applied: form.date_applied || null,
      });
      onClose();
      resetForm();
    } catch (e) {
      console.error('Save error:', e);
    }
    setSaving(false);
  };

  const resetForm = () => {
    setForm({ title: '', company: '', location: '', remote: false, url: '', salary_min: '', salary_max: '', currency: 'USD', status: 'wishlist', date_applied: '', jd_raw_text: '', notes: '' });
    setJdText('');
    setTab('paste');
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', fontSize: 13,
    border: '1px solid rgba(43,63,191,0.12)', borderRadius: 8,
    background: 'rgba(255,255,255,0.60)', outline: 'none',
    color: '#1a1f3c', fontFamily: 'Inter, sans-serif',
  };

  const labelStyle = {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)',
    marginBottom: 4, display: 'block',
  };

  return (
    <div
      data-testid="add-job-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(26,31,60,0.20)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        data-testid="add-job-modal"
        style={{
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
          borderRadius: 16, border: '1px solid rgba(255,255,255,0.95)',
          boxShadow: '0 8px 40px rgba(43,63,191,0.15)',
          maxWidth: 540, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 300, color: '#1a1f3c', letterSpacing: '-0.03em' }}>
            Add Application
          </h2>
          <button data-testid="close-modal-btn" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8892b0', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid rgba(43,63,191,0.07)' }}>
          {[['paste', 'Paste JD', Sparkles], ['manual', 'Manual Entry', FileText]].map(([id, label, Icon]) => (
            <button
              key={id}
              data-testid={`tab-${id}`}
              onClick={() => setTab(id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 16px', fontSize: 12, fontWeight: 600,
                color: tab === id ? '#2B3FBF' : 'rgba(26,31,60,0.35)',
                borderBottom: tab === id ? '2px solid #2B3FBF' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Paste tab */}
        {tab === 'paste' && (
          <div>
            <label style={labelStyle}>Paste Job Description</label>
            <textarea
              data-testid="jd-paste-textarea"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the full job description here..."
              style={{ ...inputStyle, minHeight: 200, resize: 'vertical' }}
            />
            <button
              data-testid="parse-jd-btn"
              onClick={handleParse}
              disabled={parsing || !jdText.trim()}
              style={{
                background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontSize: 13, fontWeight: 600,
                cursor: parsing ? 'wait' : 'pointer', width: '100%', marginTop: 12,
                opacity: parsing || !jdText.trim() ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Sparkles size={14} />
              {parsing ? 'Parsing with AI...' : 'Parse with AI'}
            </button>
          </div>
        )}

        {/* Manual tab */}
        {tab === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Job Title *</label>
                <input data-testid="input-title" style={inputStyle} value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
              </div>
              <div>
                <label style={labelStyle}>Company *</label>
                <input data-testid="input-company" style={inputStyle} value={form.company} onChange={(e) => updateField('company', e.target.value)} placeholder="e.g. Stripe" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Location</label>
                <input style={inputStyle} value={form.location} onChange={(e) => updateField('location', e.target.value)} placeholder="e.g. San Francisco" />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select data-testid="input-status" style={inputStyle} value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Salary Min</label>
                <input style={inputStyle} type="number" value={form.salary_min} onChange={(e) => updateField('salary_min', e.target.value)} placeholder="e.g. 180000" />
              </div>
              <div>
                <label style={labelStyle}>Salary Max</label>
                <input style={inputStyle} type="number" value={form.salary_max} onChange={(e) => updateField('salary_max', e.target.value)} placeholder="e.g. 250000" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Date Applied</label>
                <input style={inputStyle} type="date" value={form.date_applied} onChange={(e) => updateField('date_applied', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>URL</label>
                <input style={inputStyle} value={form.url} onChange={(e) => updateField('url', e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Any notes..." />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.remote} onChange={(e) => updateField('remote', e.target.checked)} />
              <span style={{ fontSize: 12, color: '#1a1f3c' }}>Remote position</span>
            </div>
            <button
              data-testid="save-job-btn"
              onClick={handleSave}
              disabled={saving || !form.title || !form.company}
              style={{
                background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer', width: '100%',
                opacity: saving || !form.title || !form.company ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Application'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
