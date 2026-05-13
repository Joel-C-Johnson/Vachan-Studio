// src/components/FeatureLayout.tsx

import { useState } from "react";
import type { ReactNode } from "react";
import {
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  SquareCenterlineDashedVertical,
  SquareCenterlineDashedHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useJobStore } from "@/store/jobStore";
import { JobDetailModal } from "./JobDetailModal";
import { deleteJobFromDB } from "@/services/indexedDB";
import { toast } from "sonner";
import type { Job } from "@/types";

interface FeatureLayoutProps {
  featureName: string;
  featureType: "stt" | "tts" | "ttt" | "sts";
  children: ReactNode;
  settingsContent: ReactNode;
  showNewButton?: boolean;
  onNew?: () => void;
  viewMode?: "horizontal" | "vertical";
  onViewModeChange?: (mode: "horizontal" | "vertical") => void;
}

export function FeatureLayout({
  featureName,
  featureType,
  children,
  settingsContent,
  showNewButton = true,
  viewMode = "horizontal",
  onViewModeChange,
  onNew,
}: FeatureLayoutProps) {
  const navigate = useNavigate();
  const activeJobCount = useJobStore((state) => state.getActiveJobs().length);
  const isNewDisabled = activeJobCount >= 3;
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [savedSectionOpen, setSavedSectionOpen] = useState(false); // Start collapsed
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const allJobs = useJobStore((state) => state.jobs);

  const savedJobs = allJobs.filter(
    (job) => job.saved === true && job.type === featureType,
  );
  const removeJob = useJobStore((state) => state.removeJob);

  const toggleViewMode = () => {
    const newMode = viewMode === "horizontal" ? "vertical" : "horizontal";
    onViewModeChange?.(newMode);
  };

  const handleDeleteJob = async (e: React.MouseEvent, job: Job) => {
    e.stopPropagation(); // Prevent opening modal

    try {
      // Delete from IndexedDB
      await deleteJobFromDB(job.id);

      // Remove from store
      removeJob(job.id);

      toast.success("File removed from saved");
    } catch (error) {
      console.error("Failed to delete job:", error);
      toast.error("Failed to remove file");
    }
  };

  return (
    <div className="h-screen pt-16 flex overflow-hidden">
      {/* Left Panel - History/Navigation */}
      <div
        className={`border-r bg-background transition-all duration-300 shrink-0 overflow-hidden ${
          leftPanelOpen ? "w-64" : "w-14"
        }`}
      >
        {leftPanelOpen ? (
          /* Expanded Left Panel */
          <div className="p-4 space-y-4 h-full flex flex-col">
            {/* Header with collapse and home */}
            <div className="flex items-center justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="cursor-pointer"
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/")}
                  >
                    <Home className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Go to homepage</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="cursor-pointer"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLeftPanelOpen(false)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Collapse panel</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Feature Name */}
            <h2 className="text-lg font-semibold">{featureName}</h2>

            {/* New Button - conditionally shown */}
            {showNewButton && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer mt-6"
                    onClick={onNew}
                    disabled={isNewDisabled}
                  >
                    New
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isNewDisabled
                      ? "Max 3 concurrent jobs running"
                      : "Start a new transcription"}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Saved Section - Accordion Style */}
            <div className="flex-1 overflow-auto mt-6">
              {/* Accordion Header */}
              <button
                onClick={() => setSavedSectionOpen(!savedSectionOpen)}
                className="w-full flex items-center justify-between py-2 px-1 hover:bg-accent rounded transition-colors cursor-pointer"
              >
                <span className="text-sm">
                  Saved {savedJobs.length > 0 && `(${savedJobs.length})`}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    savedSectionOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Accordion Content */}
              {savedSectionOpen && (
                <div className="mt-2 space-y-1">
                  {savedJobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                      No saved files yet
                    </p>
                  ) : (
                    savedJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className="text-xs p-2 hover:bg-accent rounded cursor-pointer flex items-center justify-between group"
                      >
                        <span className="truncate">{job.input.fileName}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 cursor-pointer"
                          onClick={(e) => handleDeleteJob(e, job)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Collapsed Left Panel */
          <div className="p-2 space-y-2 flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLeftPanelOpen(true)}
              title="Expand panel"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              title="Go to homepage"
            >
              <Home className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Middle Panel - Input/Output */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* View controls - top right */}
        <div className="h-12 flex items-center justify-end px-2 gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="cursor-pointer"
                variant="ghost"
                size="icon"
                onClick={toggleViewMode}
              >
                {viewMode === "horizontal" ? (
                  <SquareCenterlineDashedVertical className="h-5 w-5" />
                ) : (
                  <SquareCenterlineDashedHorizontal className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {viewMode === "horizontal"
                  ? "Switch to vertical split"
                  : "Switch to horizontal split"}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Only show settings icon when panel is closed */}
          {!rightPanelOpen && (
            <Button
              className="cursor-pointer"
              variant="ghost"
              size="icon"
              onClick={() => setRightPanelOpen(true)}
              title="Show settings"
            >
              ⚙️
            </Button>
          )}
        </div>

        {/* Content Area - passed as children */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>

      {/* Right Panel - Settings */}
      <div
        className={`border-l bg-background transition-all duration-300 shrink-0 ${
          rightPanelOpen ? "w-80" : "w-0"
        } overflow-hidden`}
      >
        {rightPanelOpen && (
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Settings</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="cursor-pointer"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRightPanelOpen(false)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hide settings</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Settings content passed as prop */}
            <div className="flex-1 overflow-auto">{settingsContent}</div>
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
