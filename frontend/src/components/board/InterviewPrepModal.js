import { useState, useEffect } from 'react';
import { X, Sparkles, MessageSquare, Building2, Lightbulb, CheckSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

export default function InterviewPrepModal({ isOpen, onClose, job }) {
  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedQ, setExpandedQ] = useState(null);
  const [notes, setNotes] = useState({});
  const [checkedItems, setCheckedItems] = useState([]);

  useEffect(() => {
    if (isOpen && job) {
      setPrep(null);
      setNotes({});
      setCheckedItems([]);
      loadPrep();
    }
    // eslint-disable-next-line
  }, [isOpen, job?.id]);

  const loadPrep = async () => {
    setLoading(true);
    try {
      const data = await api.getInterviewPrep(job.id);
      if (data) {
        setPrep(data);
        setNotes(data.user_notes || {});
        setCheckedItems(data.checked_items || []);
      }
    } catch {}
    setLoading(false);
  };

  const generatePrep = async () => {
    setGenerating(true);
    try {
      const data = await api.generateInterviewPrep(job.id, job.jd_raw_text || '');
      setPrep(data);
      setNotes(data.user_notes || {});
      setCheckedItems(data.checked_items || []);
    } catch (e) {
      console.error('Failed to generate prep:', e);
    }
    setGenerating(false);
  };

  const saveNotes = async (questionId, text) => {
    const newNotes = { ...notes, [questionId]: text };
    setNotes(newNotes);
    if (prep) {
      try { await api.updateInterviewPrep(prep.id, { user_notes: newNotes }); } catch {}
    }
  };

  const toggleCheck = async (index) => {
    const newChecked = checkedItems.includes(index)
      ? checkedItems.filter((i) => i !== index)
      : [...checkedItems, index];
    setCheckedItems(newChecked);
    if (prep) {
      try { await api.updateInterviewPrep(prep.id, { checked_items: newChecked }); } catch {}
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="interview-prep-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(26,31,60,0.20)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        data-testid="interview-prep-modal"
        style={{
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
          borderRadius: 16, border: '1px solid rgba(255,255,255,0.95)',
          boxShadow: '0 8px 40px rgba(43,63,191,0.15)',
          maxWidth: 680, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 28,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(43,63,191,0.5)', marginBottom: 4 }}>
              {job.company}
            </div>
            <div style={{ fontSize: 18, fontWeight: 300, color: '#1a1f3c', letterSpacing: '-0.03em' }}>
              Interview Prep
            </div>
          </div>
          <button data-testid="close-prep-btn" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8892b0', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="jf-spinner" />
          </div>
        ) : !prep ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <MessageSquare size={40} style={{ color: 'rgba(43,63,191,0.2)', marginBottom: 16 }} />
            <div style={{ fontSize: 15, fontWeight: 300, color: '#1a1f3c', letterSpacing: '-0.02em', marginBottom: 8 }}>
              No prep generated yet
            </div>
            <p style={{ fontSize: 12, color: '#8892b0', marginBottom: 20, lineHeight: 1.5 }}>
              Generate AI-powered interview questions, company research, and talking points for this role.
            </p>
            <button
              data-testid="generate-prep-btn"
              onClick={generatePrep}
              disabled={generating}
              style={{
                background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600,
                cursor: generating ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                opacity: generating ? 0.6 : 1,
              }}
            >
              <Sparkles size={14} />
              {generating ? 'Generating...' : 'Generate Interview Prep'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Company Research */}
            {prep.company_summary && (
              <div style={{ background: 'rgba(255,255,255,0.70)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.90)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Building2 size={14} style={{ color: '#2B3FBF' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>Company Research</span>
                </div>
                <p style={{ fontSize: 12, color: '#444', lineHeight: 1.6, margin: 0 }}>{prep.company_summary}</p>
              </div>
            )}

            {/* Questions */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MessageSquare size={14} style={{ color: '#2B3FBF' }} />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>
                  Interview Questions ({(prep.questions || []).length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(prep.questions || []).map((q) => {
                  const isExpanded = expandedQ === q.id;
                  return (
                    <div key={q.id} data-testid={`question-${q.id}`} style={{
                      background: 'rgba(255,255,255,0.70)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.90)', overflow: 'hidden',
                    }}>
                      <button
                        onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        {isExpanded
                          ? <ChevronDown size={14} style={{ color: '#2B3FBF', marginTop: 2, flexShrink: 0 }} />
                          : <ChevronRight size={14} style={{ color: '#8892b0', marginTop: 2, flexShrink: 0 }} />
                        }
                        <div style={{ flex: 1 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                            padding: '1px 6px', borderRadius: 4,
                            background: q.type === 'technical' ? 'rgba(43,63,191,0.08)' : 'rgba(251,191,36,0.15)',
                            color: q.type === 'technical' ? 'rgba(43,63,191,0.6)' : '#B45309',
                            display: 'inline-block', marginBottom: 4,
                          }}>{q.type}</span>
                          <div style={{ fontSize: 13, fontWeight: 400, color: '#1a1f3c', lineHeight: 1.4 }}>{q.question}</div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(43,63,191,0.07)' }}>
                          {q.hints && (
                            <div style={{ fontSize: 11, color: '#8892b0', fontStyle: 'italic', margin: '8px 0', padding: '6px 10px', background: 'rgba(43,63,191,0.04)', borderRadius: 6 }}>
                              Hint: {q.hints}
                            </div>
                          )}
                          <textarea
                            data-testid={`notes-${q.id}`}
                            value={notes[q.id] || ''}
                            onChange={(e) => setNotes({ ...notes, [q.id]: e.target.value })}
                            onBlur={(e) => saveNotes(q.id, e.target.value)}
                            placeholder="Write your notes for this question..."
                            style={{
                              width: '100%', minHeight: 60, padding: 10, fontSize: 12, fontFamily: 'Inter, sans-serif',
                              border: '1px solid rgba(43,63,191,0.10)', borderRadius: 8,
                              background: 'rgba(255,255,255,0.60)', resize: 'vertical', outline: 'none', color: '#1a1f3c',
                              marginTop: 8,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Talking Points */}
            {(prep.talking_points || []).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.70)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.90)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Lightbulb size={14} style={{ color: '#2B3FBF' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>
                    Talking Points — "Why this role?"
                  </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {prep.talking_points.map((point, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prep Checklist */}
            {(prep.prep_checklist || []).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.70)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.90)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <CheckSquare size={14} style={{ color: '#2B3FBF' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>
                    Prep Checklist
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {prep.prep_checklist.map((item, i) => (
                    <label key={i} data-testid={`checklist-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={checkedItems.includes(i)} onChange={() => toggleCheck(i)} style={{ accentColor: '#2B3FBF' }} />
                      <span style={{
                        fontSize: 12,
                        color: checkedItems.includes(i) ? '#8892b0' : '#1a1f3c',
                        textDecoration: checkedItems.includes(i) ? 'line-through' : 'none',
                      }}>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Regenerate */}
            <button
              data-testid="regenerate-prep-btn"
              onClick={generatePrep}
              disabled={generating}
              style={{
                background: 'none', border: '1px solid rgba(43,63,191,0.12)', borderRadius: 8,
                padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#2B3FBF',
                cursor: generating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                alignSelf: 'flex-start', opacity: generating ? 0.6 : 1,
              }}
            >
              <Sparkles size={12} />
              {generating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
