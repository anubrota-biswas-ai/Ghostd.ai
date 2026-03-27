import { useState, useRef, useEffect, useCallback } from 'react';
import { FileSearch, Check, X, Copy, Download, ArrowRight, RotateCcw, FileUp, RefreshCw, Shield, User, Sparkles, Filter, Undo2, Redo2, Columns2, Pencil } from 'lucide-react';
import { api } from '@/lib/api';

const SCAN_MESSAGES = ['Parsing your CV...', 'Analyzing job requirements...', 'Matching skills and experience...', 'Generating improvement suggestions...', 'Calibrating ATS score...', 'Finalizing results...'];
const TONES = [{ id: 'professional', label: 'Professional' }, { id: 'conversational', label: 'Conversational' }, { id: 'confident', label: 'Confident' }, { id: 'enthusiastic', label: 'Enthusiastic' }];

/* ─── Score Ring SVG (UX12: scoreBump animation class) ─── */
function ScoreRing({ score, originalScore, size = 120, scoreBump }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(43,63,191,0.08)" strokeWidth="6" />
        {originalScore != null && <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(43,63,191,0.15)" strokeWidth="6" strokeDasharray={circ} strokeDashoffset={circ * (1 - originalScore / 100)} strokeLinecap="round" />}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2B3FBF" strokeWidth="6" strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className={scoreBump ? 'jf-score-bump' : ''} style={{ fontSize: 32, fontWeight: 300, color: '#1a1f3c', letterSpacing: '-0.04em', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: 'rgba(26,31,60,0.35)', marginTop: 2 }}>ATS score</span>
      </div>
    </div>
  );
}

