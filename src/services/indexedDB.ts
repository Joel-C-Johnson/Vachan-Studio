// src/services/indexedDB.ts

import type { StoredJob } from "@/types";

const DB_NAME = "VachanEngineDB";
const DB_VERSION = 1;
const STORE_NAME = "jobs";

/**
 * Initialize IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });

        // Create indexes
        store.createIndex("jobId", "jobId", { unique: true });
        store.createIndex("saved", "saved", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

/**
 * Save a job to IndexedDB
 */
export async function saveJobToDB(job: StoredJob): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(job);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get a job by ID
 */
export async function getJobFromDB(id: string): Promise<StoredJob | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all jobs
 */
export async function getAllJobsFromDB(): Promise<StoredJob[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all saved jobs
 */
export async function getSavedJobsFromDB(): Promise<StoredJob[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("saved");
    const request = index.getAll(IDBKeyRange.only(true)); // Correct way to filter by index

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Count saved jobs
 */
export async function countSavedJobs(): Promise<number> {
  const allJobs = await getAllJobsFromDB();
  return allJobs.filter((job) => job.saved === true).length;
}

/**
 * Mark job as saved/unsaved
 */
export async function toggleJobSaved(
  id: string,
  saved: boolean,
): Promise<void> {
  const job = await getJobFromDB(id);
  if (!job) throw new Error("Job not found");

  job.saved = saved;
  await saveJobToDB(job);
}

/**
 * Delete a job
 */
export async function deleteJobFromDB(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete all unsaved jobs (called on logout)
 */
export async function deleteUnsavedJobs(): Promise<void> {
  const allJobs = await getAllJobsFromDB();
  const unsavedJobs = allJobs.filter((job) => !job.saved);

  for (const job of unsavedJobs) {
    await deleteJobFromDB(job.id);
  }
}

/**
 * Update job status
 */
export async function updateJobInDB(
  id: string,
  updates: Partial<StoredJob>,
): Promise<void> {
  const job = await getJobFromDB(id);
  if (!job) throw new Error("Job not found");

  Object.assign(job, updates);
  await saveJobToDB(job);
}
