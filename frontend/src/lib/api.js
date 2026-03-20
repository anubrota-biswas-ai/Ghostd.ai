const API = process.env.REACT_APP_BACKEND_URL + '/api';

async function request(method, path, body = null) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, opts);
  if (res.status === 401) {
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  exchangeSession: (sessionId) => request('POST', '/auth/session', { session_id: sessionId }),
  getMe: () => request('GET', '/auth/me'),
  logout: () => request('POST', '/auth/logout'),

  // Jobs
  getJobs: () => request('GET', '/jobs'),
  createJob: (data) => request('POST', '/jobs', data),
  updateJob: (id, data) => request('PUT', `/jobs/${id}`, data),
  deleteJob: (id) => request('DELETE', `/jobs/${id}`),

  // Contacts
  addContact: (jobId, data) => request('POST', `/jobs/${jobId}/contacts`, data),
  getAllContacts: () => request('GET', '/contacts'),
  updateContact: (id, data) => request('PUT', `/contacts/${id}`, data),
  deleteContact: (id) => request('DELETE', `/contacts/${id}`),

  // Activity
  addActivity: (jobId, data) => request('POST', `/jobs/${jobId}/activity`, data),

  // Sponsorship
  checkSponsorship: (company) => request('GET', `/sponsorship/check?company=${encodeURIComponent(company)}`),
  refreshSponsors: () => request('POST', '/sponsorship/refresh'),
  sponsorshipStatus: () => request('GET', '/sponsorship/status'),

  // Company Profile
  updateCompanyProfile: (jobId, data) => request('PUT', `/jobs/${jobId}/company-profile`, data),

  // CV
  uploadCV: (data) => request('POST', '/cv/upload', data),
  uploadCVFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API}/cv/upload-file`, { method: 'POST', credentials: 'include', body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Upload failed'); }
    return res.json();
  },
  getCVs: () => request('GET', '/cv'),

  // AI
  parseJD: (jdText) => request('POST', '/ai/parse-jd', { jd_text: jdText }),
  analyzeCV: (cvText, jdText, jobId) =>
    request('POST', '/ai/analyze-cv', { cv_text: cvText, jd_text: jdText, job_id: jobId }),
  generateCoverLetter: (cvText, jdText, company, tone) =>
    request('POST', '/ai/cover-letter', { cv_text: cvText, jd_text: jdText, company, tone }),
  parseEmail: (emailText, jobId) =>
    request('POST', '/ai/parse-email', { email_text: emailText, job_id: jobId }),

  // Gmail
  gmailLogin: () => request('GET', '/oauth/gmail/login'),
  gmailStatus: () => request('GET', '/gmail/status'),
  gmailDisconnect: () => request('POST', '/gmail/disconnect'),
  gmailEmails: (jobId) => request('GET', `/gmail/emails${jobId ? `?job_id=${jobId}` : ''}`),
  gmailSend: (to, subject, body) => request('POST', '/gmail/send', { to, subject, body }),
  gmailScan: () => request('POST', '/gmail/scan'),

  // Notifications
  getNotifications: () => request('GET', '/notifications'),
  confirmNotification: (id) => request('POST', `/notifications/${id}/confirm`),
  dismissNotification: (id) => request('POST', `/notifications/${id}/dismiss`),

  // ATS Results
  saveATSResults: (data) => request('POST', '/ats/save', data),
  getATSResults: (jobId) => request('GET', `/ats/results${jobId ? `?job_id=${jobId}` : ''}`),
  updateATSResults: (id, data) => request('PUT', `/ats/results/${id}`, data),

  // Cover Letters
  saveCoverLetter: (data) => request('POST', '/cover-letter/save', data),
  getCoverLetter: (jobId) => request('GET', `/cover-letter${jobId ? `?job_id=${jobId}` : ''}`),
  regenerateSection: (paragraph, instruction, cvText, jdText) =>
    request('POST', '/cover-letter/regenerate-section', { paragraph, instruction, cv_text: cvText, jd_text: jdText }),
};
