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

  // Interview Prep
  generateInterviewPrep: (jobId, jdText) =>
    request('POST', `/jobs/${jobId}/interview-prep`, { jd_text: jdText }),
  getInterviewPrep: (jobId) => request('GET', `/jobs/${jobId}/interview-prep`),
  updateInterviewPrep: (prepId, data) => request('PUT', `/interview-prep/${prepId}`, data),
};
