import { create } from 'zustand';

const MOCK_JOBS = [
  {
    id: 'job-1',
    title: 'Staff Design Engineer',
    company: 'Figma',
    location: 'San Francisco, CA',
    remote: true,
    salaryMin: 200000,
    salaryMax: 280000,
    currency: 'USD',
    status: 'wishlist',
    dateApplied: null,
    matchScore: null,
    contacts: [],
    activity: [],
    progress: null,
  },
  {
    id: 'job-2',
    title: 'Principal Engineer',
    company: 'Vercel',
    location: 'Remote',
    remote: true,
    salaryMin: 220000,
    salaryMax: 300000,
    currency: 'USD',
    status: 'wishlist',
    dateApplied: null,
    matchScore: null,
    contacts: [],
    activity: [],
    progress: null,
  },
  {
    id: 'job-3',
    title: 'Senior Frontend Engineer',
    company: 'Stripe',
    location: 'San Francisco, CA',
    remote: false,
    salaryMin: 180000,
    salaryMax: 250000,
    currency: 'USD',
    status: 'applied',
    dateApplied: '2026-02-15',
    matchScore: 87,
    contacts: [
      { id: 'c1', name: 'Sarah Chen', roleType: 'Recruiter', email: 'sarah@stripe.com', lastContacted: '2026-02-18', notes: 'Very responsive' },
      { id: 'c2', name: 'Tom Wilson', roleType: 'Hiring Manager', email: 'tom@stripe.com', lastContacted: null, notes: '' },
    ],
    activity: [
      { id: 'a1', message: 'Applied via website', timestamp: '2026-02-15T10:00:00Z' },
      { id: 'a2', message: 'Emailed Sarah — intro call scheduled', timestamp: '2026-02-18T14:00:00Z' },
    ],
    progress: { skills: 85, experience: 90, language: 80 },
  },
  {
    id: 'job-4',
    title: 'Full Stack Developer',
    company: 'Linear',
    location: 'Remote',
    remote: true,
    salaryMin: 150000,
    salaryMax: 200000,
    currency: 'USD',
    status: 'applied',
    dateApplied: '2026-02-20',
    matchScore: 72,
    contacts: [
      { id: 'c3', name: 'Emily Zhang', roleType: 'Recruiter', email: 'emily@linear.app', lastContacted: '2026-02-20', notes: '' },
    ],
    activity: [
      { id: 'a3', message: 'Applied through referral', timestamp: '2026-02-20T09:00:00Z' },
    ],
    progress: { skills: 70, experience: 75, language: 68 },
  },
  {
    id: 'job-5',
    title: 'React Engineer',
    company: 'Notion',
    location: 'New York, NY',
    remote: false,
    salaryMin: 170000,
    salaryMax: 230000,
    currency: 'USD',
    status: 'applied',
    dateApplied: '2026-02-22',
    matchScore: 91,
    contacts: [],
    activity: [
      { id: 'a4', message: 'Applied online', timestamp: '2026-02-22T11:00:00Z' },
    ],
    progress: { skills: 92, experience: 88, language: 95 },
  },
  {
    id: 'job-6',
    title: 'Senior Product Engineer',
    company: 'Airbnb',
    location: 'San Francisco, CA',
    remote: false,
    salaryMin: 190000,
    salaryMax: 260000,
    currency: 'USD',
    status: 'interview',
    dateApplied: '2026-02-01',
    matchScore: 78,
    contacts: [
      { id: 'c4', name: 'James Park', roleType: 'Recruiter', email: 'james@airbnb.com', lastContacted: '2026-02-25', notes: 'Technical phone screen next week' },
      { id: 'c5', name: 'Lisa Wong', roleType: 'Interviewer', email: '', lastContacted: null, notes: '' },
    ],
    activity: [
      { id: 'a5', message: 'Applied via referral from Alex', timestamp: '2026-02-01T08:00:00Z' },
      { id: 'a6', message: 'Phone screen with James', timestamp: '2026-02-10T15:00:00Z' },
      { id: 'a7', message: 'Technical interview scheduled', timestamp: '2026-02-25T10:00:00Z' },
    ],
    progress: { skills: 78, experience: 80, language: 72 },
  },
  {
    id: 'job-10',
    title: 'Frontend Platform Lead',
    company: 'Spotify',
    location: 'London, UK',
    remote: false,
    salaryMin: 140000,
    salaryMax: 190000,
    currency: 'GBP',
    status: 'interview',
    dateApplied: '2026-02-08',
    matchScore: 74,
    contacts: [
      { id: 'c11', name: 'Sofia Martinez', roleType: 'Recruiter', email: 'sofia@spotify.com', lastContacted: '2026-02-18', notes: '' },
    ],
    activity: [
      { id: 'a19', message: 'Applied via LinkedIn', timestamp: '2026-02-08T10:00:00Z' },
      { id: 'a20', message: 'Initial screen with Sofia', timestamp: '2026-02-18T11:00:00Z' },
    ],
    progress: { skills: 72, experience: 76, language: 70 },
  },
  {
    id: 'job-7',
    title: 'Lead Frontend Architect',
    company: 'Shopify',
    location: 'Remote',
    remote: true,
    salaryMin: 200000,
    salaryMax: 270000,
    currency: 'USD',
    status: 'in_progress',
    dateApplied: '2026-01-20',
    matchScore: 83,
    contacts: [
      { id: 'c6', name: 'Rachel Kim', roleType: 'Hiring Manager', email: 'rachel@shopify.com', lastContacted: '2026-02-20', notes: 'Final round next week' },
      { id: 'c7', name: 'David Lee', roleType: 'Interviewer', email: '', lastContacted: '2026-02-15', notes: 'Great chat about architecture' },
    ],
    activity: [
      { id: 'a8', message: 'Applied online', timestamp: '2026-01-20T09:00:00Z' },
      { id: 'a9', message: 'Phone screen passed', timestamp: '2026-01-28T14:00:00Z' },
      { id: 'a10', message: 'Technical interview with David', timestamp: '2026-02-15T10:00:00Z' },
      { id: 'a11', message: 'System design round scheduled', timestamp: '2026-02-22T16:00:00Z' },
    ],
    progress: { skills: 82, experience: 85, language: 78 },
  },
  {
    id: 'job-8',
    title: 'Senior Software Engineer',
    company: 'Datadog',
    location: 'New York, NY',
    remote: false,
    salaryMin: 185000,
    salaryMax: 240000,
    currency: 'USD',
    status: 'offer',
    dateApplied: '2026-01-10',
    matchScore: 94,
    contacts: [
      { id: 'c8', name: 'Mike Johnson', roleType: 'Recruiter', email: 'mike@datadog.com', lastContacted: '2026-02-26', notes: 'Sent offer letter' },
      { id: 'c9', name: 'Anna Petrov', roleType: 'Hiring Manager', email: 'anna@datadog.com', lastContacted: '2026-02-20', notes: '' },
    ],
    activity: [
      { id: 'a12', message: 'Applied via recruiter', timestamp: '2026-01-10T10:00:00Z' },
      { id: 'a13', message: 'Completed all rounds', timestamp: '2026-02-10T16:00:00Z' },
      { id: 'a14', message: 'Received offer — $220k base', timestamp: '2026-02-26T09:00:00Z' },
    ],
    progress: { skills: 95, experience: 92, language: 96 },
  },
  {
    id: 'job-9',
    title: 'Platform Engineer',
    company: 'Coinbase',
    location: 'Remote',
    remote: true,
    salaryMin: 160000,
    salaryMax: 220000,
    currency: 'USD',
    status: 'rejected',
    dateApplied: '2026-01-05',
    matchScore: 62,
    contacts: [
      { id: 'c10', name: 'Alex Turner', roleType: 'Recruiter', email: 'alex@coinbase.com', lastContacted: '2026-02-10', notes: 'Rejected after technical round' },
    ],
    activity: [
      { id: 'a15', message: 'Applied online', timestamp: '2026-01-05T11:00:00Z' },
      { id: 'a16', message: 'Phone screen passed', timestamp: '2026-01-15T14:00:00Z' },
      { id: 'a17', message: 'Technical round — did not pass', timestamp: '2026-02-05T10:00:00Z' },
      { id: 'a18', message: 'Rejection email received', timestamp: '2026-02-10T09:00:00Z' },
    ],
    progress: { skills: 60, experience: 65, language: 58 },
  },
];

const useJobStore = create((set, get) => ({
  jobs: MOCK_JOBS,
  selectedJobId: null,

  selectJob: (id) => set({ selectedJobId: id }),
  clearSelection: () => set({ selectedJobId: null }),

  moveJob: (jobId, newStatus) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, status: newStatus } : j
      ),
    })),

  addJob: (job) =>
    set((state) => ({
      jobs: [...state.jobs, { ...job, id: `job-${Date.now()}` }],
    })),

  getSelectedJob: () => {
    const { jobs, selectedJobId } = get();
    return jobs.find((j) => j.id === selectedJobId) || null;
  },
}));

export default useJobStore;
