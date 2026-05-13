export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type FeatureType = "stt" | "tts" | "ttt" | "sts";

// Our internal job representation
export interface Job {
  id: string;
  jobId: number;
  type: FeatureType;
  status: JobStatus;
  saved: boolean;
  dismissed: boolean;
  createdAt: number;
  completedAt?: number;
  input: {
    fileName?: string;
    fileSize?: number;
    audioBlob?: Blob;
    params?: {
      language?: string;
      model?: string;
      device?: string;
      timestamp?: boolean;
      format?: string;
    };
  };
  output?: {
    transcribedText?: string;
    srtText?: string;
    textWasEdited?: boolean;
    audioUrl?: string;
    audioReady?: boolean;
    translatedText?: string;
    data?: any;
  };
  error?: string;
}

export type StoredJob = Job;

// API Response Types

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface SubmitJobResponse {
  message: string;
  data: {
    jobId: number;
    status: string;
  };
}

export interface JobStatusResponse {
  message: string;
  data: {
    jobId: number;
    creationTime: string;
    userId: string;
    status: string; // "job is in progress" | "job finished" | "job failed"
    output?: {
      Language?: string;
      task_status?: string;
      transcriptions?: Array<{
        audioFile: string;
        transcribedText: string;
      }>;
      transcription_time?: string;
      [key: string]: any;
    };
    updationTime: string;
  };
}

export interface SSENotification {
  job_id: number;
  status: "started" | "processing" | "completed" | "failed";
}
