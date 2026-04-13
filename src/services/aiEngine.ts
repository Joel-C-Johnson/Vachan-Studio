// src/services/aiEngine.ts

import { API_BASE_URL } from "@/config/constants";
import type { SubmitJobResponse, JobStatusResponse } from "@/types";

class AIEngineService {
  /**
   * Submit a STT job
   */
  // src/services/aiEngine.ts

async submitSTTJob(
  audioFile: File,
  token: string,
  params: {
    model_name: string;
    transcription_language: string;
    device?: string;
    generate_timestamp?: boolean;
    timestamp_file_format?: string;
  }
  ): Promise<number> {
    const formData = new FormData();
    formData.append('files', audioFile);

    const url = new URL(`${API_BASE_URL}/model/audio/transcribe`);

    // Add query parameters
    url.searchParams.append('model_name', params.model_name);
    url.searchParams.append('transcription_language', params.transcription_language);
    if (params.device) url.searchParams.append('device', params.device);

    // Python expects "True" or "False" (capitalized)
    if (params.generate_timestamp !== undefined) {
      url.searchParams.append('generate_timestamp', params.generate_timestamp ? 'True' : 'False');
    }

    if (params.timestamp_file_format) {
      url.searchParams.append('timestamp_file_format', params.timestamp_file_format);
    }

    console.log('Submitting STT job to:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('STT submission failed:', response.status, errorText);
      throw new Error(`Failed to submit STT job: ${response.status}`);
    }

    const data: SubmitJobResponse = await response.json();
    console.log('STT job submitted successfully:', data);

    return data.data.jobId;
  }

  /**
   * Get job status and result
   */
  async getJobStatus(jobId: number, token: string): Promise<JobStatusResponse> {
    const url = `${API_BASE_URL}/model/job?job_id=${jobId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.status}`);
    }

    const data: JobStatusResponse = await response.json();
    return data;
  }

  /**
   * Cancel a job (placeholder - add endpoint when available)
   */
  async cancelJob(jobId: number, token: string): Promise<void> {
    // TODO: Add cancel endpoint when backend team provides it
    console.log("Cancel job:", jobId);
    throw new Error("Cancel endpoint not implemented yet");
  }
}

export const aiEngineService = new AIEngineService();