import { create } from "zustand";
import type { Job, StoredJob } from "@/types";
import {
  saveJobToDB,
  deleteJobFromDB,
  getAllJobsFromDB,
} from "@/services/indexedDB";

interface HandoffAudio {
  blob: Blob;
  fileName: string;
  subFeature: "vc" | "nr" | "ae";
}

interface JobStore {
  jobs: Job[];
  isLoaded: boolean;
  handoffAudio: HandoffAudio | null;
  setHandoffAudio: (handoff: HandoffAudio | null) => void;

  // Actions
  addJob: (
    job: Omit<Job, "id" | "createdAt" | "saved" | "dismissed">,
  ) => string;
  updateJob: (id: string, updates: Partial<Job>) => void;
  updateJobByJobId: (jobId: number, updates: Partial<Job>) => void;
  removeJob: (id: string) => void;
  clearCompletedJobs: () => void;
  getJobByJobId: (jobId: number) => Job | undefined;
  loadJobsFromDB: () => Promise<void>;
  toggleJobSaved: (id: string) => Promise<void>;
  dismissJob: (id: string) => Promise<void>;

  // Selectors
  getActiveJobs: () => Job[];
  getCompletedJobs: () => Job[];
  getSavedJobs: () => Job[];
}

// Convert Job to StoredJob for IndexedDB
function jobToStoredJob(job: Job): StoredJob {
  return {
    id: job.id,
    jobId: job.jobId,
    type: job.type,
    status: job.status,
    saved: job.saved,
    dismissed: job.dismissed,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    input: {
      fileName: job.input.fileName || "",
      fileSize: job.input.fileSize || 0,
      audioBlob: job.input.audioBlob,
      params: job.input.params,
    },
    output: job.output,
    error: job.error,
  };
}

// Convert StoredJob from IndexedDB to Job
function storedJobToJob(stored: StoredJob): Job {
  return {
    id: stored.id,
    jobId: stored.jobId,
    type: stored.type,
    status: stored.status,
    saved: stored.saved,
    dismissed: stored.dismissed,
    createdAt: stored.createdAt,
    completedAt: stored.completedAt,
    input: {
      fileName: stored.input.fileName,
      fileSize: stored.input.fileSize,
      audioBlob: stored.input.audioBlob,
      params: stored.input.params,
    },
    output: stored.output,
    error: stored.error,
  };
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: [],
  isLoaded: false,
  handoffAudio: null,
  setHandoffAudio: (handoff) => set({ handoffAudio: handoff }),

  // Load jobs from IndexedDB on app start
  loadJobsFromDB: async () => {
    try {
      const storedJobs = await getAllJobsFromDB();
      const jobs = storedJobs.map(storedJobToJob);
      set({ jobs, isLoaded: true });
      console.log("Loaded jobs from IndexedDB:", jobs.length);
    } catch (error) {
      console.error("Failed to load jobs from IndexedDB:", error);
      set({ isLoaded: true }); // Mark as loaded even on error
    }
  },

  // Add a new job
  addJob: (job) => {
    const id = crypto.randomUUID();
    const newJob: Job = {
      ...job,
      id,
      saved: false,
      dismissed: false,
      createdAt: Date.now(),
    };

    // Update store
    set((state) => ({
      jobs: [...state.jobs, newJob],
    }));

    // Save to IndexedDB (async, non-blocking)
    saveJobToDB(jobToStoredJob(newJob)).catch((error) => {
      console.error("Failed to save job to IndexedDB:", error);
    });

    return id;
  },

  // Update job by internal ID
  updateJob: (id, updates) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, ...updates } : job,
      ),
    }));

    // Update in IndexedDB
    const updatedJob = get().jobs.find((j) => j.id === id);
    if (updatedJob) {
      saveJobToDB(jobToStoredJob(updatedJob)).catch((error) => {
        console.error("Failed to update job in IndexedDB:", error);
      });
    }
  },

  // Update job by backend jobId
  updateJobByJobId: (jobId, updates) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.jobId === jobId ? { ...job, ...updates } : job,
      ),
    }));

    // Update in IndexedDB
    const updatedJob = get().jobs.find((j) => j.jobId === jobId);
    if (updatedJob) {
      saveJobToDB(jobToStoredJob(updatedJob)).catch((error) => {
        console.error("Failed to update job in IndexedDB:", error);
      });
    }
  },

  // Toggle job saved status
  toggleJobSaved: async (id) => {
    const job = get().jobs.find((j) => j.id === id);
    if (!job) return;

    const newSavedStatus = !job.saved;

    // Update store
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, saved: newSavedStatus } : j,
      ),
    }));

    // Update in IndexedDB
    const updatedJob = get().jobs.find((j) => j.id === id);
    if (updatedJob) {
      try {
        await saveJobToDB(jobToStoredJob(updatedJob));
        console.log("Job saved status updated:", id, newSavedStatus);
      } catch (error) {
        console.error("Failed to update saved status in IndexedDB:", error);
      }
    }
  },

  // Dismiss job from notifications
  dismissJob: async (id) => {
    // Update store
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, dismissed: true } : j,
      ),
    }));

    // Update in IndexedDB
    const updatedJob = get().jobs.find((j) => j.id === id);
    if (updatedJob) {
      try {
        await saveJobToDB(jobToStoredJob(updatedJob));
        console.log("Job dismissed from notifications:", id);
      } catch (error) {
        console.error("Failed to update dismissed status in IndexedDB:", error);
      }
    }
  },

  // Remove a job
  removeJob: (id) => {
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
    }));

    // Remove from IndexedDB
    deleteJobFromDB(id).catch((error) => {
      console.error("Failed to delete job from IndexedDB:", error);
    });
  },

  // Clear all completed/failed jobs
  clearCompletedJobs: () => {
    const completedIds = get()
      .jobs.filter(
        (job) => job.status === "completed" || job.status === "failed",
      )
      .map((job) => job.id);

    set((state) => ({
      jobs: state.jobs.filter(
        (job) => job.status !== "completed" && job.status !== "failed",
      ),
    }));

    // Remove from IndexedDB
    completedIds.forEach((id) => {
      deleteJobFromDB(id).catch((error) => {
        console.error("Failed to delete job from IndexedDB:", error);
      });
    });
  },

  // Get job by backend jobId
  getJobByJobId: (jobId) => {
    const jobs = get().jobs;
    return jobs.find((job) => job.jobId === jobId);
  },

  // Get active jobs (pending or processing)
  getActiveJobs: () => {
    return get().jobs.filter(
      (job) => job.status === "pending" || job.status === "processing",
    );
  },

  // Get completed jobs
  getCompletedJobs: () => {
    return get().jobs.filter(
      (job) => job.status === "completed" || job.status === "failed",
    );
  },

  // Get saved jobs
  getSavedJobs: () => {
    return get().jobs.filter((job) => job.saved);
  },
}));
