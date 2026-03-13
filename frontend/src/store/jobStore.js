import { create } from 'zustand';
import { api } from '@/lib/api';

const useJobStore = create((set, get) => ({
  jobs: [],
  selectedJobId: null,
  loading: false,

  fetchJobs: async () => {
    set({ loading: true });
    try {
      const jobs = await api.getJobs();
      set({ jobs, loading: false });
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
      set({ loading: false });
    }
  },

  selectJob: (id) => set({ selectedJobId: id }),
  clearSelection: () => set({ selectedJobId: null }),

  moveJob: async (jobId, newStatus) => {
    // Optimistic update
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)),
    }));
    try {
      await api.updateJob(jobId, { status: newStatus });
    } catch (e) {
      console.error('Failed to move job:', e);
      get().fetchJobs();
    }
  },

  addJob: async (jobData) => {
    const newJob = await api.createJob(jobData);
    set((state) => ({ jobs: [...state.jobs, newJob] }));
    return newJob;
  },

  deleteJob: async (jobId) => {
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== jobId),
      selectedJobId: state.selectedJobId === jobId ? null : state.selectedJobId,
    }));
    try {
      await api.deleteJob(jobId);
    } catch (e) {
      get().fetchJobs();
    }
  },

  getSelectedJob: () => {
    const { jobs, selectedJobId } = get();
    return jobs.find((j) => j.id === selectedJobId) || null;
  },
}));

export default useJobStore;
