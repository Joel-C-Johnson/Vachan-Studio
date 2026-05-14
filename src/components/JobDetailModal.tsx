// src/components/JobDetailModal.tsx

import type { Job } from "@/types";
import { STTJobDetailModal } from "./STTJobDetailModal";
import { TTSJobDetailModal } from "./TTSJobDetailModal";

interface JobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailModal({ job, isOpen, onClose }: JobDetailModalProps) {
  if (!job) return null;

  if (job.type === "tts") {
    return <TTSJobDetailModal job={job} isOpen={isOpen} onClose={onClose} />;
  }

  return <STTJobDetailModal job={job} isOpen={isOpen} onClose={onClose} />;
}