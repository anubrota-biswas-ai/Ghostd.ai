import { X, Mail, Send, RefreshCw, Globe, Linkedin, ExternalLink, Edit3, Plus, Building2, ChevronDown, Info } from "lucide-react";
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

const FUNDING_OPTIONS = ["Unknown", "Pre-seed", "Seed", "Series A", "Series B", "Series C", "Series D+", "Public", "Bootstrapped"];

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
  const [techInput, setTechInput] = useState("");
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
  const logoUrl = cp.domain ? `https://logo.clearbit.com/${cp.domain}` : (cp.logo_url || null);

  const saveField = async (field, value) => {
    try {
      await api.updateCompanyProfile(job.id, { [field]: value });
      await fetchJobs();
    } catch {}
    setEditingField(null);
  };

  const addTechTag = async () => {
    if (!techInput.trim()) return;
    const current = cp.tech_stack || [];
    await api.updateCompanyProfile(job.id, { tech_stack: [...current, techInput.trim()] });
    setTechInput("");
    await fetchJobs();
  };

  const removeTechTag = async (tag) => {
    const current = cp.tech_stack || [];
    await api.updateCompanyProfile(job.id, { tech_stack: current.filter((t) => t !== tag) });
    await fetchJobs();
  };

  const saveContact = async () => {
    if (!contactForm.name) return;
    try {
      await api.addContact(job.id, contactForm);
      setContactForm({ name: "", role_type: "Recruiter", email: "", notes: "" });
      setShowAddContact(false);
      await fetchJobs();
    } catch {}
  };

  const syncGmail = async () => {
    setSyncing(true);
    try {
      await api.gmailScan();
      const d = await api.gmailEmails(selectedJobId);
      setGmailEmails(d.messages || []);
    } catch {}
    setSyncing(false);
  };

  const isSheet = mode === "sheet";
  const containerStyle = isSheet
    ? { position: "fixed", bottom: 0, left: sidebarWidth, right: 0, maxHeight: "50vh", zIndex: 30, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.90)", boxShadow: "0 -4px 24px rgba(43,63,191,0.10)", overflowY: "auto", animation: "slideUp 0.25s ease-out" }
    : { width: 268, flexShrink: 0, background: "rgba(255,255,255,0.65)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderLeft: "1px solid rgba(255,255,255,0.90)", overflowY: "auto", display: "flex", flexDirection: "column", animation: "slideInRight 0.25s ease-out" };

  const sectionLabel = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(43,63,191,0.5)", marginBottom: 8 };
  const editBtn = { background: "none", border: "none", cursor: "pointer", color: "#8892b0", padding: 2, opacity: 0.5 };
  const smallInput = { width: "100%", padding: "4px 8px", fontSize: 11, border: "1px solid rgba(43,63,191,0.15)", borderRadius: 6, background: "rgba(255,255,255,0.60)", outline: "none", color: "#1a1f3c", fontFamily: "Inter, sans-serif" };

  const EditableField = ({ label, field, value }) => {
    if (editingField === field) {
      return (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)", marginBottom: 2 }}>{label}</div>
          <div style={{ display: "flex", gap: 4 }}>
            <input style={smallInput} value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && saveField(field, fieldValue)} />
            <button onClick={() => saveField(field, fieldValue)} style={{ ...editBtn, opacity: 1, color: "#2B3FBF", fontSize: 10, fontWeight: 600 }}>Save</button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 10, color: "rgba(26,31,60,0.35)" }}>{label}: </span>
          {value ? (
            field.includes("url") ? <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#2B3FBF", textDecoration: "none" }}>{value.replace(/https?:\/\/(www\.)?/, "").substring(0, 28)}</a>
            : <span style={{ fontSize: 11, fontWeight: 500, color: "#1a1f3c" }}>{value}</span>
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
        {logoUrl ? (
          <img src={logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain", background: "#fff", border: "1px solid rgba(43,63,191,0.06)" }} onError={(e) => { e.target.style.display = "none"; }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(43,63,191,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Building2 size={18} style={{ color: "rgba(43,63,191,0.4)" }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(43,63,191,0.5)" }}>{job.company}</div>
          <div style={{ fontSize: 16, fontWeight: 300, color: "#1a1f3c", letterSpacing: "-0.03em", lineHeight: 1.2 }}>{job.title}</div>
          {cp.website && <a href={cp.website} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#2B3FBF", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}><Globe size={9} />{cp.website.replace(/https?:\/\/(www\.)?/, "").split("/")[0]}</a>}
          {(cp.industry || cp.company_size) && <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)", marginTop: 2 }}>{[cp.industry, cp.company_size].filter(Boolean).join(" · ")}</div>}
          {/* Sponsorship badge */}
          {sp && (
            <div style={{ marginTop: 4 }}>
              {sp.status === "found" ? (
                <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: "#15803D" }}>Sponsors visas</span>
              ) : sp.status === "not_found" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(245,158,11,0.12)", color: "#B45309" }}>
                  Not found on register <span title="This company was not found on the UK Home Office Register of Licensed Sponsors. This does not necessarily mean they cannot sponsor." style={{ cursor: "help" }}><Info size={9} /></span>
                </span>
              ) : (
                <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(156,163,175,0.15)", color: "#9CA3AF" }}>Sponsorship unknown</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section B — Links */}
      <div style={{ padding: "0 18px 12px", borderTop: "1px solid rgba(43,63,191,0.07)", paddingTop: 12 }}>
        <div style={sectionLabel}>Links</div>
        <EditableField label="LinkedIn" field="linkedin_url" value={cp.linkedin_url} />
        <EditableField label="Glassdoor" field="glassdoor_url" value={cp.glassdoor_url} />
        <EditableField label="Website" field="website" value={cp.website} />
      </div>

      {/* Section C — Intel */}
      <div style={{ padding: "0 18px 12px", borderTop: "1px solid rgba(43,63,191,0.07)", paddingTop: 12 }}>
        <div style={sectionLabel}>Company Intel</div>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)", marginBottom: 2 }}>Funding</div>
          <select
            value={cp.funding_stage || "Unknown"}
            onChange={(e) => saveField("funding_stage", e.target.value)}
            style={{ ...smallInput, cursor: "pointer" }}
          >
            {FUNDING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)", marginBottom: 2 }}>Tech Stack</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
            {(cp.tech_stack || []).map((t) => (
              <span key={t} style={{ fontSize: 10, fontWeight: 500, padding: "1px 8px", borderRadius: 10, background: "rgba(43,63,191,0.08)", color: "rgba(43,63,191,0.6)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                {t}
                <button onClick={() => removeTechTag(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(43,63,191,0.4)", padding: 0, fontSize: 10, lineHeight: 1 }}>x</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input style={smallInput} value={techInput} onChange={(e) => setTechInput(e.target.value)} placeholder="Add tech..." onKeyDown={(e) => e.key === "Enter" && addTechTag()} />
            <button onClick={addTechTag} style={{ ...editBtn, opacity: 1, color: "#2B3FBF" }}><Plus size={12} /></button>
          </div>
        </div>
        <div>
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
      </div>

      {/* Section D — People */}
      <div style={{ padding: "0 18px 12px", borderTop: "1px solid rgba(43,63,191,0.07)", paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...sectionLabel, marginBottom: 10 }}>
          <span>People</span>
          <button onClick={() => setShowAddContact(!showAddContact)} style={editBtn}><Plus size={12} /></button>
        </div>
        {(job.contacts || []).map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(43,63,191,0.10)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2B3FBF", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
              {c.name?.split(" ").map((n) => n[0]).join("")}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1f3c" }}>{c.name}</div>
              <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)" }}>{c.role_type}{c.email ? ` · ${c.email}` : ""}</div>
            </div>
            {c.email && (
              <button onClick={() => { setComposeTo(c.email); setShowCompose(true); }} style={editBtn} title="Email"><Mail size={11} /></button>
            )}
          </div>
        ))}
        {(!job.contacts || job.contacts.length === 0) && !showAddContact && (
          <div style={{ fontSize: 11, color: "rgba(26,31,60,0.35)" }}>No contacts added</div>
        )}
        {/* Inline add contact */}
        {showAddContact && (
          <div style={{ background: "rgba(255,255,255,0.50)", borderRadius: 8, padding: 10, marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
            <input style={smallInput} value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Name" />
            <div style={{ display: "flex", gap: 4 }}>
              <select style={{ ...smallInput, flex: 1 }} value={contactForm.role_type} onChange={(e) => setContactForm({ ...contactForm, role_type: e.target.value })}>
                {["Recruiter", "Hiring Manager", "Interviewer", "Other"].map((r) => <option key={r}>{r}</option>)}
              </select>
              <input style={{ ...smallInput, flex: 1 }} value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} placeholder="Email" />
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddContact(false)} style={{ fontSize: 10, fontWeight: 600, color: "#8892b0", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveContact} disabled={!contactForm.name} style={{ fontSize: 10, fontWeight: 600, color: "#2B3FBF", background: "none", border: "none", cursor: "pointer", opacity: contactForm.name ? 1 : 0.4 }}>Add</button>
            </div>
          </div>
        )}
      </div>

      {/* Section E — Activity + Gmail */}
      <div style={{ padding: "0 18px 12px", borderTop: "1px solid rgba(43,63,191,0.07)", paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...sectionLabel, marginBottom: 10 }}>
          <span>Activity</span>
          <button data-testid="log-email-btn" onClick={() => setShowEmail(true)} style={{ ...editBtn, opacity: 1, display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: "#2B3FBF" }}><Mail size={10} /> Log</button>
        </div>
        {(!job.activity || job.activity.length === 0) ? (
          <div style={{ fontSize: 11, color: "rgba(26,31,60,0.35)" }}>No activity yet</div>
        ) : (
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

        {/* Gmail emails */}
        {gmailConnected && gmailEmails.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(43,63,191,0.4)" }}>Gmail</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button data-testid="sync-gmail-btn" onClick={syncGmail} style={editBtn}><RefreshCw size={10} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} /></button>
                <button data-testid="compose-email-btn" onClick={() => { setComposeTo(job.contacts?.[0]?.email || ""); setShowCompose(true); }} style={editBtn}><Send size={10} /></button>
              </div>
            </div>
            {gmailEmails.slice(0, 3).map((email) => (
              <div key={email.id} style={{ marginBottom: 6, padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.40)", fontSize: 10 }}>
                <div style={{ fontWeight: 500, color: "#1a1f3c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.subject || "(no subject)"}</div>
                <div style={{ color: "rgba(26,31,60,0.30)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.from}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section F — CV Match Score */}
      <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(43,63,191,0.07)", paddingTop: 12 }}>
        <div style={sectionLabel}>CV Match</div>
        {hasScore ? (
          <div data-testid="score-card" style={{ background: "linear-gradient(135deg, #2B3FBF, #1a2d9f)", borderRadius: 12, padding: "14px 14px" }}>
            <div style={{ fontSize: 32, fontWeight: 300, color: "#fff", letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 10 }}>
              {job.match_score}%
            </div>
            {[{ l: "Skills", v: progress.skills }, { l: "Experience", v: progress.experience }, { l: "Language", v: progress.language }].map((item, i) => (
              <div key={item.l} style={{ marginBottom: i < 2 ? 6 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.60)" }}>{item.l}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.60)" }}>{item.v || 0}%</span>
                </div>
                <div style={{ height: 2, borderRadius: 1, background: "rgba(255,255,255,0.15)" }}>
                  <div style={{ height: "100%", width: `${item.v || 0}%`, background: "#fff", borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div data-testid="run-ats-prompt" style={{ textAlign: "center", padding: "16px 10px", background: "rgba(43,63,191,0.04)", borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 300, color: "#1a1f3c", marginBottom: 4 }}>No ATS check yet</div>
            <div style={{ fontSize: 10, color: "rgba(26,31,60,0.35)" }}>Go to ATS Checker to analyse your CV against this role</div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EmailLogModal isOpen={showEmail} onClose={() => setShowEmail(false)} job={job} />
      <ComposeEmailModal isOpen={showCompose} onClose={() => setShowCompose(false)} to={composeTo} subject={`Re: ${job.title} at ${job.company}`} jobCompany={job.company} />
    </div>
  );
}
