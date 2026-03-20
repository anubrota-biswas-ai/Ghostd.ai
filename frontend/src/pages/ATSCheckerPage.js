import { useState, useRef, useEffect } from 'react';
import { FileSearch, Check, X, Copy, Download, ArrowRight, RotateCcw, FileUp, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

const SCAN_MESSAGES = [
  'Parsing your CV...', 'Analyzing job requirements...',
  'Matching skills and experience...', 'Generating improvement suggestions...',
  'Finalizing your score...',
];
const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'conversational', label: 'Conversational' },
  { id: 'confident', label: 'Confident' },
  { id: 'enthusiastic', label: 'Enthusiastic' },
];

export default function ATSCheckerPage() {
  const [mainTab, setMainTab] = useState('analysis');
  const [cvText, setCvText] = useState('');
  const [jdText, setJdText] = useState('');
  const [phase, setPhase] = useState('input');
  const [scanPct, setScanPct] = useState(0);
  const [scanMsg, setScanMsg] = useState('');
  const [results, setResults] = useState(null);
  const [resultsId, setResultsId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [liveScore, setLiveScore] = useState(0);
  const [tone, setTone] = useState('professional');
  const [coverLetter, setCoverLetter] = useState(null);
  const [coverContent, setCoverContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cvFilename, setCvFilename] = useState('');
  const [regenIdx, setRegenIdx] = useState(null);
  const [regenInstruction, setRegenInstruction] = useState('');
  const fileInputRef = useRef(null);

  // Load saved results on mount
  useEffect(() => {
    loadSavedResults();
    loadSavedCoverLetter();
  }, []);

  const loadSavedResults = async () => {
    try {
      const saved = await api.getATSResults();
      if (saved) {
        setResults(saved);
        setResultsId(saved.id);
        setLiveScore(saved.overall_score || 0);
        setSuggestions((saved.suggestions || []).map((s) => ({
          ...s,
          status: (saved.accepted_suggestions || []).includes(s.id) ? 'accepted' : 'pending',
        })));
        if (saved.original_cv_text) setCvText(saved.original_cv_text);
        if (saved.jd_text) setJdText(saved.jd_text);
        setPhase('results');
      }
    } catch {}
  };

  const loadSavedCoverLetter = async () => {
    try {
      const saved = await api.getCoverLetter();
      if (saved) {
        setCoverContent(saved.content || '');
        setCoverLetter(saved);
        setTone(saved.tone || 'professional');
        setCompany(saved.company || '');
      }
    } catch {}
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = await api.uploadCVFile(file);
      setCvText(data.raw_text || '');
      setCvFilename(data.filename || file.name);
    } catch (err) {
      setError(err.message || 'File upload failed');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startAnalysis = async () => {
    if (!cvText.trim() || !jdText.trim()) return;
    setError('');
    setPhase('scanning');
    setScanPct(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 1.5;
      setScanPct(Math.min(progress, 95));
      setScanMsg(SCAN_MESSAGES[Math.floor(progress / 20) % SCAN_MESSAGES.length]);
      if (progress >= 95) clearInterval(interval);
    }, 60);
    try {
      const data = await api.analyzeCV(cvText, jdText, null);
      clearInterval(interval);
      setScanPct(100);
      if (data.error) { setError('AI could not parse the analysis.'); setPhase('input'); return; }
      setResults(data);
      setLiveScore(data.overall_score || 0);
      setSuggestions((data.suggestions || []).map((s) => ({ ...s, status: 'pending' })));
      const comp = jdText.match(/(?:at|for|join)\s+([A-Z][a-zA-Z]+)/);
      setCompany(comp?.[1] || 'the company');
      // Auto-save results (Phase 5)
      try {
        const saved = await api.saveATSResults({
          overall_score: data.overall_score, skills_score: data.skills_score,
          experience_score: data.experience_score, language_score: data.language_score,
          hard_skills: data.hard_skills, soft_skills: data.soft_skills,
          suggestions: data.suggestions, accepted_suggestions: [],
          original_cv_text: cvText, jd_text: jdText,
        });
        setResultsId(saved.id);
      } catch {}
      setTimeout(() => setPhase('results'), 400);
    } catch (e) {
      clearInterval(interval);
      setError('Analysis failed.');
      setPhase('input');
    }
  };

  const acceptSuggestion = async (id) => {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'accepted' } : s));
    setLiveScore((prev) => Math.min(100, prev + 2));
    if (resultsId) {
      const accepted = suggestions.filter((s) => s.status === 'accepted' || s.id === id).map((s) => s.id);
      try { await api.updateATSResults(resultsId, { accepted_suggestions: accepted }); } catch {}
    }
  };
  const rejectSuggestion = (id) => {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'rejected' } : s));
  };

  const generateLetter = async () => {
    if (!cvText.trim() || !jdText.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const data = await api.generateCoverLetter(cvText, jdText, company || 'the company', tone);
      setCoverContent(data.letter || '');
      setCoverLetter(data);
      // Auto-save
      await api.saveCoverLetter({ content: data.letter, tone, company: company || 'the company' });
    } catch (e) {
      setError('Cover letter generation failed.');
    }
    setGenerating(false);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await api.saveCoverLetter({ content: coverContent, tone, company });
    } catch {}
    setSaving(false);
  };

  const regenerateParagraph = async (idx) => {
    const paragraphs = coverContent.split('\n\n');
    if (!paragraphs[idx]) return;
    setRegenIdx(idx);
    try {
      const data = await api.regenerateSection(paragraphs[idx], regenInstruction, cvText, jdText);
      paragraphs[idx] = data.paragraph;
      setCoverContent(paragraphs.join('\n\n'));
      setRegenIdx(null);
      setRegenInstruction('');
    } catch {
      setRegenIdx(null);
    }
  };

  const copyLetter = () => { if (coverContent) navigator.clipboard.writeText(coverContent); };
  const downloadLetter = () => {
    if (!coverContent) return;
    const blob = new Blob([coverContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'cover_letter.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = coverContent ? coverContent.trim().split(/\s+/).filter(Boolean).length : 0;

  /* ─── Input Panel ─── */
  const InputPanel = () => (
    <div data-testid="ats-input-panel" style={{ width: 290, flexShrink: 0, padding: 18, background: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(12px)', borderRight: '1px solid rgba(255,255,255,0.90)', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>Your CV</div>
      <input type="file" ref={fileInputRef} accept=".pdf,.txt" onChange={handleFileUpload} style={{ display: 'none' }} data-testid="cv-file-input" />
      <button data-testid="cv-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer', border: cvFilename ? '1px solid rgba(43,63,191,0.35)' : '1px dashed rgba(43,63,191,0.25)', background: cvFilename ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: cvFilename ? '#2B3FBF' : '#8892b0' }}>
        <FileUp size={14} />{uploading ? 'Uploading...' : cvFilename ? cvFilename : 'Upload PDF or TXT'}
      </button>
      <textarea data-testid="cv-textarea" value={cvText} onChange={(e) => setCvText(e.target.value)} placeholder="Or paste your CV text here..." style={{ width: '100%', minHeight: 120, padding: 10, fontSize: 11, fontFamily: 'Inter, sans-serif', border: cvText ? '1px solid rgba(43,63,191,0.35)' : '1px solid rgba(43,63,191,0.12)', borderRadius: 10, background: cvText ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.50)', color: '#1a1f3c', resize: 'vertical', outline: 'none' }} />
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>Job Description</div>
      <textarea data-testid="jd-textarea" value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the job description..." style={{ width: '100%', minHeight: 120, padding: 10, fontSize: 11, fontFamily: 'Inter, sans-serif', border: '1px solid rgba(43,63,191,0.06)', borderRadius: 10, background: 'rgba(255,255,255,0.50)', color: '#1a1f3c', resize: 'vertical', outline: 'none' }} />
      <button data-testid="analyze-btn" onClick={startAnalysis} disabled={phase === 'scanning' || !cvText.trim() || !jdText.trim()} style={{ background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: phase === 'scanning' ? 'wait' : 'pointer', width: '100%', opacity: (!cvText.trim() || !jdText.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <FileSearch size={14} />{phase === 'scanning' ? 'Analysing...' : 'One-click Optimise'}
      </button>
      {error && <div style={{ fontSize: 11, color: '#B91C1C', background: 'rgba(239,68,68,0.08)', padding: 8, borderRadius: 8 }}>{error}</div>}
    </div>
  );

  /* ─── Scanning ─── */
  const ScanningView = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(43,63,191,0.10)" strokeWidth="4" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="#2B3FBF" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 54}`} strokeDashoffset={`${2 * Math.PI * 54 * (1 - scanPct / 100)}`} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, fontWeight: 300, color: '#1a1f3c', letterSpacing: '-0.04em' }}>{Math.round(scanPct)}%</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#8892b0' }}>{scanMsg}</div>
    </div>
  );

  /* ─── Score Card ─── */
  const ScoreCard = () => (
    <div data-testid="ats-score-card" style={{ background: 'linear-gradient(135deg, #2B3FBF, #1a2d9f)', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.40)', marginBottom: 4 }}>Overall Score</div>
        <div style={{ fontSize: 44, fontWeight: 300, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1 }}>{liveScore}%</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[{ l: 'Skills', v: results?.skills_score || 0 }, { l: 'Experience', v: results?.experience_score || 0 }, { l: 'Language', v: results?.language_score || 0 }].map((item) => (
          <div key={item.l}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.60)' }}>{item.l}</span><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.60)' }}>{item.v}%</span></div><div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }}><div style={{ height: '100%', width: `${item.v}%`, background: '#fff', borderRadius: 2 }} /></div></div>
        ))}
      </div>
    </div>
  );

  /* ─── Skills Grid ─── */
  const SkillsGrid = () => {
    const hs = results?.hard_skills || []; const ss = results?.soft_skills || [];
    const Dot = ({ status }) => {
      const cfg = status === 'matched' ? { bg: 'rgba(34,197,94,0.12)', color: '#16A34A' } : status === 'added' ? { bg: 'rgba(43,63,191,0.10)', color: '#2B3FBF' } : { bg: 'rgba(239,68,68,0.12)', color: '#DC2626' };
      return <span style={{ width: 16, height: 16, borderRadius: '50%', background: cfg.bg, color: cfg.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{status === 'missing' ? <X size={9} /> : <Check size={9} />}</span>;
    };
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[{ t: 'Hard Skills', items: hs }, { t: 'Soft Skills', items: ss }].map(({ t, items }) => (
          <div key={t} style={{ background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(8px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.90)', padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 12 }}>{t}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Dot status={s.status} /><span style={{ fontSize: 12, color: '#1a1f3c' }}>{s.name}</span></div>)}
              {items.length === 0 && <span style={{ fontSize: 11, color: 'rgba(26,31,60,0.35)' }}>None</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ─── Suggestions ─── */
  const SuggestionsPanel = () => (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 12 }}>Suggestions ({suggestions.filter((s) => s.status === 'pending').length} remaining)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {suggestions.map((s) => (
          <div key={s.id} data-testid={`suggestion-${s.id}`} style={{ background: 'rgba(255,255,255,0.82)', borderRadius: 12, padding: 14, boxShadow: '0 2px 12px rgba(43,63,191,0.06)', border: '1px solid rgba(255,255,255,0.95)', opacity: s.status === 'rejected' ? 0.5 : 1 }}>
            <div style={{ background: 'rgba(239,68,68,0.04)', padding: '6px 10px', borderRadius: 6, marginBottom: 8 }}><span style={{ fontSize: 12, color: 'rgba(26,31,60,0.45)', textDecoration: 'line-through' }}>{s.original}</span></div>
            <div style={{ background: 'rgba(34,197,94,0.06)', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid rgba(34,197,94,0.5)', marginBottom: 10 }}><span style={{ fontSize: 12, color: '#1a1f3c' }}>{s.rewrite}</span></div>
            {s.status === 'pending' && <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button onClick={() => rejectSuggestion(s.id)} style={{ background: 'none', border: '1px solid rgba(43,63,191,0.12)', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#8892b0', cursor: 'pointer' }}>Reject</button><button onClick={() => acceptSuggestion(s.id)} style={{ background: '#2B3FBF', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Accept</button></div>}
            {s.status !== 'pending' && <div style={{ fontSize: 10, fontWeight: 600, color: s.status === 'accepted' ? '#15803D' : '#B91C1C', textAlign: 'right' }}>{s.status === 'accepted' ? 'Accepted' : 'Rejected'}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  /* ─── Compare ─── */
  const CompareView = () => {
    const accepted = suggestions.filter((s) => s.status === 'accepted');
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[{ title: 'Original CV', isOriginal: true }, { title: 'Optimised CV', isOriginal: false }].map(({ title, isOriginal }) => (
          <div key={title} style={{ background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(8px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.90)', padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 10 }}>{title}</div>
            <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {cvText.split('\n').map((line, i) => {
                const match = accepted.find((s) => s.original && line.includes(s.original.substring(0, 20)));
                if (match) return <span key={i} style={isOriginal ? { background: 'rgba(239,68,68,0.10)', color: '#991B1B', textDecoration: 'line-through' } : { background: 'rgba(34,197,94,0.12)', color: '#166534', fontWeight: 500 }}>{isOriginal ? line : match.rewrite}{'\n'}</span>;
                return <span key={i}>{line}{'\n'}</span>;
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ─── Cover Letter (Phase 6) ─── */
  const CoverLetterView = () => (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 10 }}>Tone</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {TONES.map((t) => (
            <button key={t.id} data-testid={`tone-${t.id}`} onClick={() => setTone(t.id)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tone === t.id ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.60)', border: tone === t.id ? '1px solid #2B3FBF' : '1px solid rgba(43,63,191,0.12)', color: tone === t.id ? '#2B3FBF' : 'rgba(26,31,60,0.5)' }}>{t.label}</button>
          ))}
        </div>
        {company && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: 16 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} /><span style={{ fontSize: 11, fontWeight: 500, color: '#15803D' }}>Company: {company}</span></div>}

        <button data-testid="generate-letter-btn" onClick={() => { if (coverContent && !window.confirm('Re-generate will overwrite your edits. Continue?')) return; generateLetter(); }} disabled={generating || !cvText.trim() || !jdText.trim()} style={{ background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: generating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: generating || !cvText.trim() || !jdText.trim() ? 0.5 : 1, marginBottom: 20 }}>
          {generating ? 'Generating...' : coverContent ? 'Re-generate Letter' : 'Generate Cover Letter'}
        </button>

        {coverContent && (
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.95)', padding: 24, boxShadow: '0 2px 12px rgba(43,63,191,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(43,63,191,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2B3FBF', fontWeight: 700, fontSize: 14 }}>{company?.[0] || 'C'}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3c' }}>Cover Letter</div>
                <div style={{ fontSize: 11, color: '#8892b0' }}>{company} — {tone}</div>
              </div>
            </div>

            {/* Editable paragraphs */}
            <div style={{ marginBottom: 16 }}>
              {coverContent.split('\n\n').map((para, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: 8, group: true }} onMouseEnter={(e) => e.currentTarget.querySelector('.regen-btn')?.style.setProperty('opacity', '1')} onMouseLeave={(e) => e.currentTarget.querySelector('.regen-btn')?.style.setProperty('opacity', '0')}>
                  <div contentEditable suppressContentEditableWarning style={{ fontSize: 12, color: '#444', lineHeight: 1.7, padding: '4px 6px', borderRadius: 4, outline: 'none', border: '1px solid transparent', minHeight: 20 }}
                    onBlur={(e) => {
                      const paras = coverContent.split('\n\n');
                      paras[i] = e.target.innerText;
                      setCoverContent(paras.join('\n\n'));
                    }}>
                    {para}
                  </div>
                  <button className="regen-btn" onClick={() => { if (regenIdx === i) { regenerateParagraph(i); } else { setRegenIdx(i); } }} style={{ position: 'absolute', top: 0, right: -28, opacity: 0, transition: 'opacity 0.15s', background: 'none', border: 'none', cursor: 'pointer', color: '#2B3FBF', padding: 2 }} title="Regenerate paragraph"><RefreshCw size={12} /></button>
                  {regenIdx === i && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <input value={regenInstruction} onChange={(e) => setRegenInstruction(e.target.value)} placeholder="Optional: 'make more specific to React'" style={{ flex: 1, padding: '4px 8px', fontSize: 10, border: '1px solid rgba(43,63,191,0.15)', borderRadius: 6, outline: 'none' }} />
                      <button onClick={() => regenerateParagraph(i)} style={{ fontSize: 10, fontWeight: 600, color: '#2B3FBF', background: 'none', border: 'none', cursor: 'pointer' }}>Go</button>
                      <button onClick={() => { setRegenIdx(null); setRegenInstruction(''); }} style={{ fontSize: 10, color: '#8892b0', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Word count */}
            <div style={{ fontSize: 10, color: 'rgba(26,31,60,0.35)', marginBottom: 12 }}>{wordCount} words</div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button data-testid="save-draft-btn" onClick={saveDraft} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, background: '#2B3FBF', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button data-testid="copy-letter-btn" onClick={copyLetter} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 12, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}><Copy size={12} /> Copy</button>
              <button data-testid="download-letter-btn" onClick={downloadLetter} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 12, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}><Download size={12} /> Download</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ─── Results ─── */
  const ResultsView = () => (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>Analysis Results</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button data-testid="compare-btn" onClick={() => setPhase('compare')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}>Compare <ArrowRight size={12} /></button>
            <button data-testid="rerun-btn" onClick={() => { setPhase('input'); setResults(null); setSuggestions([]); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: 600, color: '#8892b0', cursor: 'pointer' }}><RotateCcw size={12} /> Re-run</button>
          </div>
        </div>
        <ScoreCard />
        <SkillsGrid />
        <SuggestionsPanel />
        {results?.summary && <div style={{ background: 'rgba(255,255,255,0.70)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.90)' }}><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 6 }}>Summary</div><p style={{ fontSize: 12, color: '#444', lineHeight: 1.5, margin: 0 }}>{results.summary}</p></div>}
      </div>
    </div>
  );

  return (
    <div data-testid="ats-checker-page" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <InputPanel />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', padding: '0 20px', flexShrink: 0, background: 'rgba(255,255,255,0.50)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.90)' }}>
          {[['analysis', 'CV Analysis'], ['coverletter', 'Cover Letter']].map(([id, label]) => (
            <button key={id} data-testid={`ats-tab-${id}`} onClick={() => setMainTab(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: mainTab === id ? '#2B3FBF' : 'rgba(26,31,60,0.35)', borderBottom: mainTab === id ? '2px solid #2B3FBF' : '2px solid transparent' }}>{label}</button>
          ))}
        </div>
        {mainTab === 'analysis' && (<>{phase === 'input' && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}><div style={{ textAlign: 'center', maxWidth: 300 }}><FileSearch size={40} style={{ color: 'rgba(43,63,191,0.2)', marginBottom: 12 }} /><div style={{ fontSize: 15, fontWeight: 300, color: '#1a1f3c', letterSpacing: '-0.02em', marginBottom: 6 }}>Ready to analyse</div><p style={{ fontSize: 12, color: '#8892b0', lineHeight: 1.5 }}>Paste your CV and job description, then click "One-click Optimise".</p></div></div>}{phase === 'scanning' && <ScanningView />}{phase === 'results' && <ResultsView />}{phase === 'compare' && <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>Compare Mode</div><button data-testid="back-to-results-btn" onClick={() => setPhase('results')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}>Back to Results</button></div><CompareView /></div>}</>)}
        {mainTab === 'coverletter' && <CoverLetterView />}
      </div>
    </div>
  );
}
