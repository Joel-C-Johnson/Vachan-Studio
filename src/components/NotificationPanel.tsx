// src/components/NotificationPanel.tsx

import { useRef, useEffect } from "react";
import {
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useJobStore } from "@/store/jobStore";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
// import { JobDetailModal } from "./JobDetailModal";
import type { Job } from "@/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenJob: (job: Job) => void;
}

export function NotificationPanel({
  isOpen,
  onClose,
  onOpenJob,
}: NotificationPanelProps) {
  const allJobs = useJobStore((state) => state.jobs);
  const removeJob = useJobStore((state) => state.removeJob);
  const dismissJob = useJobStore((state) => state.dismissJob);
  const panelRef = useRef<HTMLDivElement>(null);

  // Filter out dismissed jobs - only show non-dismissed
  const jobs = allJobs.filter((job) => !job.dismissed);

  // Sort jobs: active first, then by created date (newest first)
  const sortedJobs = [...jobs].sort((a, b) => {
    // Active jobs (pending/processing) first
    const aActive = a.status === "pending" || a.status === "processing";
    const bActive = b.status === "pending" || b.status === "processing";

    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;

    // Then sort by created date (newest first)
    return b.createdAt - a.createdAt;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending...";
      case "processing":
        return "Processing...";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 w-96 bg-background border rounded-lg shadow-lg z-50 max-h-[500px] flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Recent History</h3>
        <Button
          variant="ghost"
          size="lg"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Job List */}
      <div className="flex-1 overflow-y-auto">
        {sortedJobs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No jobs yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-semibold text-primary">
                      {job.type === "vc"
                        ? "VC"
                        : job.type === "nr"
                          ? "NR"
                          : job.type === "ae"
                            ? "AE"
                            : job.type.toUpperCase()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {job.output?.savedFileName ||
                        job.input.fileName ||
                        "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(job.status)}
                      <span className="text-xs text-muted-foreground">
                        {getStatusText(job.status)}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(job.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Cancel button - only for active jobs */}
                    {(job.status === "pending" ||
                      job.status === "processing") && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                            onClick={() => {
                              const updateJobByJobId =
                                useJobStore.getState().updateJobByJobId;
                              updateJobByJobId(job.jobId, {
                                status: "failed",
                                completedAt: Date.now(),
                                error: "Cancelled by user",
                              });
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cancel job</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {/* Open button - only for completed jobs */}
                    {job.status === "completed" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => {
                              onOpenJob(job);
                              onClose();
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View transcription</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Remove button */}
                    {(job.status === "completed" ||
                      job.status === "failed") && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                            onClick={async () => {
                              if (job.saved) {
                                // If saved: just dismiss from notifications (keep in saved list)
                                await dismissJob(job.id);
                              } else {
                                // If unsaved: delete completely from IndexedDB
                                removeJob(job.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove from notifications</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