/* ─── Suggestion Popover (Bug3: position above/below) ─── */
function SuggestionPopover({ suggestion, onAccept, onReject, onClose, positionAbove }) {
  const s = suggestion;
  const type = s.type || 'REPHRASE';
  const typeColors = { REPHRASE: { bg: 'rgba(43,63,191,0.08)', color: '#2B3FBF' }, ADD_SKILL: { bg: 'rgba(34,197,94,0.08)', color: '#16A34A' }, ADD_KEYWORD: { bg: 'rgba(34,197,94,0.08)', color: '#16A34A' }, REMOVE: { bg: 'rgba(239,68,68,0.08)', color: '#DC2626' } };
  const tc = typeColors[type] || typeColors.REPHRASE;
  const posStyle = positionAbove ? { bottom: '100%', left: 0, marginBottom: 4 } : { top: '100%', left: 0, marginTop: 4 };
  return (
    <div data-testid={`popover-${s.id}`} onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', zIndex: 60, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.90)', boxShadow: '0 8px 30px rgba(43,63,191,0.15)', padding: 16, maxWidth: 360, width: 'max-content', ...posStyle }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Sparkles size={11} style={{ color: '#2B3FBF' }} />
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 10, background: tc.bg, color: tc.color }}>{type.replace('_', ' ')}</span>
        {s.keyword && <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 8px', borderRadius: 10, background: 'rgba(43,63,191,0.06)', color: 'rgba(43,63,191,0.6)' }}>{s.keyword}</span>}
        <span style={{ fontSize: 9, color: 'rgba(26,31,60,0.3)', marginLeft: 'auto' }}>+{s.score_impact || 0} pts</span>
      </div>
      {s.original && <div style={{ background: 'rgba(239,68,68,0.04)', padding: '6px 10px', borderRadius: 6, marginBottom: 6 }}><span style={{ fontSize: 11, color: 'rgba(26,31,60,0.45)', textDecoration: 'line-through' }}>{s.original}</span></div>}
      {s.rewrite && <div style={{ background: 'rgba(34,197,94,0.06)', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid rgba(34,197,94,0.5)', marginBottom: 10 }}><span style={{ fontSize: 11, color: '#1a1f3c' }}>{s.rewrite}</span></div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onReject} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(43,63,191,0.12)', background: 'none', fontSize: 11, fontWeight: 600, color: '#8892b0', cursor: 'pointer' }}>Reject</button>
        <button onClick={onAccept} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#2B3FBF', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Accept</button>
      </div>
    </div>
  );
}

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
  /* Logic7: liveScore is DERIVED from liveAts + liveRecruiter */
  const [liveAts, setLiveAts] = useState(0);
  const [liveRecruiter, setLiveRecruiter] = useState(0);
  const [originalScore, setOriginalScore] = useState(0);
  const [originalAts, setOriginalAts] = useState(0);
  const [originalRecruiter, setOriginalRecruiter] = useState(0);
  const liveScore = Math.round(liveAts * 0.55 + liveRecruiter * 0.45);
  const [scoreBump, setScoreBump] = useState(false);
  const [tone, setTone] = useState('professional');
  const [coverContent, setCoverContent] = useState('');
  const [coverLetter, setCoverLetter] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cvFilename, setCvFilename] = useState('');
  const [regenIdx, setRegenIdx] = useState(null);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [activePopover, setActivePopover] = useState(null);
  const [leftTab, setLeftTab] = useState('skills');
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  /* Bug6: banner for loaded results */
  const [loadedBanner, setLoadedBanner] = useState(false);
  const fileInputRef = useRef(null);
  const resumeContainerRef = useRef(null);

  useEffect(() => { loadSavedResults(); loadSavedCoverLetter(); }, []);

  /* Bug6: Check if loaded results match current CV */
  const loadSavedResults = async () => {
    try {
      const saved = await api.getATSResults();
      if (saved) {
        setResults(saved);
        setResultsId(saved.id);
        const ats = saved.ats_score || 0;
        const rec = saved.recruiter_score || 0;
        setLiveAts(ats); setLiveRecruiter(rec);
        const derived = Math.round(ats * 0.55 + rec * 0.45);
        setOriginalScore(derived);
        setOriginalAts(ats); setOriginalRecruiter(rec);
        setSuggestions((saved.suggestions || []).map((s) => ({ ...s, status: (saved.accepted_suggestions || []).includes(s.id) ? 'accepted' : 'pending' })));
        if (saved.original_cv_text) setCvText(saved.original_cv_text);
        if (saved.jd_text) setJdText(saved.jd_text);
        setPhase('results');
        setLoadedBanner(true);
      }
    } catch {}
  };

  const loadSavedCoverLetter = async () => {
    try {
      const saved = await api.getCoverLetter();
      if (saved) { setCoverContent(saved.content || ''); setCoverLetter(saved); setTone(saved.tone || 'professional'); setCompany(saved.company || ''); }
    } catch {}
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setError('');
    try { const data = await api.uploadCVFile(file); setCvText(data.raw_text || ''); setCvFilename(data.filename || file.name); } catch (err) { setError(err.message || 'Upload failed'); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startAnalysis = async () => {
    if (!cvText.trim() || !jdText.trim()) return;
    setError(''); setPhase('scanning'); setScanPct(0); setCompareMode(false); setEditMode(false); setLoadedBanner(false);
    let progress = 0;
    const interval = setInterval(() => { progress += 1.2; setScanPct(Math.min(progress, 95)); setScanMsg(SCAN_MESSAGES[Math.floor(progress / 16) % SCAN_MESSAGES.length]); if (progress >= 95) clearInterval(interval); }, 60);
    try {
      const data = await api.analyzeCV(cvText, jdText, null);
      clearInterval(interval); setScanPct(100);
      if (data.error) { setError('AI could not parse the analysis.'); setPhase('input'); return; }
      setResults(data);
      const ats = data.ats_score || 0; const rec = data.recruiter_score || 0;
      setLiveAts(ats); setLiveRecruiter(rec);
      const derived = Math.round(ats * 0.55 + rec * 0.45);
      setOriginalScore(derived);
      setOriginalAts(ats); setOriginalRecruiter(rec);
      setSuggestions((data.suggestions || []).map((s) => ({ ...s, status: 'pending' })));
      setHistory([]); setHistoryIdx(-1);
      const comp = jdText.match(/(?:at|for|join)\s+([A-Z][a-zA-Z]+)/); setCompany(comp?.[1] || 'the company');
      try {
        const saved = await api.saveATSResults({ overall_score: data.overall_score, ats_score: data.ats_score, recruiter_score: data.recruiter_score, skills_score: data.skills_score, experience_score: data.experience_score, language_score: data.language_score, hard_skills: data.hard_skills, soft_skills: data.soft_skills, searchability: data.searchability, recruiter_tips: data.recruiter_tips, suggestions: data.suggestions, accepted_suggestions: [], original_cv_text: cvText, jd_text: jdText, summary: data.summary });
        setResultsId(saved.id);
      } catch {}
      setTimeout(() => setPhase('results'), 400);
    } catch (e) { clearInterval(interval); setError('Analysis failed.'); setPhase('input'); }
  };

  /* Logic7: Only update sub-scores; liveScore is derived. UX12: trigger scoreBump */
  const applySuggestionScore = useCallback((sug, accept) => {
    const impact = sug.score_impact || 2;
    const sign = accept ? 1 : -1;
    const atsWeight = ['skills', 'experience'].includes(sug.category) ? 0.7 : 0.3;
    setLiveAts((p) => Math.max(0, Math.min(100, Math.round(p + sign * impact * atsWeight))));
    setLiveRecruiter((p) => Math.max(0, Math.min(100, Math.round(p + sign * impact * (1 - atsWeight)))));
    setScoreBump(true); setTimeout(() => setScoreBump(false), 400);
  }, []);

  const acceptSuggestion = (id) => {
    const sug = suggestions.find((s) => s.id === id);
    if (!sug || sug.status !== 'pending') return;
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'accepted' } : s));
    applySuggestionScore(sug, true);
    setHistory((prev) => [...prev.slice(0, historyIdx + 1), { type: 'single', id, action: 'accept' }]);
    setHistoryIdx((prev) => prev + 1);
    setActivePopover(null);
  };

  const rejectSuggestion = (id) => {
    const sug = suggestions.find((s) => s.id === id);
    if (!sug || sug.status !== 'pending') return;
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'rejected' } : s));
    setHistory((prev) => [...prev.slice(0, historyIdx + 1), { type: 'single', id, action: 'reject' }]);
    setHistoryIdx((prev) => prev + 1);
    setActivePopover(null);
  };

  /* Bug4: Accept All pushes batch entry to history */
  const acceptAll = () => {
    const pendingIds = suggestions.filter((s) => s.status === 'pending').map((s) => s.id);
    if (pendingIds.length === 0) return;
    pendingIds.forEach((id) => { const sug = suggestions.find((s) => s.id === id); if (sug) applySuggestionScore(sug, true); });
    setSuggestions((prev) => prev.map((s) => s.status === 'pending' ? { ...s, status: 'accepted' } : s));
    setHistory((prev) => [...prev.slice(0, historyIdx + 1), { type: 'batch', ids: pendingIds, action: 'accept' }]);
    setHistoryIdx((prev) => prev + 1);
  };

  /* Bug4: Undo handles both single and batch entries */
  const undo = () => {
    if (historyIdx < 0) return;
    const entry = history[historyIdx];
    if (entry.type === 'batch') {
      entry.ids.forEach((id) => { const sug = suggestions.find((s) => s.id === id); if (sug) applySuggestionScore(sug, false); });
      setSuggestions((prev) => prev.map((s) => entry.ids.includes(s.id) ? { ...s, status: 'pending' } : s));
    } else {
      const sug = suggestions.find((s) => s.id === entry.id);
      if (sug) {
        if (entry.action === 'accept') { applySuggestionScore(sug, false); }
        setSuggestions((prev) => prev.map((s) => s.id === entry.id ? { ...s, status: 'pending' } : s));
      }
    }
    setHistoryIdx((prev) => prev - 1);
  };

  const redo = () => {
    if (historyIdx >= history.length - 1) return;
    const entry = history[historyIdx + 1];
    if (entry.type === 'batch') {
      entry.ids.forEach((id) => { const sug = suggestions.find((s) => s.id === id); if (sug) applySuggestionScore(sug, true); });
      setSuggestions((prev) => prev.map((s) => entry.ids.includes(s.id) ? { ...s, status: 'accepted' } : s));
    } else {
      const sug = suggestions.find((s) => s.id === entry.id);
      if (sug) {
        if (entry.action === 'accept') { applySuggestionScore(sug, true); setSuggestions((prev) => prev.map((s) => s.id === entry.id ? { ...s, status: 'accepted' } : s)); }
        else { setSuggestions((prev) => prev.map((s) => s.id === entry.id ? { ...s, status: 'rejected' } : s)); }
      }
    }
    setHistoryIdx((prev) => prev + 1);
  };

  const enterEditMode = () => { setEditText(buildOptimisedText()); setEditMode(true); setCompareMode(false); };

  /* Bug2: replaceAll via split/join */
  const buildOptimisedText = () => {
    let text = cvText;
    suggestions.filter((s) => s.status === 'accepted' && s.original).forEach((s) => { text = text.split(s.original).join(s.rewrite || ''); });
    const adds = suggestions.filter((s) => s.status === 'accepted' && (s.type || '') === 'ADD_SKILL' && !s.original);
    if (adds.length > 0) text += '\n' + adds.map((s) => s.rewrite || '').join('\n');
    return text;
  };

  /* Bug1: Remove faulty normalized match — use exact + trimmed only */
  const findInText = (text, original) => {
    if (!original) return -1;
    let idx = text.indexOf(original);
    if (idx !== -1) return idx;
    const trimmed = original.trim();
    if (trimmed !== original) { idx = text.indexOf(trimmed); }
    return idx;
  };

  const accepted = suggestions.filter((s) => s.status === 'accepted').length;
  const total = suggestions.length;
  const pending = suggestions.filter((s) => s.status === 'pending').length;
  const wordCount = coverContent ? coverContent.trim().split(/\s+/).filter(Boolean).length : 0;

  const generateLetter = async () => {
    if (!cvText.trim() || !jdText.trim()) return;
    setGenerating(true); setError('');
    try { const data = await api.generateCoverLetter(cvText, jdText, company || 'the company', tone); setCoverContent(data.letter || ''); setCoverLetter(data); await api.saveCoverLetter({ content: data.letter, tone, company: company || 'the company' }); } catch (e) { setError('Cover letter generation failed.'); }
    setGenerating(false);
  };
  const saveDraft = async () => { setSaving(true); try { await api.saveCoverLetter({ content: coverContent, tone, company }); } catch {} setSaving(false); };
  const regenerateParagraph = async (idx) => { const p = coverContent.split('\n\n'); if (!p[idx]) return; setRegenIdx(idx); try { const d = await api.regenerateSection(p[idx], regenInstruction, cvText, jdText); p[idx] = d.paragraph; setCoverContent(p.join('\n\n')); setRegenIdx(null); setRegenInstruction(''); } catch { setRegenIdx(null); } };
  const copyText = (text) => navigator.clipboard.writeText(text);
  const downloadText = (text, name) => { const b = new Blob([text], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); };

  /* ─── INPUT PANEL ─── */
  const InputPanel = () => (
    <div data-testid="ats-input-panel" style={{ width: 290, flexShrink: 0, padding: 18, background: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(12px)', borderRight: '1px solid rgba(255,255,255,0.90)', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>Your CV</div>
      <input type="file" ref={fileInputRef} accept=".pdf,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
      <button data-testid="cv-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer', border: cvFilename ? '1px solid rgba(43,63,191,0.35)' : '1px dashed rgba(43,63,191,0.25)', background: cvFilename ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: cvFilename ? '#2B3FBF' : '#8892b0' }}><FileUp size={14} />{uploading ? 'Uploading...' : cvFilename || 'Upload PDF or TXT'}</button>
      <textarea data-testid="cv-textarea" value={cvText} onChange={(e) => setCvText(e.target.value)} placeholder="Or paste your CV text..." style={{ width: '100%', minHeight: 120, padding: 10, fontSize: 11, fontFamily: 'Inter, sans-serif', border: cvText ? '1px solid rgba(43,63,191,0.35)' : '1px solid rgba(43,63,191,0.12)', borderRadius: 10, background: cvText ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.50)', color: '#1a1f3c', resize: 'vertical', outline: 'none' }} />
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>Job Description</div>
      <textarea data-testid="jd-textarea" value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the job description..." style={{ width: '100%', minHeight: 120, padding: 10, fontSize: 11, fontFamily: 'Inter, sans-serif', border: '1px solid rgba(43,63,191,0.06)', borderRadius: 10, background: 'rgba(255,255,255,0.50)', color: '#1a1f3c', resize: 'vertical', outline: 'none' }} />
      <button data-testid="analyze-btn" onClick={startAnalysis} disabled={phase === 'scanning' || !cvText.trim() || !jdText.trim()} style={{ background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: phase === 'scanning' ? 'wait' : 'pointer', width: '100%', opacity: (!cvText.trim() || !jdText.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><FileSearch size={14} />{phase === 'scanning' ? 'Analysing...' : 'One-click Optimise'}</button>
      {error && <div style={{ fontSize: 11, color: '#B91C1C', background: 'rgba(239,68,68,0.08)', padding: 8, borderRadius: 8 }}>{error}</div>}
    </div>
  );

  const ScanningView = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <ScoreRing score={Math.round(scanPct)} originalScore={null} />
      <div style={{ fontSize: 12, color: '#8892b0' }}>{scanMsg}</div>
    </div>
  );

  /* ─── RESULTS LEFT PANEL ─── */
  const ResultsLeftPanel = () => {
    const hs = results?.hard_skills || []; const ss = results?.soft_skills || [];
    const search = results?.searchability || []; const tips = results?.recruiter_tips || [];
    const hsMatched = hs.filter((s) => s.status === 'matched').length;
    const hsMissing = hs.filter((s) => s.status === 'missing').length;
    const ssMatched = ss.filter((s) => s.status === 'matched').length;
    const ssMissing = ss.filter((s) => s.status === 'missing').length;
    const searchPresent = search.filter((s) => s.status === 'present').length;
    const searchTotal = search.length;

    const SkillRow = ({ skill }) => {
      const hasSuggestion = suggestions.some((s) => (s.keyword || '').toLowerCase() === skill.name.toLowerCase() && s.status === 'pending');
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, background: skill.status === 'matched' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: skill.status === 'matched' ? '#16A34A' : '#DC2626' }}>{skill.status === 'matched' ? <Check size={9} /> : <X size={9} />}</span>
          <span style={{ fontSize: 12, color: '#1a1f3c', flex: 1 }}>{skill.name}</span>
          <span style={{ fontSize: 9, fontWeight: 500, padding: '1px 6px', borderRadius: 8, background: 'rgba(43,63,191,0.06)', color: 'rgba(43,63,191,0.5)' }}>{skill.cv_count || 0}/{skill.jd_count || 0}</span>
          {hasSuggestion && <span style={{ fontSize: 8, fontWeight: 600, color: '#2B3FBF', display: 'flex', alignItems: 'center', gap: 2 }}><Sparkles size={8} />AI</span>}
        </div>
      );
    };

    return (
      <div style={{ width: 280, flexShrink: 0, background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(12px)', borderRight: '1px solid rgba(255,255,255,0.90)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Score ring */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid rgba(43,63,191,0.07)' }}>
          <ScoreRing score={liveScore} originalScore={originalScore} scoreBump={scoreBump} />
          {/* UX13: Always show original score context */}
          <div style={{ fontSize: 11, color: 'rgba(26,31,60,0.5)', marginTop: 8 }}>
            {liveScore !== originalScore
              ? <>Original: {originalScore} → <span style={{ color: '#16A34A', fontWeight: 600 }}>Now: {liveScore}</span></>
              : <>Score: {originalScore}</>
            }
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: 'rgba(43,63,191,0.06)', color: 'rgba(43,63,191,0.6)' }}><Shield size={10} />ATS: {liveAts}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: 'rgba(43,63,191,0.06)', color: 'rgba(43,63,191,0.6)' }}><User size={10} />Recruiter: {liveRecruiter}</span>
          </div>
        </div>

        {/* Tabs — UX15: no progress bar on Tips */}
        <div style={{ display: 'flex', padding: '0 12px', borderBottom: '1px solid rgba(43,63,191,0.07)' }}>
          {[['skills', 'Skills', (hsMatched + ssMatched) / Math.max(1, hs.length + ss.length)], ['search', 'Searchability', searchPresent / Math.max(1, searchTotal)], ['tips', 'Tips', null]].map(([id, label, ratio]) => (
            <button key={id} onClick={() => setLeftTab(id)} style={{ fontSize: 11, fontWeight: 600, padding: '6px 0', cursor: 'pointer', color: leftTab === id ? '#2B3FBF' : 'rgba(26,31,60,0.35)', borderBottom: leftTab === id ? '2px solid #2B3FBF' : '2px solid transparent', background: 'none', border: 'none', position: 'relative', flex: 1, textAlign: 'center' }}>
              {label}
              {ratio !== null && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2, background: 'rgba(239,68,68,0.15)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${ratio * 100}%`, background: leftTab === id ? '#16A34A' : 'rgba(34,197,94,0.4)', borderRadius: 2 }} /></div>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
          {leftTab === 'skills' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(43,63,191,0.5)' }}>Hard Skills</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}>{hsMatched}</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#DC2626' }}>{hsMissing}</span>
              </div>
              {hs.filter((s) => !showMissingOnly || s.status === 'missing').map((s, i) => <SkillRow key={i} skill={s} />)}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(43,63,191,0.5)' }}>Soft Skills</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}>{ssMatched}</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#DC2626' }}>{ssMissing}</span>
              </div>
              {ss.filter((s) => !showMissingOnly || s.status === 'missing').map((s, i) => <SkillRow key={i} skill={s} />)}
              {/* UX14: filter badge count */}
              <button data-testid="toggle-missing" onClick={() => setShowMissingOnly(!showMissingOnly)} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: showMissingOnly ? '#2B3FBF' : '#8892b0', background: showMissingOnly ? 'rgba(43,63,191,0.06)' : 'none', border: '1px solid rgba(43,63,191,0.12)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                <Filter size={10} />{showMissingOnly ? 'Show all' : 'Missing only'}
                {(hsMissing + ssMissing) > 0 && <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#DC2626', color: '#fff', fontSize: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{hsMissing + ssMissing}</span>}
              </button>
            </>
          )}
          {leftTab === 'search' && search.map((item, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, background: item.status === 'present' ? 'rgba(34,197,94,0.12)' : item.status === 'weak' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.12)', color: item.status === 'present' ? '#16A34A' : item.status === 'weak' ? '#D97706' : '#DC2626' }}>{item.status === 'present' ? <Check size={9} /> : item.status === 'weak' ? '!' : <X size={9} />}</span>
                <span style={{ fontSize: 12, color: '#1a1f3c' }}>{item.label}</span>
              </div>
              {item.tip && <div style={{ fontSize: 10, color: 'rgba(26,31,60,0.4)', marginLeft: 24, marginTop: 2, lineHeight: 1.4 }}>{item.tip}</div>}
            </div>
          ))}
          {leftTab === 'tips' && tips.map((tip, i) => (
            <div key={i} style={{ marginBottom: 10, background: 'rgba(255,255,255,0.60)', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.90)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: tip.priority === 'high' ? 'rgba(239,68,68,0.12)' : tip.priority === 'medium' ? 'rgba(251,191,36,0.12)' : 'rgba(156,163,175,0.15)', color: tip.priority === 'high' ? '#DC2626' : tip.priority === 'medium' ? '#D97706' : '#9CA3AF', textTransform: 'uppercase' }}>{tip.priority}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1f3c' }}>{tip.label}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(26,31,60,0.5)', lineHeight: 1.4 }}>{tip.detail}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ─── INLINE RESUME ─── */
  const InlineResumeView = () => {
    const hasValidOriginal = (s) => !!(s.original && typeof s.original === 'string' && s.original.trim());
    /* Logic10: ADD_SKILL only when no valid original */
    const inlineSuggestions = suggestions.filter((s) => hasValidOriginal(s) && findInText(cvText, s.original) !== -1);
    const fallbackSuggestions = suggestions.filter((s) => hasValidOriginal(s) && findInText(cvText, s.original) === -1);
    const addSkills = suggestions.filter((s) => (s.type || '') === 'ADD_SKILL' && !hasValidOriginal(s));
    const noOriginalOther = suggestions.filter((s) => !hasValidOriginal(s) && (s.type || '') !== 'ADD_SKILL');

    const buildAnnotated = () => {
      let segments = [{ text: cvText, suggestionId: null }];
      inlineSuggestions.forEach((sug) => {
        const orig = sug.original || ''; if (!orig) return;
        const newSegments = [];
        segments.forEach((seg) => {
          if (seg.suggestionId) { newSegments.push(seg); return; }
          const idx = seg.text.indexOf(orig);
          if (idx === -1) { newSegments.push(seg); return; }
          if (idx > 0) newSegments.push({ text: seg.text.slice(0, idx), suggestionId: null });
          newSegments.push({ text: orig, suggestionId: sug.id });
          const after = seg.text.slice(idx + orig.length);
          if (after) newSegments.push({ text: after, suggestionId: null });
        });
        segments = newSegments;
      });
      return segments;
    };
    const segments = buildAnnotated();

    const getHighlightStyle = (sug) => {
      const type = sug.type || '';
      if (sug.status === 'accepted') return { background: 'rgba(34,197,94,0.12)', borderBottom: '2px solid #16A34A', cursor: 'pointer', borderRadius: 2, padding: '0 2px' };
      if (sug.status === 'rejected') return { opacity: 0.3, borderRadius: 2, padding: '0 2px' };
      if (type === 'REPHRASE') return { background: 'rgba(43,63,191,0.08)', borderBottom: '2px solid #2B3FBF', cursor: 'pointer', borderRadius: 2, padding: '0 2px' };
      if (type === 'ADD_KEYWORD') return { background: 'rgba(34,197,94,0.08)', fontWeight: 600, cursor: 'pointer', borderRadius: 2, padding: '0 2px' };
      if (type === 'REMOVE') return { background: 'rgba(239,68,68,0.08)', textDecoration: 'line-through', cursor: 'pointer', borderRadius: 2, padding: '0 2px' };
      return { background: 'rgba(43,63,191,0.06)', cursor: 'pointer', borderRadius: 2, padding: '0 2px' };
    };

    /* Bug3: check if highlight is near bottom */
    const shouldPositionAbove = (el) => {
      if (!el || !resumeContainerRef.current) return false;
      const rect = el.getBoundingClientRect();
      const containerRect = resumeContainerRef.current.getBoundingClientRect();
      return (containerRect.bottom - rect.bottom) < 220;
    };

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar — UX11: Re-run button, UX16: Download button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(43,63,191,0.07)', flexShrink: 0, background: 'rgba(255,255,255,0.50)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1f3c' }}>① Suggestions ({accepted}/{total})</span>
            <button onClick={enterEditMode} style={{ fontSize: 11, fontWeight: 600, color: '#2B3FBF', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}><Pencil size={10} /> ② Edit</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button data-testid="undo-btn" onClick={undo} disabled={historyIdx < 0} title="Undo" style={{ background: 'none', border: 'none', cursor: 'pointer', color: historyIdx < 0 ? 'rgba(26,31,60,0.2)' : '#8892b0', padding: 4 }}><Undo2 size={14} /></button>
            <button data-testid="redo-btn" onClick={redo} disabled={historyIdx >= history.length - 1} title="Redo" style={{ background: 'none', border: 'none', cursor: 'pointer', color: historyIdx >= history.length - 1 ? 'rgba(26,31,60,0.2)' : '#8892b0', padding: 4 }}><Redo2 size={14} /></button>
            <button data-testid="rerun-btn" onClick={() => setPhase('input')} title="Re-run Analysis" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8892b0', padding: 4 }}><RotateCcw size={14} /></button>
            <button title="Download optimised CV" onClick={() => downloadText(buildOptimisedText(), 'optimised_cv.txt')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8892b0', padding: 4 }}><Download size={14} /></button>
            <button data-testid="compare-btn" onClick={() => setCompareMode(true)} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(43,63,191,0.12)', background: 'none', fontSize: 11, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}><Columns2 size={12} />Compare</button>
            <button data-testid="accept-all-btn" onClick={acceptAll} disabled={pending === 0} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: pending > 0 ? '#2B3FBF' : 'rgba(43,63,191,0.15)', fontSize: 11, fontWeight: 600, color: '#fff', cursor: pending > 0 ? 'pointer' : 'default' }}>Accept All</button>
            <button onClick={enterEditMode} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>Continue <ArrowRight size={10} /></button>
          </div>
        </div>

        {/* Bug6: loaded banner */}
        {loadedBanner && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', background: 'rgba(43,63,191,0.04)', borderBottom: '1px solid rgba(43,63,191,0.07)', fontSize: 10, color: 'rgba(43,63,191,0.5)' }}>
            <span>Loaded previous results</span>
            <button onClick={() => { setPhase('input'); setResults(null); setSuggestions([]); setLoadedBanner(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2B3FBF', fontSize: 10, fontWeight: 600 }}>Clear</button>
          </div>
        )}

        {/* Resume text — UX17: click outside closes popover */}
        <div ref={resumeContainerRef} style={{ flex: 1, overflow: 'auto', padding: 20 }} onClick={() => setActivePopover(null)}>
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.95)', padding: 24, boxShadow: '0 2px 12px rgba(43,63,191,0.06)', fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1f3c', lineHeight: 1.7, whiteSpace: 'pre-wrap', position: 'relative' }}>
            {segments.map((seg, i) => {
              if (!seg.suggestionId) return <span key={i}>{seg.text}</span>;
              const sug = suggestions.find((s) => s.id === seg.suggestionId);
              if (!sug) return <span key={i}>{seg.text}</span>;
              return (
                <span key={i} ref={(el) => { if (activePopover === sug.id) sug._el = el; }} data-testid={`highlight-${sug.id}`} onClick={(e) => { e.stopPropagation(); setActivePopover(activePopover === sug.id ? null : sug.id); }} style={{ ...getHighlightStyle(sug), position: 'relative', display: 'inline' }}>
                  {sug.status === 'accepted' ? (sug.rewrite || seg.text) : seg.text}
                  {sug.status === 'accepted' && <Check size={10} style={{ color: '#16A34A', marginLeft: 2, verticalAlign: 'middle' }} />}
                  {activePopover === sug.id && sug.status === 'pending' && (
                    <SuggestionPopover suggestion={sug} onAccept={() => acceptSuggestion(sug.id)} onReject={() => rejectSuggestion(sug.id)} onClose={() => setActivePopover(null)} positionAbove={shouldPositionAbove(sug._el)} />
                  )}
                </span>
              );
            })}
            {addSkills.filter((s) => s.status === 'pending').length > 0 && (
              <div style={{ marginTop: 16, padding: '8px 12px', borderRadius: 8, border: '2px dashed rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#16A34A' }}>+ Add: </span>
                {addSkills.filter((s) => s.status === 'pending').map((s) => (
                  <span key={s.id} onClick={(e) => { e.stopPropagation(); acceptSuggestion(s.id); }} style={{ fontSize: 11, color: '#16A34A', cursor: 'pointer', marginRight: 8 }}>{s.rewrite || s.keyword || 'suggestion'}</span>
                ))}
              </div>
            )}
          </div>

          {/* Fallback + noOriginalOther suggestions */}
          {[...fallbackSuggestions, ...noOriginalOther].filter((s) => s.status === 'pending').length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 8 }}>Additional Suggestions</div>
              {[...fallbackSuggestions, ...noOriginalOther].filter((s) => s.status === 'pending').map((s) => (
                <div key={s.id} style={{ background: 'rgba(255,255,255,0.70)', borderRadius: 10, padding: 12, marginBottom: 8, border: '1px solid rgba(255,255,255,0.90)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: 'rgba(43,63,191,0.08)', color: '#2B3FBF' }}>{(s.type || 'REPHRASE').replace('_', ' ')}</span>
                    {s.keyword && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: 'rgba(43,63,191,0.04)', color: 'rgba(43,63,191,0.5)' }}>{s.keyword}</span>}
                    <span style={{ fontSize: 9, color: 'rgba(26,31,60,0.3)', marginLeft: 'auto' }}>+{s.score_impact || 0} pts</span>
                  </div>
                  {s.original && <div style={{ fontSize: 11, color: 'rgba(26,31,60,0.4)', textDecoration: 'line-through', marginBottom: 4 }}>{s.original}</div>}
                  <div style={{ fontSize: 11, color: '#1a1f3c', marginBottom: 8 }}>{s.rewrite || ''}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={(e) => { e.stopPropagation(); acceptSuggestion(s.id); }} style={{ padding: '3px 10px', borderRadius: 6, background: '#2B3FBF', color: '#fff', border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Apply</button>
                    <button onClick={(e) => { e.stopPropagation(); rejectSuggestion(s.id); }} style={{ padding: '3px 10px', borderRadius: 6, background: 'none', color: '#8892b0', border: '1px solid rgba(43,63,191,0.12)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Skip</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ─── COMPARE VIEW (Logic8: segment-based) ─── */
  const CompareView = () => {
    const hasValidOriginal = (s) => !!(s.original && typeof s.original === 'string' && s.original.trim());
    const acceptedInline = suggestions.filter((s) => s.status === 'accepted' && hasValidOriginal(s));

    const buildSegments = (isOrig) => {
      let segs = [{ text: cvText, changed: false }];
      acceptedInline.forEach((sug) => {
        const orig = sug.original || ''; if (!orig) return;
        const newSegs = [];
        segs.forEach((seg) => {
          if (seg.changed) { newSegs.push(seg); return; }
          const idx = seg.text.indexOf(orig);
          if (idx === -1) { newSegs.push(seg); return; }
          if (idx > 0) newSegs.push({ text: seg.text.slice(0, idx), changed: false });
          newSegs.push({ text: isOrig ? orig : (sug.rewrite || ''), changed: true });
          const after = seg.text.slice(idx + orig.length);
          if (after) newSegs.push({ text: after, changed: false });
        });
        segs = newSegs;
      });
      return segs;
    };

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid rgba(43,63,191,0.07)', background: 'rgba(255,255,255,0.50)' }}>
          <button data-testid="back-to-review-btn" onClick={() => setCompareMode(false)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(43,63,191,0.12)', background: 'none', fontSize: 11, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}>Back to review</button>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 16, overflow: 'auto' }}>
          {[{ title: 'Original', score: originalScore, isOrig: true }, { title: 'Optimised', score: liveScore, isOrig: false }].map(({ title, score, isOrig }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(8px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.90)', padding: 18, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>{title}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 8, background: isOrig ? 'rgba(43,63,191,0.06)' : 'rgba(34,197,94,0.12)', color: isOrig ? 'rgba(43,63,191,0.5)' : '#16A34A' }}>{score}</span>
              </div>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {buildSegments(isOrig).map((seg, i) => (
                  <span key={i} style={seg.changed ? (isOrig ? { background: 'rgba(239,68,68,0.10)', color: '#991B1B', textDecoration: 'line-through' } : { background: 'rgba(34,197,94,0.12)', color: '#166534', fontWeight: 500 }) : {}}>{seg.text}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const EditModeView = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(43,63,191,0.07)', background: 'rgba(255,255,255,0.50)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1f3c' }}>Edit Mode — make final adjustments</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => copyText(editText)} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(43,63,191,0.12)', background: 'none', fontSize: 11, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}><Copy size={10} />Copy</button>
          <button onClick={() => downloadText(editText, 'optimised_cv.txt')} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(43,63,191,0.12)', background: 'none', fontSize: 11, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}><Download size={10} />Download</button>
          <button onClick={() => setEditMode(false)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(43,63,191,0.12)', background: 'none', fontSize: 11, fontWeight: 600, color: '#8892b0', cursor: 'pointer' }}>Back</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
        <textarea data-testid="edit-textarea" value={editText} onChange={(e) => setEditText(e.target.value)} style={{ width: '100%', minHeight: '80%', padding: 24, fontSize: 12, fontFamily: 'Inter, sans-serif', lineHeight: 1.7, background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', borderRadius: 14, outline: 'none', color: '#1a1f3c', resize: 'vertical', boxShadow: '0 2px 12px rgba(43,63,191,0.06)' }} />
      </div>
    </div>
  );

  /* Cover Letter — unchanged */
  const CoverLetterView = () => (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 10 }}>Tone</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {TONES.map((t) => <button key={t.id} onClick={() => setTone(t.id)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tone === t.id ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.60)', border: tone === t.id ? '1px solid #2B3FBF' : '1px solid rgba(43,63,191,0.12)', color: tone === t.id ? '#2B3FBF' : 'rgba(26,31,60,0.5)' }}>{t.label}</button>)}
        </div>
        {company && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: 16 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} /><span style={{ fontSize: 11, fontWeight: 500, color: '#15803D' }}>Company: {company}</span></div>}
        <button onClick={() => { if (coverContent && !window.confirm('Re-generate will overwrite your edits. Continue?')) return; generateLetter(); }} disabled={generating || !cvText.trim() || !jdText.trim()} style={{ background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: generating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: generating || !cvText.trim() || !jdText.trim() ? 0.5 : 1, marginBottom: 20 }}>{generating ? 'Generating...' : coverContent ? 'Re-generate' : 'Generate Cover Letter'}</button>
        {coverContent && (
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.95)', padding: 24, boxShadow: '0 2px 12px rgba(43,63,191,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(43,63,191,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2B3FBF', fontWeight: 700, fontSize: 14 }}>{company?.[0] || 'C'}</div>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3c' }}>Cover Letter</div><div style={{ fontSize: 11, color: '#8892b0' }}>{company} — {tone}</div></div>
            </div>
            {coverContent.split('\n\n').map((para, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 8 }} onMouseEnter={(e) => { const btn = e.currentTarget.querySelector('.rg'); if (btn) btn.style.opacity = '1'; }} onMouseLeave={(e) => { const btn = e.currentTarget.querySelector('.rg'); if (btn) btn.style.opacity = '0'; }}>
                <div contentEditable suppressContentEditableWarning style={{ fontSize: 12, color: '#444', lineHeight: 1.7, padding: '4px 6px', borderRadius: 4, outline: 'none', border: '1px solid transparent', minHeight: 20 }} onBlur={(e) => { const p = coverContent.split('\n\n'); p[i] = e.target.innerText; setCoverContent(p.join('\n\n')); }}>{para}</div>
                <button className="rg" onClick={() => { if (regenIdx === i) regenerateParagraph(i); else setRegenIdx(i); }} style={{ position: 'absolute', top: 0, right: -28, opacity: 0, transition: 'opacity 0.15s', background: 'none', border: 'none', cursor: 'pointer', color: '#2B3FBF', padding: 2 }}><RefreshCw size={12} /></button>
                {regenIdx === i && <div style={{ display: 'flex', gap: 4, marginTop: 4 }}><input value={regenInstruction} onChange={(e) => setRegenInstruction(e.target.value)} placeholder="Optional instruction..." style={{ flex: 1, padding: '4px 8px', fontSize: 10, border: '1px solid rgba(43,63,191,0.15)', borderRadius: 6, outline: 'none' }} /><button onClick={() => regenerateParagraph(i)} style={{ fontSize: 10, fontWeight: 600, color: '#2B3FBF', background: 'none', border: 'none', cursor: 'pointer' }}>Go</button><button onClick={() => { setRegenIdx(null); setRegenInstruction(''); }} style={{ fontSize: 10, color: '#8892b0', background: 'none', border: 'none', cursor: 'pointer' }}>x</button></div>}
              </div>
            ))}
            <div style={{ fontSize: 10, color: 'rgba(26,31,60,0.35)', marginBottom: 12 }}>{wordCount} words</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={saveDraft} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, background: '#2B3FBF', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Draft'}</button>
              <button onClick={() => copyText(coverContent)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 12, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}><Copy size={12} />Copy</button>
              <button onClick={() => downloadText(coverContent, 'cover_letter.txt')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 12, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}><Download size={12} />Download</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ─── MAIN RENDER — Bug5: show input panel in all states ─── */
  return (
    <div data-testid="ats-checker-page" style={{ display: 'flex', height: '100%', overflow: 'hidden' }} onClick={() => setActivePopover(null)}>
      {phase !== 'results' && <InputPanel />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', padding: '0 20px', flexShrink: 0, background: 'rgba(255,255,255,0.50)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.90)' }}>
          {[['analysis', 'CV Analysis'], ['coverletter', 'Cover Letter']].map(([id, label]) => (
            <button key={id} data-testid={`ats-tab-${id}`} onClick={() => setMainTab(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: mainTab === id ? '#2B3FBF' : 'rgba(26,31,60,0.35)', borderBottom: mainTab === id ? '2px solid #2B3FBF' : '2px solid transparent' }}>{label}</button>
          ))}
        </div>
        {mainTab === 'analysis' && (
          <>
            {phase === 'input' && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}><div style={{ textAlign: 'center', maxWidth: 300 }}><FileSearch size={40} style={{ color: 'rgba(43,63,191,0.2)', marginBottom: 12 }} /><div style={{ fontSize: 15, fontWeight: 300, color: '#1a1f3c', letterSpacing: '-0.02em', marginBottom: 6 }}>Ready to analyse</div><p style={{ fontSize: 12, color: '#8892b0', lineHeight: 1.5 }}>Paste your CV and job description, then click "One-click Optimise".</p></div></div>}
            {phase === 'scanning' && <ScanningView />}
            {phase === 'results' && !compareMode && !editMode && <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}><ResultsLeftPanel /><InlineResumeView /></div>}
            {phase === 'results' && compareMode && <CompareView />}
            {phase === 'results' && editMode && <EditModeView />}
          </>
        )}
        {mainTab === 'coverletter' && <CoverLetterView />}
      </div>
    </div>
  );
}
