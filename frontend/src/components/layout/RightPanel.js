import { X, Mail, Send, RefreshCw, Globe, Linkedin, Instagram, Youtube, Edit3, Plus, Building2, Info, ToggleLeft, ToggleRight } from "lucide-react";
import { useState, useEffect } from "react";
import useJobStore from "@/store/jobStore";
import EmailLogModal from "@/components/board/EmailLogModal";
import ComposeEmailModal from "@/components/board/ComposeEmailModal";
import { api } from "@/lib/api";

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 14) return "Last week";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* Sponsorship badge with hover tooltip + manual override */
function SponsorshipBadge({ sp, jobId, fetchJobs }) {
  const [showOverride, setShowOverride] = useState(false);

  const toggleOverride = async () => {
    const newStatus = sp.status === "found" ? "not_found" : "found";
    try {
      await api.updateJob(jobId, { sponsorship: { ...sp, status: newStatus, manual_override: true } });
      await fetchJobs();
    } catch {}
    setShowOverride(false);
  };

  if (!sp) return null;
  const isManual = sp.manual_override;
  const isFound = sp.status === "found";

  const hoverText = isFound
    ? `Matched to: ${sp.matched_name || "—"} — ${Math.round((sp.confidence || 0) * 100)}% confidence`
    : sp.matched_name && sp.confidence > 0.3
    ? `Best match: ${sp.matched_name} — ${Math.round((sp.confidence || 0) * 100)}% confidence`
    : "No close match found on register";

  return (
    <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, position: "relative" }}>
      {isFound ? (
        <span title={hoverText} style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: "#15803D", cursor: "help" }}>
          Sponsors visas
        </span>
      ) : (
        <span title={hoverText} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(245,158,11,0.12)", color: "#B45309", cursor: "help" }}>
          No sponsor licence
          <span title="Based on the UK Home Office Register of Licensed Sponsors. This may not be definitive — some companies use umbrella sponsors or haven't registered yet." style={{ cursor: "help" }}><Info size={9} /></span>
        </span>
      )}
      {isManual && <span style={{ fontSize: 8, fontWeight: 600, color: "rgba(26,31,60,0.3)", letterSpacing: "0.04em" }}>MANUAL</span>}
      <button
        data-testid="sponsorship-override-btn"
        onClick={() => setShowOverride(!showOverride)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#8892b0", padding: 1 }}
        title={isFound ? "Mark as no licence" : "Mark as sponsors"}
      >
        {isFound ? <ToggleRight size={12} style={{ color: "#34D399" }} /> : <ToggleLeft size={12} />}
      </button>
      {showOverride && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderRadius: 8, border: "1px solid rgba(43,63,191,0.12)", padding: "6px 10px", zIndex: 10, boxShadow: "0 4px 12px rgba(43,63,191,0.10)", whiteSpace: "nowrap" }}>
          <button onClick={toggleOverride} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600, color: "#2B3FBF" }}>
            {isFound ? "Mark as no licence" : "Mark as sponsors"}
          </button>
        </div>
      )}
    </div>
  );
}

/* Logo with fallback chain: Clearbit → Google Favicon → Icon */
function CompanyLogo({ domain, logoUrl }) {
  const [src, setSrc] = useState(null);
  const [fallbackStage, setFallbackStage] = useState(0); // 0=clearbit, 1=google, 2=icon

  useEffect(() => {
    const d = domain || "";
    if (d) {
      setSrc(`https://logo.clearbit.com/${d}`);
      setFallbackStage(0);
    } else if (logoUrl) {
      setSrc(logoUrl);
      setFallbackStage(0);
    } else {
      setFallbackStage(2);
    }
  }, [domain, logoUrl]);

  const handleError = () => {
    const d = domain || "";
    if (fallbackStage === 0 && d) {
      setSrc(`https://www.google.com/s2/favicons?domain=${d}&sz=128`);
      setFallbackStage(1);
    } else {
      setFallbackStage(2);
    }
  };

  if (fallbackStage >= 2 || !src) {
    return (
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(43,63,191,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Building2 size={18} style={{ color: "rgba(43,63,191,0.4)" }} />
      </div>
    );
  }

  return <img src={src} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain", background: "#fff", border: "1px solid rgba(43,63,191,0.06)", flexShrink: 0 }} onError={handleError} />;
}

/* TikTok icon (not in lucide) */
const TikTokIcon = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.16 8.16 0 004.76 1.52V6.84a4.85 4.85 0 01-1-.15z"/></svg>
);

