import { useState, useRef, useEffect, useCallback } from 'react';
import { FileSearch, Check, X, Copy, Download, ArrowRight, RotateCcw, FileUp, RefreshCw, Shield, User, Sparkles, Filter, Undo2, Redo2, Columns2, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

const SCAN_MESSAGES = ['Parsing your CV...', 'Analyzing job requirements...', 'Matching skills and experience...', 'Generating improvement suggestions...', 'Calibrating ATS score...', 'Finalizing results...'];
const TONES = [{ id: 'professional', label: 'Professional' }, { id: 'conversational', label: 'Conversational' }, { id: 'confident', label: 'Confident' }, { id: 'enthusiastic', label: 'Enthusiastic' }];
const CATEGORY_ORDER = ['summary', 'experience', 'skills', 'language'];
const CATEGORY_LABELS = { summary: 'Summary', experience: 'Experience', skills: 'Skills', language: 'Language' };

function ScoreRing({ score, originalScore, size = 120, scoreKey }) {
  const r = (size - 8) / 2, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(43,63,191,0.08)" strokeWidth="6" />
        {originalScore != null && <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(43,63,191,0.15)" strokeWidth="6" strokeDasharray={circ} strokeDashoffset={circ * (1 - originalScore / 100)} strokeLinecap="round" />}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2B3FBF" strokeWidth="6" strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span key={scoreKey} className="jf-score-bump" style={{ fontSize: 32, fontWeight: 300, color: '#1a1f3c', letterSpacing: '-0.04em', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: 'rgba(26,31,60,0.35)', marginTop: 2 }}>ATS score</span>
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
  const [liveAts, setLiveAts] = useState(0);
  const [liveRecruiter, setLiveRecruiter] = useState(0);
  const [originalScore, setOriginalScore] = useState(0);
  const [scoreKey, setScoreKey] = useState(0);
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
  const [leftTab, setLeftTab] = useState('skills');
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [rightView, setRightView] = useState('suggestions'); // suggestions | preview
  const [compareMode, setCompareMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [collapsedSections, setCollapsedSections] = useState({});
  const fileInputRef = useRef(null);

  const liveScore = Math.round(liveAts * 0.55 + liveRecruiter * 0.45);

  useEffect(() => { loadSavedResults(); loadSavedCoverLetter(); }, []);

  const loadSavedResults = async () => {
    try {
      const saved = await api.getATSResults();
      if (saved) {
        setResults(saved); setResultsId(saved.id);
        const a = saved.ats_score || 0, r = saved.recruiter_score || 0;
        setLiveAts(a); setLiveRecruiter(r);
        setOriginalScore(Math.round(a * 0.55 + r * 0.45));
        setSuggestions((saved.suggestions || []).map((s) => ({ ...s, status: (saved.accepted_suggestions || []).includes(s.id) ? 'accepted' : 'pending' })));
        if (saved.original_cv_text) setCvText(saved.original_cv_text);
        if (saved.jd_text) setJdText(saved.jd_text);
        setPhase('results');
      }
    } catch {}
  };

  const loadSavedCoverLetter = async () => {
    try { const s = await api.getCoverLetter(); if (s) { setCoverContent(s.content || ''); setCoverLetter(s); setTone(s.tone || 'professional'); setCompany(s.company || ''); } } catch {}
  };

  const handleFileUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true); setError('');
    try { const d = await api.uploadCVFile(f); setCvText(d.raw_text || ''); setCvFilename(d.filename || f.name); } catch (err) { setError(err.message || 'Upload failed'); }
    setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startAnalysis = async () => {
    if (!cvText.trim() || !jdText.trim()) return;
    setError(''); setPhase('scanning'); setScanPct(0); setCompareMode(false); setEditMode(false); setRightView('suggestions');
    let progress = 0;
    const interval = setInterval(() => { progress += 1.2; setScanPct(Math.min(progress, 95)); setScanMsg(SCAN_MESSAGES[Math.floor(progress / 16) % SCAN_MESSAGES.length]); if (progress >= 95) clearInterval(interval); }, 60);
    try {
      const data = await api.analyzeCV(cvText, jdText, null);
      clearInterval(interval); setScanPct(100);
      if (data.error) { setError('AI could not parse the analysis.'); setPhase('input'); return; }
      setResults(data);
      const a = data.ats_score || 0, r = data.recruiter_score || 0;
      setLiveAts(a); setLiveRecruiter(r); setOriginalScore(Math.round(a * 0.55 + r * 0.45));
      setSuggestions((data.suggestions || []).map((s) => ({ ...s, status: 'pending' })));
      setHistory([]); setHistoryIdx(-1); setCollapsedSections({});
      const comp = jdText.match(/(?:at|for|join)\s+([A-Z][a-zA-Z]+)/); setCompany(comp?.[1] || 'the company');
      try {
        const sv = await api.saveATSResults({ overall_score: data.overall_score, ats_score: a, recruiter_score: r, skills_score: data.skills_score, experience_score: data.experience_score, language_score: data.language_score, hard_skills: data.hard_skills, soft_skills: data.soft_skills, searchability: data.searchability, recruiter_tips: data.recruiter_tips, suggestions: data.suggestions, accepted_suggestions: [], original_cv_text: cvText, jd_text: jdText, summary: data.summary });
        setResultsId(sv.id);
      } catch {}
      setTimeout(() => setPhase('results'), 400);
    } catch { clearInterval(interval); setError('Analysis failed.'); setPhase('input'); }
  };

  const applySuggestionScore = useCallback((sug, accept) => {
    const impact = sug.score_impact || 2;
    const sign = accept ? 1 : -1;
    const atsW = ['skills', 'experience'].includes(sug.category) ? 0.7 : 0.3;
    const atsI = Math.round(impact * atsW), recI = impact - atsI;
    setLiveAts((p) => Math.max(0, Math.min(100, p + sign * atsI)));
    setLiveRecruiter((p) => Math.max(0, Math.min(100, p + sign * recI)));
    setScoreKey((p) => p + 1);
  }, []);

  const calcDisplayImpact = (sug) => {
    const impact = sug.score_impact || 2;
    const atsW = ['skills', 'experience'].includes(sug.category) ? 0.7 : 0.3;
    const atsI = Math.round(impact * atsW), recI = impact - atsI;
    return Math.max(1, Math.round(atsI * 0.55 + recI * 0.45));
  };

  const acceptSuggestion = (id) => {
    const sug = suggestions.find((s) => s.id === id); if (!sug || sug.status !== 'pending') return;
    setSuggestions((p) => p.map((s) => s.id === id ? { ...s, status: 'accepted' } : s));
    applySuggestionScore(sug, true);
    setHistory((p) => [...p.slice(0, historyIdx + 1), { type: 'single', id, action: 'accept' }]);
    setHistoryIdx((p) => p + 1);
  };

  const rejectSuggestion = (id) => {
    const sug = suggestions.find((s) => s.id === id); if (!sug || sug.status !== 'pending') return;
    setSuggestions((p) => p.map((s) => s.id === id ? { ...s, status: 'rejected' } : s));
    setHistory((p) => [...p.slice(0, historyIdx + 1), { type: 'single', id, action: 'reject' }]);
    setHistoryIdx((p) => p + 1);
  };

  const acceptAll = () => {
    const ids = suggestions.filter((s) => s.status === 'pending').map((s) => s.id); if (!ids.length) return;
    ids.forEach((id) => { const sug = suggestions.find((s) => s.id === id); if (sug) applySuggestionScore(sug, true); });
    setSuggestions((p) => p.map((s) => s.status === 'pending' ? { ...s, status: 'accepted' } : s));
    setHistory((p) => [...p.slice(0, historyIdx + 1), { type: 'batch', ids, action: 'accept' }]);
    setHistoryIdx((p) => p + 1);
  };

  const undo = () => {
    if (historyIdx < 0) return;
    const e = history[historyIdx];
    if (e.type === 'batch') { e.ids.forEach((id) => { const s = suggestions.find((x) => x.id === id); if (s) applySuggestionScore(s, false); }); setSuggestions((p) => p.map((s) => e.ids.includes(s.id) ? { ...s, status: 'pending' } : s)); }
    else { const s = suggestions.find((x) => x.id === e.id); if (s && e.action === 'accept') applySuggestionScore(s, false); setSuggestions((p) => p.map((x) => x.id === e.id ? { ...x, status: 'pending' } : x)); }
    setHistoryIdx((p) => p - 1);
  };

  const redo = () => {
    if (historyIdx >= history.length - 1) return;
    const e = history[historyIdx + 1];
    if (e.type === 'batch') { e.ids.forEach((id) => { const s = suggestions.find((x) => x.id === id); if (s) applySuggestionScore(s, true); }); setSuggestions((p) => p.map((s) => e.ids.includes(s.id) ? { ...s, status: 'accepted' } : s)); }
    else { const s = suggestions.find((x) => x.id === e.id); if (s) { if (e.action === 'accept') { applySuggestionScore(s, true); setSuggestions((p) => p.map((x) => x.id === e.id ? { ...x, status: 'accepted' } : x)); } else { setSuggestions((p) => p.map((x) => x.id === e.id ? { ...x, status: 'rejected' } : x)); } } }
    setHistoryIdx((p) => p + 1);
  };

  const buildOptimisedText = () => {
    let t = cvText;
    suggestions.filter((s) => s.status === 'accepted' && s.original).forEach((s) => { t = t.split(s.original).join(s.rewrite || ''); });
    const adds = suggestions.filter((s) => s.status === 'accepted' && (s.type || '') === 'ADD_SKILL' && !s.original);
    if (adds.length) t += '\n' + adds.map((s) => s.rewrite || '').join('\n');
    return t;
  };

  const enterEditMode = () => { setEditText(buildOptimisedText()); setEditMode(true); setCompareMode(false); };
  const copyText = (t) => navigator.clipboard.writeText(t);
  const downloadText = (t, n) => { const b = new Blob([t], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = n; a.click(); URL.revokeObjectURL(u); };

  const accepted = suggestions.filter((s) => s.status === 'accepted').length;
  const total = suggestions.length;
  const pending = suggestions.filter((s) => s.status === 'pending').length;
  const wordCount = coverContent ? coverContent.trim().split(/\s+/).filter(Boolean).length : 0;

  const generateLetter = async () => { if (!cvText.trim() || !jdText.trim()) return; setGenerating(true); setError(''); try { const d = await api.generateCoverLetter(cvText, jdText, company || 'the company', tone); setCoverContent(d.letter || ''); setCoverLetter(d); await api.saveCoverLetter({ content: d.letter, tone, company: company || 'the company' }); } catch { setError('Cover letter generation failed.'); } setGenerating(false); };
  const saveDraft = async () => { setSaving(true); try { await api.saveCoverLetter({ content: coverContent, tone, company }); } catch {} setSaving(false); };
  const regenerateParagraph = async (idx) => { const p = coverContent.split('\n\n'); if (!p[idx]) return; setRegenIdx(idx); try { const d = await api.regenerateSection(p[idx], regenInstruction, cvText, jdText); p[idx] = d.paragraph; setCoverContent(p.join('\n\n')); setRegenIdx(null); setRegenInstruction(''); } catch { setRegenIdx(null); } };

  /* ═══════════════ INPUT STATE ═══════════════ */
  const InputView = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>Your CV</div>
          <input type="file" ref={fileInputRef} accept=".pdf,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          <button data-testid="cv-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ width: '100%', padding: 10, borderRadius: 10, cursor: 'pointer', border: cvFilename ? '1px solid rgba(43,63,191,0.35)' : '1px dashed rgba(43,63,191,0.25)', background: cvFilename ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: cvFilename ? '#2B3FBF' : '#8892b0' }}><FileUp size={14} />{uploading ? 'Uploading...' : cvFilename || 'Upload PDF or TXT'}</button>
          <textarea data-testid="cv-textarea" value={cvText} onChange={(e) => setCvText(e.target.value)} placeholder="Or paste your CV text here..." style={{ flex: 1, minHeight: 280, padding: 14, fontSize: 12, fontFamily: 'Inter, sans-serif', border: cvText ? '1px solid rgba(43,63,191,0.25)' : '1px solid rgba(43,63,191,0.10)', borderRadius: 12, background: cvText ? 'rgba(43,63,191,0.03)' : 'rgba(255,255,255,0.50)', color: '#1a1f3c', resize: 'vertical', outline: 'none', lineHeight: 1.6 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>Job Description</div>
          <div style={{ height: 42 }} /> {/* spacer to align with upload button */}
          <textarea data-testid="jd-textarea" value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the job description here..." style={{ flex: 1, minHeight: 280, padding: 14, fontSize: 12, fontFamily: 'Inter, sans-serif', border: '1px solid rgba(43,63,191,0.10)', borderRadius: 12, background: 'rgba(255,255,255,0.50)', color: '#1a1f3c', resize: 'vertical', outline: 'none', lineHeight: 1.6 }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
        <button data-testid="analyze-btn" onClick={startAnalysis} disabled={phase === 'scanning' || !cvText.trim() || !jdText.trim()} style={{ background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 40px', fontSize: 14, fontWeight: 600, cursor: phase === 'scanning' ? 'wait' : 'pointer', maxWidth: 400, width: '100%', opacity: (!cvText.trim() || !jdText.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FileSearch size={16} />One-click Optimise</button>
      </div>
      {error && <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#B91C1C', background: 'rgba(239,68,68,0.08)', padding: 10, borderRadius: 8 }}>{error}</div>}
    </div>
  );

  /* ═══════════════ RESULTS LEFT PANEL ═══════════════ */
  const ResultsLeftPanel = () => {
    const hs = results?.hard_skills || [], ss = results?.soft_skills || [];
    const search = results?.searchability || [], tips = results?.recruiter_tips || [];
    const hsM = hs.filter((s) => s.status === 'matched').length, hsX = hs.filter((s) => s.status === 'missing').length;
    const ssM = ss.filter((s) => s.status === 'matched').length, ssX = ss.filter((s) => s.status === 'missing').length;
    const sP = search.filter((s) => s.status === 'present').length, sT = search.length;

    const SkillRow = ({ skill }) => {
      const hasAI = suggestions.some((s) => (s.keyword || '').toLowerCase() === skill.name.toLowerCase() && s.status === 'pending');
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, background: skill.status === 'matched' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: skill.status === 'matched' ? '#16A34A' : '#DC2626' }}>{skill.status === 'matched' ? <Check size={9} /> : <X size={9} />}</span>
          <span style={{ fontSize: 12, color: '#1a1f3c', flex: 1 }}>{skill.name}</span>
          <span style={{ fontSize: 9, fontWeight: 500, padding: '1px 6px', borderRadius: 8, background: 'rgba(43,63,191,0.06)', color: 'rgba(43,63,191,0.5)' }}>{skill.cv_count || 0}/{skill.jd_count || 0}</span>
          {hasAI && <span style={{ fontSize: 8, fontWeight: 600, color: '#2B3FBF', display: 'flex', alignItems: 'center', gap: 2 }}><Sparkles size={8} />AI</span>}
        </div>
      );
    };

    return (
      <div style={{ width: 280, flexShrink: 0, background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(12px)', borderRight: '1px solid rgba(255,255,255,0.90)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid rgba(43,63,191,0.07)' }}>
          <ScoreRing score={liveScore} originalScore={originalScore} scoreKey={scoreKey} />
          <div style={{ fontSize: 11, color: 'rgba(26,31,60,0.5)', marginTop: 8 }}>
            {liveScore !== originalScore ? <>Original: {originalScore} → <span style={{ color: '#16A34A', fontWeight: 600 }}>Now: {liveScore}</span></> : <>Score: {originalScore}</>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: 'rgba(43,63,191,0.06)', color: 'rgba(43,63,191,0.6)' }}><Shield size={10} />ATS: {liveAts}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: 'rgba(43,63,191,0.06)', color: 'rgba(43,63,191,0.6)' }}><User size={10} />Recruiter: {liveRecruiter}</span>
          </div>
        </div>
        <div style={{ display: 'flex', padding: '0 12px', borderBottom: '1px solid rgba(43,63,191,0.07)' }}>
          {[['skills', 'Skills', (hsM + ssM) / Math.max(1, hs.length + ss.length)], ['search', 'Searchability', sP / Math.max(1, sT)], ['tips', 'Tips', null]].map(([id, label, ratio]) => (
            <button key={id} onClick={() => setLeftTab(id)} style={{ fontSize: 11, fontWeight: 600, padding: '6px 0', cursor: 'pointer', color: leftTab === id ? '#2B3FBF' : 'rgba(26,31,60,0.35)', borderBottom: leftTab === id ? '2px solid #2B3FBF' : '2px solid transparent', background: 'none', border: 'none', position: 'relative', flex: 1, textAlign: 'center' }}>
              {label}
              {ratio !== null && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2, background: 'rgba(239,68,68,0.15)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${ratio * 100}%`, background: leftTab === id ? '#16A34A' : 'rgba(34,197,94,0.4)', borderRadius: 2 }} /></div>}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
          {leftTab === 'skills' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(43,63,191,0.5)' }}>Hard Skills</span><span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}>{hsM}</span><span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#DC2626' }}>{hsX}</span></div>
            {hs.filter((s) => !showMissingOnly || s.status === 'missing').map((s, i) => <SkillRow key={i} skill={s} />)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(43,63,191,0.5)' }}>Soft Skills</span><span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}>{ssM}</span><span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#DC2626' }}>{ssX}</span></div>
            {ss.filter((s) => !showMissingOnly || s.status === 'missing').map((s, i) => <SkillRow key={i} skill={s} />)}
            <button data-testid="toggle-missing" onClick={() => setShowMissingOnly(!showMissingOnly)} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: showMissingOnly ? '#2B3FBF' : '#8892b0', background: showMissingOnly ? 'rgba(43,63,191,0.06)' : 'none', border: '1px solid rgba(43,63,191,0.12)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}><Filter size={10} />{showMissingOnly ? 'Show all' : 'Missing only'}{(hsX + ssX) > 0 && <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#DC2626', color: '#fff', fontSize: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{hsX + ssX}</span>}</button>
          </>)}
          {leftTab === 'search' && search.map((item, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, background: item.status === 'present' ? 'rgba(34,197,94,0.12)' : item.status === 'weak' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.12)', color: item.status === 'present' ? '#16A34A' : item.status === 'weak' ? '#D97706' : '#DC2626' }}>{item.status === 'present' ? <Check size={9} /> : item.status === 'weak' ? '!' : <X size={9} />}</span><span style={{ fontSize: 12, color: '#1a1f3c' }}>{item.label}</span></div>
              {item.tip && <div style={{ fontSize: 10, color: 'rgba(26,31,60,0.4)', marginLeft: 24, marginTop: 2, lineHeight: 1.4 }}>{item.tip}</div>}
            </div>
          ))}
          {leftTab === 'tips' && tips.map((tip, i) => (
            <div key={i} style={{ marginBottom: 10, background: 'rgba(255,255,255,0.60)', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.90)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: tip.priority === 'high' ? 'rgba(239,68,68,0.12)' : tip.priority === 'medium' ? 'rgba(251,191,36,0.12)' : 'rgba(156,163,175,0.15)', color: tip.priority === 'high' ? '#DC2626' : tip.priority === 'medium' ? '#D97706' : '#9CA3AF', textTransform: 'uppercase' }}>{tip.priority}</span><span style={{ fontSize: 12, fontWeight: 600, color: '#1a1f3c' }}>{tip.label}</span></div>
              <div style={{ fontSize: 11, color: 'rgba(26,31,60,0.5)', lineHeight: 1.4 }}>{tip.detail}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ═══════════════ SUGGESTIONS VIEW ═══════════════ */
  const SuggestionsView = () => {
    const grouped = {};
    suggestions.forEach((s) => { const c = s.category || 'language'; if (!grouped[c]) grouped[c] = []; grouped[c].push(s); });
    const typeColors = { REPHRASE: { bg: 'rgba(43,63,191,0.08)', color: '#2B3FBF' }, ADD_SKILL: { bg: 'rgba(34,197,94,0.08)', color: '#16A34A' }, ADD_KEYWORD: { bg: 'rgba(34,197,94,0.08)', color: '#16A34A' }, REMOVE: { bg: 'rgba(239,68,68,0.08)', color: '#DC2626' } };

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => {
          const items = grouped[cat];
          const isCollapsed = collapsedSections[cat];
          return (
            <div key={cat} style={{ marginBottom: 16 }}>
              <button onClick={() => setCollapsedSections((p) => ({ ...p, [cat]: !p[cat] }))} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, padding: 0 }}>
                {isCollapsed ? <ChevronRight size={14} style={{ color: '#8892b0' }} /> : <ChevronDown size={14} style={{ color: '#2B3FBF' }} />}
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>{CATEGORY_LABELS[cat] || cat}</span>
                <span style={{ fontSize: 9, color: 'rgba(26,31,60,0.3)' }}>({items.length} suggestions)</span>
              </button>
              {!isCollapsed && items.map((s) => {
                const type = s.type || 'REPHRASE';
                const tc = typeColors[type] || typeColors.REPHRASE;
                const isAccepted = s.status === 'accepted';
                const isRejected = s.status === 'rejected';
                const isPending = s.status === 'pending';
                return (
                  <div key={s.id} data-testid={`suggestion-card-${s.id}`} style={{
                    background: isAccepted ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.70)',
                    border: `1px solid ${isAccepted ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.90)'}`,
                    borderRadius: 12, padding: 14, marginBottom: 8, opacity: isRejected ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 8px', borderRadius: 10, background: tc.bg, color: tc.color }}>{type.replace('_', ' ')}</span>
                      {s.keyword && <span style={{ fontSize: 9, fontWeight: 500, padding: '1px 8px', borderRadius: 10, background: 'rgba(43,63,191,0.06)', color: 'rgba(43,63,191,0.6)' }}>{s.keyword}</span>}
                      <span style={{ fontSize: 9, color: 'rgba(26,31,60,0.3)', marginLeft: 'auto' }}>+{calcDisplayImpact(s)} pts</span>
                    </div>
                    {/* Current text */}
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: 'rgba(26,31,60,0.35)', marginBottom: 2 }}>Current:</div>
                      {s.original ? (
                        <div style={{ fontSize: 11, color: 'rgba(26,31,60,0.5)', lineHeight: 1.4, ...(type === 'REMOVE' ? { textDecoration: 'line-through', color: '#B91C1C' } : {}) }}>{s.original}</div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'rgba(26,31,60,0.3)', fontStyle: 'italic' }}>Not currently in your CV</div>
                      )}
                    </div>
                    {/* Suggested text */}
                    {type === 'REMOVE' ? (
                      <div style={{ fontSize: 11, color: '#B91C1C', fontStyle: 'italic', marginBottom: 8 }}>Suggested: Remove this text</div>
                    ) : (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: 'rgba(26,31,60,0.35)', marginBottom: 2 }}>Suggested:</div>
                        <div style={{ fontSize: 11, color: '#1a1f3c', background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid rgba(34,197,94,0.5)', padding: '6px 10px', borderRadius: 6, lineHeight: 1.4 }}>{s.rewrite || ''}</div>
                      </div>
                    )}
                    {/* Actions */}
                    {isPending && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => rejectSuggestion(s.id)} style={{ padding: '4px 14px', borderRadius: 6, border: '1px solid rgba(43,63,191,0.12)', background: 'none', fontSize: 11, fontWeight: 600, color: '#8892b0', cursor: 'pointer' }}>Reject</button>
                        <button onClick={() => acceptSuggestion(s.id)} style={{ padding: '4px 14px', borderRadius: 6, border: 'none', background: '#2B3FBF', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Accept</button>
                      </div>
                    )}
                    {isAccepted && <div style={{ textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}><Check size={10} /> Accepted</div>}
                    {isRejected && <div style={{ textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#8892b0' }}>Rejected</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  /* ═══════════════ PREVIEW VIEW ═══════════════ */
  const PreviewView = () => {
    const acceptedWithOrig = suggestions.filter((s) => s.status === 'accepted' && s.original);
    const acceptedAdds = suggestions.filter((s) => s.status === 'accepted' && (s.type || '') === 'ADD_SKILL' && !s.original);
    const acceptedRemoves = suggestions.filter((s) => s.status === 'accepted' && (s.type || '') === 'REMOVE' && s.original);

    // Build segments with changes highlighted
    let segs = [{ text: cvText, type: 'unchanged' }];
    acceptedWithOrig.forEach((sug) => {
      const orig = sug.original; if (!orig) return;
      const isRemove = (sug.type || '') === 'REMOVE';
      const newSegs = [];
      segs.forEach((seg) => {
        if (seg.type !== 'unchanged') { newSegs.push(seg); return; }
        const idx = seg.text.indexOf(orig);
        if (idx === -1) { // try trimmed
          const tIdx = seg.text.indexOf(orig.trim());
          if (tIdx === -1) { newSegs.push(seg); return; }
          if (tIdx > 0) newSegs.push({ text: seg.text.slice(0, tIdx), type: 'unchanged' });
          if (isRemove) { newSegs.push({ text: orig.trim(), type: 'removed' }); }
          else { newSegs.push({ text: orig.trim(), type: 'old' }); newSegs.push({ text: sug.rewrite || '', type: 'new' }); }
          const after = seg.text.slice(tIdx + orig.trim().length);
          if (after) newSegs.push({ text: after, type: 'unchanged' });
        } else {
          if (idx > 0) newSegs.push({ text: seg.text.slice(0, idx), type: 'unchanged' });
          if (isRemove) { newSegs.push({ text: orig, type: 'removed' }); }
          else { newSegs.push({ text: orig, type: 'old' }); newSegs.push({ text: sug.rewrite || '', type: 'new' }); }
          const after = seg.text.slice(idx + orig.length);
          if (after) newSegs.push({ text: after, type: 'unchanged' });
        }
      });
      segs = newSegs;
    });

    const acceptedCount = suggestions.filter((s) => s.status === 'accepted').length;

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div style={{ fontSize: 11, color: 'rgba(26,31,60,0.4)', marginBottom: 12, padding: '6px 12px', background: 'rgba(43,63,191,0.04)', borderRadius: 8 }}>
          Preview — showing {acceptedCount} accepted change{acceptedCount !== 1 ? 's' : ''}. Toggle back to Suggestions to review more.
        </div>
        <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.95)', padding: 24, boxShadow: '0 2px 12px rgba(43,63,191,0.06)', fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#1a1f3c', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {segs.map((seg, i) => {
            if (seg.type === 'unchanged') return <span key={i}>{seg.text}</span>;
            if (seg.type === 'old') return <span key={i} style={{ background: 'rgba(239,68,68,0.08)', textDecoration: 'line-through', opacity: 0.6, fontSize: 10 }}>{seg.text}</span>;
            if (seg.type === 'new') return <span key={i} style={{ background: 'rgba(34,197,94,0.12)', borderBottom: '2px solid #16A34A' }}>{seg.text}</span>;
            if (seg.type === 'removed') return <span key={i} style={{ background: 'rgba(239,68,68,0.08)', textDecoration: 'line-through', opacity: 0.6 }}>{seg.text}</span>;
            return <span key={i}>{seg.text}</span>;
          })}
          {acceptedAdds.length > 0 && (
            <div style={{ marginTop: 16, padding: '8px 12px', borderRadius: 8, border: '2px dashed rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}>
              {acceptedAdds.map((s) => <div key={s.id} style={{ color: '#16A34A', background: 'rgba(34,197,94,0.12)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginRight: 6, marginBottom: 4 }}>{s.rewrite || ''}</div>)}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ═══════════════ COMPARE VIEW ═══════════════ */
  const CompareView = () => {
    const hasValid = (s) => !!(s.original && typeof s.original === 'string' && s.original.trim());
    const acc = suggestions.filter((s) => s.status === 'accepted' && hasValid(s));
    const buildSegs = (isOrig) => {
      let segs = [{ text: cvText, changed: false }];
      acc.forEach((sug) => { const orig = sug.original || ''; if (!orig) return; const ns = []; segs.forEach((seg) => { if (seg.changed) { ns.push(seg); return; } const idx = seg.text.indexOf(orig); if (idx === -1) { ns.push(seg); return; } if (idx > 0) ns.push({ text: seg.text.slice(0, idx), changed: false }); ns.push({ text: isOrig ? orig : (sug.rewrite || ''), changed: true }); const after = seg.text.slice(idx + orig.length); if (after) ns.push({ text: after, changed: false }); }); segs = ns; });
      return segs;
    };
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', borderBottom: '1px solid rgba(43,63,191,0.07)', background: 'rgba(255,255,255,0.50)' }}>
          <button onClick={() => setCompareMode(false)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(43,63,191,0.12)', background: 'none', fontSize: 11, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}>Back to review</button>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 16, overflow: 'auto' }}>
          {[{ t: 'Original', sc: originalScore, o: true }, { t: 'Optimised', sc: liveScore, o: false }].map(({ t, sc, o }) => (
            <div key={t} style={{ background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(8px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.90)', padding: 18, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>{t}</span><span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 8, background: o ? 'rgba(43,63,191,0.06)' : 'rgba(34,197,94,0.12)', color: o ? 'rgba(43,63,191,0.5)' : '#16A34A' }}>{sc}</span></div>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{buildSegs(o).map((seg, i) => <span key={i} style={seg.changed ? (o ? { background: 'rgba(239,68,68,0.10)', color: '#991B1B', textDecoration: 'line-through' } : { background: 'rgba(34,197,94,0.12)', color: '#166534', fontWeight: 500 }) : {}}>{seg.text}</span>)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ═══════════════ EDIT MODE ═══════════════ */
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

  /* ═══════════════ RESULTS RIGHT PANEL TOOLBAR ═══════════════ */
  const ResultsToolbar = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(43,63,191,0.07)', flexShrink: 0, background: 'rgba(255,255,255,0.50)', flexWrap: 'wrap', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Toggle: Suggestions | Preview */}
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', overflow: 'hidden' }}>
          {[['suggestions', 'Suggestions'], ['preview', 'Preview']].map(([id, label]) => (
            <button key={id} data-testid={`view-${id}`} onClick={() => setRightView(id)} style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: rightView === id ? '#2B3FBF' : 'transparent', color: rightView === id ? '#fff' : 'rgba(26,31,60,0.4)' }}>{label}</button>
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'rgba(26,31,60,0.4)' }}>({accepted}/{total} accepted)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button data-testid="undo-btn" onClick={undo} disabled={historyIdx < 0} title="Undo" style={{ background: 'none', border: 'none', cursor: 'pointer', color: historyIdx < 0 ? 'rgba(26,31,60,0.2)' : '#8892b0', padding: 4 }}><Undo2 size={14} /></button>
        <button data-testid="redo-btn" onClick={redo} disabled={historyIdx >= history.length - 1} title="Redo" style={{ background: 'none', border: 'none', cursor: 'pointer', color: historyIdx >= history.length - 1 ? 'rgba(26,31,60,0.2)' : '#8892b0', padding: 4 }}><Redo2 size={14} /></button>
        <button data-testid="accept-all-btn" onClick={acceptAll} disabled={pending === 0} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: pending > 0 ? '#2B3FBF' : 'rgba(43,63,191,0.15)', fontSize: 11, fontWeight: 600, color: '#fff', cursor: pending > 0 ? 'pointer' : 'default' }}>Accept All</button>
        <button title="Download optimised CV" onClick={() => downloadText(buildOptimisedText(), 'optimised_cv.txt')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8892b0', padding: 4 }}><Download size={14} /></button>
        <button data-testid="compare-btn" onClick={() => setCompareMode(true)} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(43,63,191,0.12)', background: 'none', fontSize: 11, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}><Columns2 size={12} />Compare</button>
        <button onClick={enterEditMode} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>Continue <ArrowRight size={10} /></button>
      </div>
    </div>
  );

  /* ═══════════════ COVER LETTER (unchanged) ═══════════════ */
  const CoverLetterView = () => (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 10 }}>Tone</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>{TONES.map((t) => <button key={t.id} onClick={() => setTone(t.id)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tone === t.id ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.60)', border: tone === t.id ? '1px solid #2B3FBF' : '1px solid rgba(43,63,191,0.12)', color: tone === t.id ? '#2B3FBF' : 'rgba(26,31,60,0.5)' }}>{t.label}</button>)}</div>
        {company && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: 16 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} /><span style={{ fontSize: 11, fontWeight: 500, color: '#15803D' }}>Company: {company}</span></div>}
        <button onClick={() => { if (coverContent && !window.confirm('Re-generate will overwrite. Continue?')) return; generateLetter(); }} disabled={generating || !cvText.trim() || !jdText.trim()} style={{ background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: generating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: generating || !cvText.trim() || !jdText.trim() ? 0.5 : 1, marginBottom: 20 }}>{generating ? 'Generating...' : coverContent ? 'Re-generate' : 'Generate Cover Letter'}</button>
        {coverContent && (
          <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.95)', padding: 24, boxShadow: '0 2px 12px rgba(43,63,191,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(43,63,191,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2B3FBF', fontWeight: 700, fontSize: 14 }}>{company?.[0] || 'C'}</div><div><div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3c' }}>Cover Letter</div><div style={{ fontSize: 11, color: '#8892b0' }}>{company} — {tone}</div></div></div>
            {coverContent.split('\n\n').map((para, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 8 }} onMouseEnter={(e) => { const b = e.currentTarget.querySelector('.rg'); if (b) b.style.opacity = '1'; }} onMouseLeave={(e) => { const b = e.currentTarget.querySelector('.rg'); if (b) b.style.opacity = '0'; }}>
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

  /* ═══════════════ MAIN RENDER ═══════════════ */
  return (
    <div data-testid="ats-checker-page" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 20px', flexShrink: 0, background: 'rgba(255,255,255,0.50)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.90)' }}>
          {[['analysis', 'CV Analysis'], ['coverletter', 'Cover Letter']].map(([id, label]) => (
            <button key={id} data-testid={`ats-tab-${id}`} onClick={() => setMainTab(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: mainTab === id ? '#2B3FBF' : 'rgba(26,31,60,0.35)', borderBottom: mainTab === id ? '2px solid #2B3FBF' : '2px solid transparent' }}>{label}</button>
          ))}
        </div>

        {mainTab === 'analysis' && (
          <>
            {phase === 'input' && <InputView />}
            {phase === 'scanning' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                <ScoreRing score={Math.round(scanPct)} originalScore={null} scoreKey={0} />
                <div style={{ fontSize: 12, color: '#8892b0' }}>{scanMsg}</div>
              </div>
            )}
            {phase === 'results' && !compareMode && !editMode && (
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <ResultsLeftPanel />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <ResultsToolbar />
                  {rightView === 'suggestions' && <SuggestionsView />}
                  {rightView === 'preview' && <PreviewView />}
                </div>
              </div>
            )}
            {phase === 'results' && compareMode && <CompareView />}
            {phase === 'results' && editMode && <EditModeView />}
          </>
        )}
        {mainTab === 'coverletter' && <CoverLetterView />}
      </div>
    </div>
  );
}
