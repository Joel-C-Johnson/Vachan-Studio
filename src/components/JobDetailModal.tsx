// src/components/JobDetailModal.tsx

import type { Job } from "@/types";
import { STTJobDetailModal } from "./STTJobDetailModal";
import { TTSJobDetailModal } from "./TTSJobDetailModal";
import { TTTJobDetailModal } from "./TTTJobDetailModal";
import { STSJobDetailModal } from "./STSJobDetailModal";
import { AudioToolsJobDetailModal } from "./AudioToolsJobDetailModal";

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

  if (job.type === "ttt") {
    return <TTTJobDetailModal job={job} isOpen={isOpen} onClose={onClose} />;
  }

  if (job.type === "sts") {
    return <STSJobDetailModal job={job} isOpen={isOpen} onClose={onClose} />;
  }
  if (job.type === "vc" || job.type === "nr" || job.type === "ae") {
  return <AudioToolsJobDetailModal job={job} isOpen={isOpen} onClose={onClose} />;
}
  return <STTJobDetailModal job={job} isOpen={isOpen} onClose={onClose} />;
}