export default function RightPanel({ mode = "panel", sidebarWidth = 210 }) {
  const selectedJobId = useJobStore((s) => s.selectedJobId);
  const jobs = useJobStore((s) => s.jobs);
  const clearSelection = useJobStore((s) => s.clearSelection);
  const fetchJobs = useJobStore((s) => s.fetchJobs);

  const [showEmail, setShowEmail] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [gmailEmails, setGmailEmails] = useState([]);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldValue, setFieldValue] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", role_type: "Recruiter", email: "", notes: "" });

  const job = jobs.find((j) => j.id === selectedJobId);

  useEffect(() => {
    api.gmailStatus().then((s) => {
      setGmailConnected(s.connected);
      if (s.connected && selectedJobId) {
        api.gmailEmails(selectedJobId).then((d) => setGmailEmails(d.messages || [])).catch(() => {});
      }
    }).catch(() => {});
  }, [selectedJobId]);

  if (!job) return null;

  const cp = job.company_profile || {};
  const sp = job.sponsorship;
  const hasScore = job.match_score != null && job.match_score > 0;
  const progress = job.progress || {};

  const saveField = async (field, value) => {
    try { await api.updateCompanyProfile(job.id, { [field]: value }); await fetchJobs(); } catch {}
    setEditingField(null);
  };

  const saveContact = async () => {
    if (!contactForm.name) return;
    try { await api.addContact(job.id, contactForm); setContactForm({ name: "", role_type: "Recruiter", email: "", notes: "" }); setShowAddContact(false); await fetchJobs(); } catch {}
  };

  const syncGmail = async () => {
    setSyncing(true);
    try { await api.gmailScan(); const d = await api.gmailEmails(selectedJobId); setGmailEmails(d.messages || []); } catch {}
    setSyncing(false);
  };

  const isSheet = mode === "sheet";
  const containerStyle = isSheet
    ? { position: "fixed", bottom: 0, left: sidebarWidth, right: 0, maxHeight: "50vh", zIndex: 30, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.90)", boxShadow: "0 -4px 24px rgba(43,63,191,0.10)", overflowY: "auto", animation: "slideUp 0.25s ease-out" }
    : { width: 268, flexShrink: 0, background: "rgba(255,255,255,0.65)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderLeft: "1px solid rgba(255,255,255,0.90)", overflowY: "auto", display: "flex", flexDirection: "column", animation: "slideInRight 0.25s ease-out" };

  const sectionLabel = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(43,63,191,0.5)", marginBottom: 8 };
  const editBtn = { background: "none", border: "none", cursor: "pointer", color: "#8892b0", padding: 2, opacity: 0.5 };
  const smallInput = { width: "100%", padding: "4px 8px", fontSize: 11, border: "1px solid rgba(43,63,191,0.15)", borderRadius: 6, background: "rgba(255,255,255,0.60)", outline: "none", color: "#1a1f3c", fontFamily: "Inter, sans-serif" };

  const EditableField = ({ label, field, value, icon: Icon }) => {
    if (editingField === field) {
      return (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(26,31,60,0.35)", marginBottom: 2 }}>{Icon && <Icon size={10} />}{label}</div>
          <div style={{ display: "flex", gap: 4 }}>
            <input style={smallInput} value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && saveField(field, fieldValue)} />
            <button onClick={() => saveField(field, fieldValue)} style={{ ...editBtn, opacity: 1, color: "#2B3FBF", fontSize: 10, fontWeight: 600 }}>Save</button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {Icon && <Icon size={10} style={{ color: "rgba(26,31,60,0.3)" }} />}
          <span style={{ fontSize: 10, color: "rgba(26,31,60,0.35)" }}>{label}: </span>
          {value ? (
            <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2B3FBF", textDecoration: "none" }}>{value.replace(/https?:\/\/(www\.)?/, "").substring(0, 24)}</a>
          ) : <span style={{ fontSize: 10, color: "rgba(26,31,60,0.25)" }}>—</span>}
        </div>
        <button onClick={() => { setEditingField(field); setFieldValue(value || ""); }} style={editBtn}><Edit3 size={10} /></button>
      </div>
    );
  };

  return (
    <div data-testid="right-panel" style={containerStyle}>
      {/* Close */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 14px 0" }}>
        <button data-testid="close-panel-btn" onClick={clearSelection} style={{ background: "none", border: "none", cursor: "pointer", color: "#8892b0", padding: 4 }}><X size={16} /></button>
      </div>

      {/* Section A — Company Header */}
      <div style={{ padding: "0 18px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <CompanyLogo domain={cp.domain} logoUrl={cp.logo_url} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(43,63,191,0.5)" }}>{job.company}</div>
          <div style={{ fontSize: 16, fontWeight: 300, color: "#1a1f3c", letterSpacing: "-0.03em", lineHeight: 1.2 }}>{job.title}</div>
          {cp.website && <a href={cp.website} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#2B3FBF", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}><Globe size={9} />{cp.website.replace(/https?:\/\/(www\.)?/, "").split("/")[0]}</a>}
          {(cp.industry || cp.company_size) && <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)", marginTop: 2 }}>{[cp.industry, cp.company_size].filter(Boolean).join(" · ")}</div>}
          <SponsorshipBadge sp={sp} jobId={job.id} fetchJobs={fetchJobs} />
        </div>
      </div>

      {/* Section B — Social Links */}
      <div style={{ padding: "0 18px 8px", borderTop: "1px solid rgba(43,63,191,0.07)", paddingTop: 12 }}>
        <div style={sectionLabel}>Links</div>
        <EditableField label="LinkedIn" field="linkedin_url" value={cp.linkedin_url} icon={Linkedin} />
        <EditableField label="Instagram" field="instagram_url" value={cp.instagram_url} icon={Instagram} />
        <EditableField label="YouTube" field="youtube_url" value={cp.youtube_url} icon={Youtube} />
        <EditableField label="TikTok" field="tiktok_url" value={cp.tiktok_url} icon={TikTokIcon} />
        <EditableField label="Website" field="website" value={cp.website} icon={Globe} />
      </div>

      {/* Notes */}
      <div style={{ padding: "0 18px 12px" }}>
        <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)", marginBottom: 2 }}>Notes</div>
        {editingField === "notes" ? (
          <div>
            <textarea style={{ ...smallInput, minHeight: 50, resize: "vertical" }} value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} autoFocus />
            <button onClick={() => saveField("notes", fieldValue)} style={{ fontSize: 10, fontWeight: 600, color: "#2B3FBF", background: "none", border: "none", cursor: "pointer", marginTop: 2 }}>Save</button>
          </div>
        ) : (
          <div onClick={() => { setEditingField("notes"); setFieldValue(cp.notes || ""); }} style={{ fontSize: 11, color: cp.notes ? "#444" : "rgba(26,31,60,0.25)", cursor: "pointer", minHeight: 20, lineHeight: 1.4 }}>
            {cp.notes || "Click to add notes..."}
          </div>
        )}
      </div>

      {/* People */}
      <div style={{ padding: "0 18px 12px", borderTop: "1px solid rgba(43,63,191,0.07)", paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...sectionLabel, marginBottom: 10 }}>
          <span>People</span>
          <button onClick={() => setShowAddContact(!showAddContact)} style={editBtn}><Plus size={12} /></button>
        </div>
        {(job.contacts || []).map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(43,63,191,0.10)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2B3FBF", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{c.name?.split(" ").map((n) => n[0]).join("")}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1f3c" }}>{c.name}</div>
              <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)" }}>{c.role_type}{c.email ? ` · ${c.email}` : ""}</div>
            </div>
            {c.email && <button onClick={() => { setComposeTo(c.email); setShowCompose(true); }} style={editBtn} title="Email"><Mail size={11} /></button>}
          </div>
        ))}
        {(!job.contacts || job.contacts.length === 0) && !showAddContact && <div style={{ fontSize: 11, color: "rgba(26,31,60,0.35)" }}>No contacts added</div>}
        {showAddContact && (
          <div style={{ background: "rgba(255,255,255,0.50)", borderRadius: 8, padding: 10, marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
            <input style={smallInput} value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Name" />
            <div style={{ display: "flex", gap: 4 }}>
              <select style={{ ...smallInput, flex: 1 }} value={contactForm.role_type} onChange={(e) => setContactForm({ ...contactForm, role_type: e.target.value })}>{["Recruiter", "Hiring Manager", "Interviewer", "Other"].map((r) => <option key={r}>{r}</option>)}</select>
              <input style={{ ...smallInput, flex: 1 }} value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} placeholder="Email" />
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddContact(false)} style={{ fontSize: 10, fontWeight: 600, color: "#8892b0", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveContact} disabled={!contactForm.name} style={{ fontSize: 10, fontWeight: 600, color: "#2B3FBF", background: "none", border: "none", cursor: "pointer", opacity: contactForm.name ? 1 : 0.4 }}>Add</button>
            </div>
          </div>
        )}
      </div>

      {/* Activity + Gmail */}
      <div style={{ padding: "0 18px 12px", borderTop: "1px solid rgba(43,63,191,0.07)", paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...sectionLabel, marginBottom: 10 }}>
          <span>Activity</span>
          <button data-testid="log-email-btn" onClick={() => setShowEmail(true)} style={{ ...editBtn, opacity: 1, display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: "#2B3FBF" }}><Mail size={10} /> Log</button>
        </div>
        {(!job.activity || job.activity.length === 0) ? <div style={{ fontSize: 11, color: "rgba(26,31,60,0.35)" }}>No activity yet</div> : (
          [...job.activity].reverse().slice(0, 6).map((item, i, arr) => (
            <div key={item.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(43,63,191,0.25)", flexShrink: 0 }} />
                {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: "rgba(43,63,191,0.10)", marginTop: 3, minHeight: 12 }} />}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 400, color: "rgba(26,31,60,0.50)", lineHeight: 1.3 }}>{item.message}</div>
                <div style={{ fontSize: 10, color: "rgba(26,31,60,0.25)", marginTop: 1 }}>{formatTimestamp(item.timestamp)}</div>
              </div>
            </div>
          ))
        )}
        {gmailConnected && gmailEmails.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(43,63,191,0.4)" }}>Gmail</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button data-testid="sync-gmail-btn" onClick={syncGmail} style={editBtn}><RefreshCw size={10} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} /></button>
                <button data-testid="compose-email-btn" onClick={() => { setComposeTo(job.contacts?.[0]?.email || ""); setShowCompose(true); }} style={editBtn}><Send size={10} /></button>
              </div>
            </div>
            {gmailEmails.slice(0, 3).map((e) => (
              <div key={e.id} style={{ marginBottom: 6, padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.40)", fontSize: 10 }}>
                <div style={{ fontWeight: 500, color: "#1a1f3c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject || "(no subject)"}</div>
                <div style={{ color: "rgba(26,31,60,0.30)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.from}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CV Match Score */}
      <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(43,63,191,0.07)", paddingTop: 12 }}>
        <div style={sectionLabel}>CV Match</div>
        {hasScore ? (
          <div data-testid="score-card" style={{ background: "linear-gradient(135deg, #2B3FBF, #1a2d9f)", borderRadius: 12, padding: "14px 14px" }}>
            <div style={{ fontSize: 32, fontWeight: 300, color: "#fff", letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 10 }}>{job.match_score}%</div>
            {[{ l: "Skills", v: progress.skills }, { l: "Experience", v: progress.experience }, { l: "Language", v: progress.language }].map((item, i) => (
              <div key={item.l} style={{ marginBottom: i < 2 ? 6 : 0 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span style={{ fontSize: 9, color: "rgba(255,255,255,0.60)" }}>{item.l}</span><span style={{ fontSize: 9, color: "rgba(255,255,255,0.60)" }}>{item.v || 0}%</span></div><div style={{ height: 2, borderRadius: 1, background: "rgba(255,255,255,0.15)" }}><div style={{ height: "100%", width: `${item.v || 0}%`, background: "#fff", borderRadius: 1 }} /></div></div>
            ))}
          </div>
        ) : (
          <div data-testid="run-ats-prompt" style={{ textAlign: "center", padding: "16px 10px", background: "rgba(43,63,191,0.04)", borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 300, color: "#1a1f3c", marginBottom: 4 }}>No ATS check yet</div>
            <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)" }}>Go to ATS Checker to analyse your CV against this role</div>
          </div>
        )}
      </div>

      <EmailLogModal isOpen={showEmail} onClose={() => setShowEmail(false)} job={job} />
      <ComposeEmailModal isOpen={showCompose} onClose={() => setShowCompose(false)} to={composeTo} subject={`Re: ${job.title} at ${job.company}`} jobCompany={job.company} />
    </div>
  );
}
