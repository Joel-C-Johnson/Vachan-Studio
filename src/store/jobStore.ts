import { create } from 'zustand';
import type { Job, JobStatus } from '@/types';

interface JobStore {
  jobs: Job[];
  
  // Actions
  addJob: (job: Omit<Job, 'id' | 'createdAt'>) => string;
  updateJob: (id: string, updates: Partial<Job>) => void;
  updateJobByJobId: (jobId: number, updates: Partial<Job>) => void;
  removeJob: (id: string) => void;
  clearCompletedJobs: () => void;
  getJobByJobId: (jobId: number) => Job | undefined;
  
  // Selectors
  getActiveJobs: () => Job[];
  getCompletedJobs: () => Job[];
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],

  // Add a new job
  addJob: (job) => {
    const id = crypto.randomUUID();
    const newJob: Job = {
      ...job,
      id,
      createdAt: Date.now(),
    };
    
    set((state) => ({
      jobs: [...state.jobs, newJob],
    }));
    
    return id;
  },

  // Update job by internal ID
  updateJob: (id, updates) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, ...updates } : job
      ),
    }));
  },

  // Update job by backend jobId (useful for SSE notifications)
  updateJobByJobId: (jobId, updates) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.jobId === jobId ? { ...job, ...updates } : job
      ),
    }));
  },

  // Remove a job
  removeJob: (id) => {
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
    }));
  },

  // Clear all completed/failed jobs
  clearCompletedJobs: () => {
    set((state) => ({
      jobs: state.jobs.filter(
        (job) => job.status !== 'completed' && job.status !== 'failed'
      ),
    }));
  },

  // Get job by backend jobId
  // getJobByJobId: (jobId) => {
  //   return get().jobs.find((job) => job.jobId === jobId);
  // },
  getJobByJobId: (jobId) => {
    const jobs = get().jobs; // Force subscription
    return jobs.find((job) => job.jobId === jobId); // ← Correct: job.jobId
  },

  // Get active jobs (pending or processing)
  getActiveJobs: () => {
    return get().jobs.filter(
      (job) => job.status === 'pending' || job.status === 'processing'
    );
  },

  // Get completed jobs
  getCompletedJobs: () => {
    return get().jobs.filter(
      (job) => job.status === 'completed' || job.status === 'failed'
    );
  },
}));