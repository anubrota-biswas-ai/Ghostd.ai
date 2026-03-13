import { useState, useRef } from 'react';
import { FileSearch, Upload, Check, X, Copy, Download, ArrowRight, RotateCcw, FileUp } from 'lucide-react';
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
  const [suggestions, setSuggestions] = useState([]);
  const [liveScore, setLiveScore] = useState(0);
  const [tone, setTone] = useState('professional');
  const [coverLetter, setCoverLetter] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cvFilename, setCvFilename] = useState('');
  const fileInputRef = useRef(null);

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
      if (data.error) {
        setError('AI could not parse the analysis. Try again.');
        setPhase('input');
        return;
      }
      setResults(data);
      setLiveScore(data.overall_score || 0);
      setSuggestions((data.suggestions || []).map((s) => ({ ...s, status: 'pending' })));
      if (data.hard_skills?.[0]?.name) {
        const comp = jdText.match(/(?:at|for|join)\s+([A-Z][a-zA-Z]+)/);
        setCompany(comp?.[1] || 'the company');
      }
      setTimeout(() => setPhase('results'), 400);
    } catch (e) {
      clearInterval(interval);
      setError('Analysis failed. Please try again.');
      setPhase('input');
    }
  };

  const acceptSuggestion = (id) => {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'accepted' } : s));
    setLiveScore((prev) => Math.min(100, prev + 2));
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
      setCoverLetter(data);
    } catch (e) {
      setError('Cover letter generation failed.');
    }
    setGenerating(false);
  };

  const copyLetter = () => {
    if (coverLetter?.letter) navigator.clipboard.writeText(coverLetter.letter);
  };

  const downloadLetter = () => {
    if (!coverLetter?.letter) return;
    const blob = new Blob([coverLetter.letter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cover_letter.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── Left input panel (always visible) ─── */
  const InputPanel = () => (
    <div
      data-testid="ats-input-panel"
      style={{
        width: 290, flexShrink: 0, padding: 18,
        background: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(255,255,255,0.90)',
        display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>
        Your CV
      </div>

      {/* File upload zone */}
      <input type="file" ref={fileInputRef} accept=".pdf,.txt" onChange={handleFileUpload} style={{ display: 'none' }} data-testid="cv-file-input" />
      <button
        data-testid="cv-upload-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer',
          border: cvFilename ? '1px solid rgba(43,63,191,0.35)' : '1px dashed rgba(43,63,191,0.25)',
          background: cvFilename ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.40)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 11, fontWeight: 500, color: cvFilename ? '#2B3FBF' : '#8892b0',
          transition: 'all 0.15s',
        }}
      >
        <FileUp size={14} />
        {uploading ? 'Uploading...' : cvFilename ? cvFilename : 'Upload PDF or TXT'}
      </button>

      <textarea
        data-testid="cv-textarea"
        value={cvText}
        onChange={(e) => setCvText(e.target.value)}
        placeholder="Paste your CV text here..."
        style={{
          width: '100%', minHeight: 140, padding: 10, fontSize: 11, fontFamily: 'Inter, sans-serif',
          border: cvText ? '1px solid rgba(43,63,191,0.35)' : '1px solid rgba(43,63,191,0.12)',
          borderRadius: 10, background: cvText ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.50)',
          color: '#1a1f3c', resize: 'vertical', outline: 'none',
        }}
      />

      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>
        Job Description
      </div>
      <textarea
        data-testid="jd-textarea"
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="Paste the job description..."
        style={{
          width: '100%', minHeight: 140, padding: 10, fontSize: 11, fontFamily: 'Inter, sans-serif',
          border: '1px solid rgba(43,63,191,0.06)', borderRadius: 10,
          background: 'rgba(255,255,255,0.50)', color: '#1a1f3c', resize: 'vertical', outline: 'none',
        }}
      />

      <button
        data-testid="analyze-btn"
        onClick={startAnalysis}
        disabled={phase === 'scanning' || !cvText.trim() || !jdText.trim()}
        style={{
          background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', color: '#fff',
          border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600,
          cursor: phase === 'scanning' ? 'wait' : 'pointer', width: '100%',
          opacity: (!cvText.trim() || !jdText.trim()) ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <FileSearch size={14} />
        {phase === 'scanning' ? 'Analysing...' : 'One-click Optimise'}
      </button>

      {error && (
        <div style={{ fontSize: 11, color: '#B91C1C', background: 'rgba(239,68,68,0.08)', padding: 8, borderRadius: 8 }}>
          {error}
        </div>
      )}
    </div>
  );

  /* ─── Scanning animation ─── */
  const ScanningView = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(43,63,191,0.10)" strokeWidth="4" />
          <circle cx="60" cy="60" r="54" fill="none" stroke="#2B3FBF" strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - scanPct / 100)}`}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, fontWeight: 300, color: '#1a1f3c', letterSpacing: '-0.04em' }}>
            {Math.round(scanPct)}%
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#8892b0', fontWeight: 400 }}>{scanMsg}</div>
    </div>
  );

  /* ─── Score card ─── */
  const ScoreCard = () => (
    <div
      data-testid="ats-score-card"
      style={{
        background: 'linear-gradient(135deg, #2B3FBF, #1a2d9f)', borderRadius: 14, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.40)', marginBottom: 4 }}>
          Overall Score
        </div>
        <div style={{ fontSize: 44, fontWeight: 300, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1 }}>
          {liveScore}%
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: 'Skills', value: results?.skills_score || 0 },
          { label: 'Experience', value: results?.experience_score || 0 },
          { label: 'Language', value: results?.language_score || 0 },
        ].map((item) => (
          <div key={item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.60)' }}>{item.label}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.60)' }}>{item.value}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }}>
              <div style={{ height: '100%', width: `${item.value}%`, background: '#fff', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ─── Skills grid ─── */
  const SkillsGrid = () => {
    const hs = results?.hard_skills || [];
    const ss = results?.soft_skills || [];
    const SkillDot = ({ status }) => {
      if (status === 'matched') return <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', color: '#16A34A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}><Check size={9} /></span>;
      if (status === 'added') return <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(43,63,191,0.10)', color: '#2B3FBF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}><Check size={9} /></span>;
      return <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}><X size={9} /></span>;
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[{ title: 'Hard Skills', items: hs }, { title: 'Soft Skills', items: ss }].map(({ title, items }) => (
          <div key={title} style={{
            background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(8px)', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.90)', padding: 16,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 12 }}>
              {title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((skill, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SkillDot status={skill.status} />
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#1a1f3c' }}>{skill.name}</span>
                </div>
              ))}
              {items.length === 0 && <span style={{ fontSize: 11, color: 'rgba(26,31,60,0.35)' }}>No skills detected</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ─── Suggestions panel ─── */
  const SuggestionsPanel = () => (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 12 }}>
        Suggestions ({suggestions.filter((s) => s.status === 'pending').length} remaining)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {suggestions.map((s) => (
          <div
            key={s.id}
            data-testid={`suggestion-${s.id}`}
            style={{
              background: 'rgba(255,255,255,0.82)', borderRadius: 12, padding: 14,
              boxShadow: '0 2px 12px rgba(43,63,191,0.06)',
              border: '1px solid rgba(255,255,255,0.95)',
              opacity: s.status === 'rejected' ? 0.5 : 1,
            }}
          >
            <div style={{ background: 'rgba(239,68,68,0.04)', padding: '6px 10px', borderRadius: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(26,31,60,0.45)', textDecoration: 'line-through' }}>
                {s.original}
              </span>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.06)', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid rgba(34,197,94,0.5)', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#1a1f3c' }}>{s.rewrite}</span>
            </div>
            {s.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  data-testid={`reject-suggestion-${s.id}`}
                  onClick={() => rejectSuggestion(s.id)}
                  style={{ background: 'none', border: '1px solid rgba(43,63,191,0.12)', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#8892b0', cursor: 'pointer' }}
                >
                  Reject
                </button>
                <button
                  data-testid={`accept-suggestion-${s.id}`}
                  onClick={() => acceptSuggestion(s.id)}
                  style={{ background: '#2B3FBF', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                >
                  Accept
                </button>
              </div>
            )}
            {s.status === 'accepted' && (
              <div style={{ fontSize: 10, fontWeight: 600, color: '#15803D', textAlign: 'right' }}>Accepted</div>
            )}
            {s.status === 'rejected' && (
              <div style={{ fontSize: 10, fontWeight: 600, color: '#B91C1C', textAlign: 'right' }}>Rejected</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  /* ─── Compare mode ─── */
  const CompareView = () => {
    const accepted = suggestions.filter((s) => s.status === 'accepted');
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(8px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.90)', padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 10 }}>
            Original CV
          </div>
          <div style={{ fontSize: 12, fontWeight: 400, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {cvText.split('\n').map((line, i) => {
              const isChanged = accepted.some((s) => line.includes(s.original?.substring(0, 20)));
              return (
                <span key={i} style={isChanged ? { background: 'rgba(239,68,68,0.10)', color: '#991B1B', textDecoration: 'line-through' } : {}}>
                  {line}{'\n'}
                </span>
              );
            })}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(8px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.90)', padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 10 }}>
            Optimised CV
          </div>
          <div style={{ fontSize: 12, fontWeight: 400, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {cvText.split('\n').map((line, i) => {
              const match = accepted.find((s) => line.includes(s.original?.substring(0, 20)));
              if (match) {
                return (
                  <span key={i} style={{ background: 'rgba(34,197,94,0.12)', color: '#166534', fontWeight: 500 }}>
                    {match.rewrite}{'\n'}
                  </span>
                );
              }
              return <span key={i}>{line}{'\n'}</span>;
            })}
          </div>
        </div>
      </div>
    );
  };

  /* ─── Cover Letter tab ─── */
  const CoverLetterView = () => (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ maxWidth: 640 }}>
        {/* Tone selector */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 10 }}>
          Tone
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {TONES.map((t) => (
            <button
              key={t.id}
              data-testid={`tone-${t.id}`}
              onClick={() => setTone(t.id)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: tone === t.id ? 'rgba(43,63,191,0.05)' : 'rgba(255,255,255,0.60)',
                border: tone === t.id ? '1px solid #2B3FBF' : '1px solid rgba(43,63,191,0.12)',
                color: tone === t.id ? '#2B3FBF' : 'rgba(26,31,60,0.5)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {company && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#15803D' }}>Company: {company}</span>
          </div>
        )}

        <button
          data-testid="generate-letter-btn"
          onClick={generateLetter}
          disabled={generating || !cvText.trim() || !jdText.trim()}
          style={{
            background: 'linear-gradient(135deg, #3B4FD0, #2B3FBF)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600,
            cursor: generating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            opacity: generating || !cvText.trim() || !jdText.trim() ? 0.5 : 1, marginBottom: 20,
          }}
        >
          {generating ? 'Generating...' : 'Generate Cover Letter'}
        </button>

        {coverLetter && (
          <div style={{
            background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.95)', padding: 24,
            boxShadow: '0 2px 12px rgba(43,63,191,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(43,63,191,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2B3FBF', fontWeight: 700, fontSize: 14 }}>
                {company?.[0] || 'C'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3c' }}>Cover Letter</div>
                <div style={{ fontSize: 11, color: '#8892b0' }}>{company} — {tone}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {coverLetter.letter}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button data-testid="copy-letter-btn" onClick={copyLetter} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 12, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}>
                <Copy size={12} /> Copy
              </button>
              <button data-testid="download-letter-btn" onClick={downloadLetter} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 12, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}>
                <Download size={12} /> Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ─── Results view ─── */
  const ResultsView = () => (
    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>
            Analysis Results
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              data-testid="compare-btn"
              onClick={() => setPhase('compare')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}
            >
              Compare <ArrowRight size={12} />
            </button>
            <button
              data-testid="reset-btn"
              onClick={() => { setPhase('input'); setResults(null); setSuggestions([]); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: 600, color: '#8892b0', cursor: 'pointer' }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>
        <ScoreCard />
        <SkillsGrid />
        <SuggestionsPanel />
        {results?.summary && (
          <div style={{ background: 'rgba(255,255,255,0.70)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.90)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)', marginBottom: 6 }}>Summary</div>
            <p style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>{results.summary}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div data-testid="ats-checker-page" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <InputPanel />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 20px', flexShrink: 0, background: 'rgba(255,255,255,0.50)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.90)' }}>
          {[['analysis', 'CV Analysis'], ['coverletter', 'Cover Letter']].map(([id, label]) => (
            <button
              key={id}
              data-testid={`ats-tab-${id}`}
              onClick={() => setMainTab(id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '12px 16px', fontSize: 12, fontWeight: 600,
                color: mainTab === id ? '#2B3FBF' : 'rgba(26,31,60,0.35)',
                borderBottom: mainTab === id ? '2px solid #2B3FBF' : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {mainTab === 'analysis' && (
          <>
            {phase === 'input' && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ textAlign: 'center', maxWidth: 300 }}>
                  <FileSearch size={40} style={{ color: 'rgba(43,63,191,0.2)', marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 300, color: '#1a1f3c', letterSpacing: '-0.02em', marginBottom: 6 }}>
                    Ready to analyse
                  </div>
                  <p style={{ fontSize: 12, color: '#8892b0', lineHeight: 1.5 }}>
                    Paste your CV and the job description in the left panel, then click "One-click Optimise" to start.
                  </p>
                </div>
              </div>
            )}
            {phase === 'scanning' && <ScanningView />}
            {phase === 'results' && <ResultsView />}
            {phase === 'compare' && (
              <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(43,63,191,0.5)' }}>
                    Compare Mode
                  </div>
                  <button data-testid="back-to-results-btn" onClick={() => setPhase('results')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(43,63,191,0.12)', background: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: 600, color: '#2B3FBF', cursor: 'pointer' }}>
                    Back to Results
                  </button>
                </div>
                <CompareView />
              </div>
            )}
          </>
        )}

        {mainTab === 'coverletter' && <CoverLetterView />}
      </div>
    </div>
  );
}
