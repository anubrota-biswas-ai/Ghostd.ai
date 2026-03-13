import { useState, useEffect } from "react";
import { Users, Plus, X, Search, Mail, Linkedin, Clock, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import useJobStore from "@/store/jobStore";

function getNudge(contact, jobStatus) {
  if (!contact.last_contacted) return { text: "Never contacted", type: "action" };
  const days = Math.floor((Date.now() - new Date(contact.last_contacted)) / 86400000);
  if (jobStatus === "interview" && days >= 5) return { text: "Send thank you note", type: "followup" };
  if (days >= 14) return { text: "No contact in 2 weeks", type: "action" };
  if (days >= 7) return { text: "Follow up", type: "followup" };
  return null;
}

const ROLE_TYPES = ["Recruiter", "Hiring Manager", "Interviewer", "Other"];

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", role_type: "Recruiter", email: "", linkedin_url: "", notes: "", job_id: "" });
  const [saving, setSaving] = useState(false);
  const jobs = useJobStore((s) => s.jobs);

  const fetchContacts = async () => {
    try {
      const data = await api.getAllContacts();
      setContacts(data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleAddContact = async () => {
    if (!addForm.name || !addForm.job_id) return;
    setSaving(true);
    try {
      const { job_id, ...contactData } = addForm;
      await api.addContact(job_id, contactData);
      await fetchContacts();
      setShowAdd(false);
      setAddForm({ name: "", role_type: "Recruiter", email: "", linkedin_url: "", notes: "", job_id: "" });
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  };

  const filtered = contacts.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.job_company?.toLowerCase().includes(search.toLowerCase()) ||
    c.role_type?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {};
  filtered.forEach((c) => {
    const key = c.application_id || "unknown";
    if (!grouped[key]) grouped[key] = { job_title: c.job_title || "Unknown", job_company: c.job_company || "", job_status: c.job_status || "", contacts: [] };
    grouped[key].contacts.push(c);
  });

  const inputStyle = {
    width: "100%", padding: "8px 12px", fontSize: 13,
    border: "1px solid rgba(43,63,191,0.12)", borderRadius: 8,
    background: "rgba(255,255,255,0.60)", outline: "none",
    color: "#1a1f3c", fontFamily: "Inter, sans-serif",
  };
  const labelStyle = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(43,63,191,0.5)", marginBottom: 4, display: "block" };

  if (loading) {
    return (
      <div data-testid="contacts-page" style={{ padding: 24 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.50)", borderRadius: 14, height: 80, marginBottom: 10, animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="contacts-page" style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "#8892b0" }} />
          <input
            data-testid="contact-search"
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            style={{ ...inputStyle, paddingLeft: 30 }}
          />
        </div>
        <button
          data-testid="add-contact-btn"
          onClick={() => setShowAdd(true)}
          style={{
            background: "linear-gradient(135deg, #3B4FD0, #2B3FBF)", color: "#fff",
            border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Plus size={14} /> Add Contact
        </button>
      </div>

      {/* Empty state */}
      {Object.keys(grouped).length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
          <div style={{ textAlign: "center" }}>
            <Users size={48} style={{ color: "rgba(43,63,191,0.2)", marginBottom: 16 }} />
            <div style={{ fontSize: 18, fontWeight: 300, color: "#1a1f3c", letterSpacing: "-0.03em", marginBottom: 8 }}>
              {search ? "No contacts found" : "No contacts yet"}
            </div>
            <p style={{ fontSize: 12, color: "#8892b0" }}>
              {search ? "Try a different search term." : "Add contacts to your job applications to track your hiring relationships."}
            </p>
          </div>
        </div>
      )}

      {/* Contact groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Object.entries(grouped).map(([appId, group]) => (
          <div key={appId} style={{
            background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.95)", borderRadius: 14, overflow: "hidden",
          }}>
            {/* Group header */}
            <div style={{
              padding: "12px 18px", borderBottom: "1px solid rgba(43,63,191,0.07)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(43,63,191,0.5)" }}>
                  {group.job_company}
                </div>
                <div style={{ fontSize: 14, fontWeight: 300, color: "#1a1f3c", letterSpacing: "-0.02em" }}>
                  {group.job_title}
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(43,63,191,0.08)", color: "rgba(43,63,191,0.6)" }}>
                {group.contacts.length} contact{group.contacts.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Contacts */}
            {group.contacts.map((contact) => {
              const nudge = getNudge(contact, group.job_status);
              return (
                <div key={contact.id} data-testid={`contact-row-${contact.id}`} style={{
                  padding: "14px 18px", borderBottom: "1px solid rgba(43,63,191,0.04)",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(43,63,191,0.10)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    color: "#2B3FBF", fontSize: 13, fontWeight: 600,
                  }}>
                    {contact.name?.split(" ").map((n) => n[0]).join("") || "?"}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1f3c" }}>{contact.name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                        padding: "1px 6px", borderRadius: 4,
                        background: "rgba(43,63,191,0.08)", color: "rgba(43,63,191,0.6)",
                      }}>{contact.role_type}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#8892b0", textDecoration: "none" }}>
                          <Mail size={10} /> {contact.email}
                        </a>
                      )}
                      {contact.linkedin_url && (
                        <a href={contact.linkedin_url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#8892b0", textDecoration: "none" }}>
                          <Linkedin size={10} /> LinkedIn
                        </a>
                      )}
                      {contact.last_contacted && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "rgba(26,31,60,0.35)" }}>
                          <Clock size={10} /> {new Date(contact.last_contacted).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                    {contact.notes && (
                      <div style={{ fontSize: 11, color: "rgba(26,31,60,0.45)", marginTop: 4, fontStyle: "italic" }}>
                        "{contact.notes}"
                      </div>
                    )}
                  </div>

                  {/* Nudge + delete */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {nudge && (
                      <span data-testid={`nudge-${contact.id}`} style={{
                        fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap",
                        background: nudge.type === "action" ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.15)",
                        color: nudge.type === "action" ? "#B91C1C" : "#B45309",
                        display: "flex", alignItems: "center", gap: 3,
                      }}>
                        <AlertCircle size={10} /> {nudge.text}
                      </span>
                    )}
                    <button
                      data-testid={`delete-contact-${contact.id}`}
                      onClick={() => handleDelete(contact.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#8892b0", padding: 4 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Add Contact Modal */}
      {showAdd && (
        <div
          data-testid="add-contact-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,31,60,0.20)", backdropFilter: "blur(4px)" }}
        >
          <div style={{
            background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.95)", boxShadow: "0 8px 40px rgba(43,63,191,0.15)",
            maxWidth: 440, width: "100%", padding: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 300, color: "#1a1f3c", letterSpacing: "-0.03em" }}>Add Contact</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8892b0" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Application *</label>
                <select data-testid="contact-job-select" style={inputStyle} value={addForm.job_id} onChange={(e) => setAddForm({ ...addForm, job_id: e.target.value })}>
                  <option value="">Select a job...</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input data-testid="contact-name-input" style={inputStyle} value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Sarah Chen" />
                </div>
                <div>
                  <label style={labelStyle}>Role</label>
                  <select style={inputStyle} value={addForm.role_type} onChange={(e) => setAddForm({ ...addForm, role_type: e.target.value })}>
                    {ROLE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="sarah@company.com" />
                </div>
                <div>
                  <label style={labelStyle}>LinkedIn</label>
                  <input style={inputStyle} value={addForm.linkedin_url} onChange={(e) => setAddForm({ ...addForm, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input style={inputStyle} value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} placeholder="Quick note about this contact..." />
              </div>
              <button
                data-testid="save-contact-btn"
                onClick={handleAddContact}
                disabled={saving || !addForm.name || !addForm.job_id}
                style={{
                  background: "linear-gradient(135deg, #3B4FD0, #2B3FBF)", color: "#fff",
                  border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600,
                  cursor: saving ? "wait" : "pointer", width: "100%",
                  opacity: saving || !addForm.name || !addForm.job_id ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
