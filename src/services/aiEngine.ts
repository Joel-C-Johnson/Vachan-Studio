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
    },
  ): Promise<number> {
    const formData = new FormData();
    formData.append("files", audioFile);

    const url = new URL(`${API_BASE_URL}/model/audio/transcribe`);

    // Add query parameters
    url.searchParams.append("model_name", params.model_name);
    url.searchParams.append(
      "transcription_language",
      params.transcription_language,
    );
    if (params.device) url.searchParams.append("device", params.device);

    // Python expects "True" or "False" (capitalized)
    if (params.generate_timestamp !== undefined) {
      url.searchParams.append(
        "generate_timestamp",
        params.generate_timestamp ? "True" : "False",
      );
    }

    if (params.timestamp_file_format) {
      url.searchParams.append(
        "timestamp_file_format",
        params.timestamp_file_format,
      );
    }

    console.log("Submitting STT job to:", url.toString());

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("STT submission failed:", response.status, errorText);
      throw new Error(`${errorText}`);
    }

    const data: SubmitJobResponse = await response.json();
    console.log("STT job submitted successfully:", data);

    return data.data.jobId;
  }

  async submitTTSJob(
    texts: string[],
    token: string,
    params: {
      model_name: string;
      output_format: string;
      language?: string;
      description?: string;
      device?: string;
      enhance?: boolean;
    },
  ): Promise<number> {
    const url = new URL(`${API_BASE_URL}/model/audio/generate`);

    url.searchParams.append("model_name", params.model_name);
    url.searchParams.append("output_format", params.output_format);
    if (params.language) url.searchParams.append("language", params.language);
    if (params.description)
      url.searchParams.append("description", params.description);
    if (params.device) url.searchParams.append("device", params.device);
    if (params.enhance !== undefined) {
      url.searchParams.append("enhance", params.enhance ? "True" : "False");
    }

    console.log("Submitting TTS job to:", url.toString());

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(texts),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TTS submission failed:", response.status, errorText);
      throw new Error(`${errorText}`);
    }

    const data: SubmitJobResponse = await response.json();
    console.log("TTS job submitted successfully:", data);

    return data.data.jobId;
  }

  async submitTTTJob(
    texts: string[],
    token: string,
    params: {
      model_name: string;
      source_language: string;
      target_language: string;
      device?: string;
    },
  ): Promise<number> {
    const url = new URL(`${API_BASE_URL}/model/text/translate`);

    url.searchParams.append("model_name", params.model_name);
    url.searchParams.append("source_language", params.source_language);
    url.searchParams.append("target_language", params.target_language);
    if (params.device) url.searchParams.append("device", params.device);

    console.log("Submitting TTT job to:", url.toString());

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(texts),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TTT submission failed:", response.status, errorText);
      throw new Error(`${errorText}`);
    }

    const data: SubmitJobResponse = await response.json();
    console.log("TTT job submitted successfully:", data);

    return data.data.jobId;
  }

  async submitSTSJob(
    audioFile: File,
    token: string,
    params: {
      model_name: string;
      target_language: string;
      output_format: string;
      device?: string;
      enhance?: boolean;
    },
  ): Promise<number> {
    const formData = new FormData();
    formData.append("files", audioFile);

    const url = new URL(`${API_BASE_URL}/model/audio/translate`);

    url.searchParams.append("model_name", params.model_name);
    url.searchParams.append("target_language", params.target_language);
    url.searchParams.append("output_format", params.output_format);
    if (params.device) url.searchParams.append("device", params.device);
    if (params.enhance !== undefined) {
      url.searchParams.append("enhance", params.enhance ? "True" : "False");
    }

    console.log("Submitting STS job to:", url.toString());

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("STS submission failed:", response.status, errorText);
      throw new Error(`${errorText}`);
    }

    const data: SubmitJobResponse = await response.json();
    console.log("STS job submitted successfully:", data);

    return data.data.jobId;
  }

  async submitVoiceCloneJob(
    inputAudio: File,
    token: string,
    params: {
      output_format: string;
      reference_speaker?: string;
      input_language?: string;
      enhance?: boolean;
      reference_audio?: File;
    },
  ): Promise<number> {
    const formData = new FormData();
    formData.append("input_audios", inputAudio);
    if (params.reference_audio) {
      formData.append("reference_audio", params.reference_audio);
    }

    const url = new URL(`${API_BASE_URL}/model/audio/voice-clone`);
    url.searchParams.append("model_name", "chatterbox");
    url.searchParams.append("output_format", params.output_format);
    if (params.reference_speaker)
      url.searchParams.append("reference_speaker", params.reference_speaker);
    if (params.input_language)
      url.searchParams.append("input_language", params.input_language);
    if (params.enhance !== undefined) {
      url.searchParams.append("enhance", params.enhance ? "True" : "False");
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${errorText}`);
    }

    const data: SubmitJobResponse = await response.json();
    return data.data.jobId;
  }

  async submitNoiseRemovalJob(
    audioFile: File,
    token: string,
    params: {
      output_format: string;
      enhance?: boolean;
      device?: string;
    },
  ): Promise<number> {
    const formData = new FormData();
    formData.append("files", audioFile);

    const url = new URL(`${API_BASE_URL}/model/audio/noise-removal`);
    url.searchParams.append("model_name", "DeepFilterNet3");
    url.searchParams.append("output_format", params.output_format);
    if (params.enhance !== undefined) {
      url.searchParams.append("enhance", params.enhance ? "True" : "False");
    }
    if (params.device) url.searchParams.append("device", params.device);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${errorText}`);
    }

    const data: SubmitJobResponse = await response.json();
    return data.data.jobId;
  }

  async submitEnhanceJob(
    audioFile: File,
    token: string,
    params: {
      output_format: string;
      denoise?: boolean;
      device?: string;
    },
  ): Promise<number> {
    const formData = new FormData();
    formData.append("audio_file", audioFile);

    const url = new URL(`${API_BASE_URL}/model/audio/enhance`);
    url.searchParams.append("model_name", "resemble-enhance");
    url.searchParams.append("output_format", params.output_format);
    if (params.denoise !== undefined) {
      url.searchParams.append("denoise", params.denoise ? "True" : "False");
    }
    if (params.device) url.searchParams.append("device", params.device);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${errorText}`);
    }

    const data: SubmitJobResponse = await response.json();
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
   * Get job assets (downloads ZIP with SRT file)
   */
  async getJobAssets(jobId: number, token: string): Promise<Blob> {
    const url = `${API_BASE_URL}/assets?job_id=${jobId}`;

    console.log("Fetching assets for job:", jobId);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get job assets: ${response.status}`);
    }

    // Return the ZIP file as a blob
    const blob = await response.blob();
    console.log("Assets downloaded, size:", blob.size, "bytes");

    return blob;
  }

  /**
   * Cancel a job (placeholder - add endpoint when available)
   */
  async cancelJob(jobId: number): Promise<void> {
    // TODO: Add cancel endpoint when backend team provides it
    console.log("Cancel job:", jobId);
    throw new Error("Cancel endpoint not implemented yet");
  }
}

export const aiEngineService = new AIEngineService();
