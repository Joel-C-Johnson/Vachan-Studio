// src/components/TTSJobDetailModal.tsx

import { useState, useEffect, useRef } from "react";
import { Download, Info, Pause, Play, SaveOff, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import WaveSurfer from "wavesurfer.js";
import type { Job } from "@/types";
import { useJobStore } from "@/store/jobStore";
import { countSavedJobs } from "@/services/indexedDB";

interface TTSJobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

interface AudioFile {
  name: string;
  blob: Blob;
  url: string;
}

export function TTSJobDetailModal({ job, isOpen, onClose }: TTSJobDetailModalProps) {
  const liveJob = useJobStore((state) =>
    state.jobs.find((j) => j.id === job?.id),
  );
  const currentJobData = liveJob || job;

  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const toggleJobSavedStore = useJobStore((state) => state.toggleJobSaved);

  // Init WaveSurfer when modal opens or segment changes
  useEffect(() => {
    if (!isOpen || currentJobData?.type !== "tts") return;

    const blobs = currentJobData?.output?.audioBlobs;
    if (!blobs || blobs.length === 0) return;

    const init = () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }

      if (!waveformRef.current) {
        setTimeout(init, 100);
        return;
      }

      // Build audio file list on first load
      if (audioFiles.length === 0) {
        const files: AudioFile[] = blobs.map((b, i) => ({
          name: `audio_${i}.wav`,
          blob: b,
          url: URL.createObjectURL(b),
        }));
        setAudioFiles(files);
      }

      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "rgb(148, 163, 184)",
        progressColor: "rgb(99, 102, 241)",
        cursorColor: "rgb(99, 102, 241)",
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 1,
        height: 60,
        barGap: 2,
      });

      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));
      ws.on("finish", () => {
        setIsPlaying(false);
        if (autoPlay && currentIndex < blobs.length - 1) {
          setCurrentIndex((p) => p + 1);
        }
      });

      ws.loadBlob(blobs[currentIndex]);
      wavesurferRef.current = ws;
    };

    init();

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [isOpen, currentIndex]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      audioFiles.forEach((f) => URL.revokeObjectURL(f.url));
    };
  }, [audioFiles]);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentJobData) return;

    const wasSaved = currentJobData.saved;

    if (!wasSaved) {
      const savedCount = await countSavedJobs();
      if (savedCount >= 10) {
        toast.error("Maximum 10 saved files allowed. Please remove a file first.");
        return;
      }
    }

    await toggleJobSavedStore(currentJobData.id);
    toast.success(wasSaved ? "File unsaved" : "File saved!");
  };

  const handleDownload = () => {
    if (audioFiles.length === 0) return;
    const file = audioFiles[currentIndex];
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.click();
  };

  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[90vw] max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>
            <div>
              <h2 className="text-xl font-semibold">Generated Audio</h2>
              <p className="text-sm text-muted-foreground m-1">
                Job #{currentJobData?.jobId}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 mt-6">
          {/* Input text - readonly */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">Input Text</h3>
            <p className="text-sm text-muted-foreground">
              {currentJobData?.input?.fileName}
            </p>
          </div>

          {/* Audio Player */}
          {audioFiles.length > 0 ? (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
              {/* Header with actions */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Audio</h3>
                <div className="flex items-center gap-1">
                  {/* Download */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={handleDownload}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Download audio</p></TooltipContent>
                  </Tooltip>

                  {/* Save/Unsave */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={handleToggleSave}
                      >
                        {currentJobData?.saved ? (
                          <SaveOff className="h-4 w-4" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{currentJobData?.saved ? "Unsave" : "Save"}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Info */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HoverCard openDelay={0} closeDelay={0}>
                        <HoverCardTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-52">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Job Information</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Job ID:</span>
                                <span>{currentJobData?.jobId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Language:</span>
                                <span>{currentJobData?.input.params?.language}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Model:</span>
                                <span>{currentJobData?.input.params?.model}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Device:</span>
                                <span>{currentJobData?.input.params?.device?.toUpperCase()}</span>
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </TooltipTrigger>
                  </Tooltip>
                </div>
              </div>

              {/* Segment pills + autoplay */}
              {audioFiles.length > 1 && (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {audioFiles.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                          i === currentIndex
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-accent"
                        }`}
                      >
                        Segment {i + 1}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="modal-autoplay"
                      checked={autoPlay}
                      onChange={(e) => setAutoPlay(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label
                      htmlFor="modal-autoplay"
                      className="text-xs text-muted-foreground cursor-pointer"
                    >
                      Auto-play next
                    </label>
                  </div>
                </div>
              )}

              {/* Waveform player */}
              <div className="border rounded-lg p-4 bg-background">
                <div ref={waveformRef} className="w-full" />
                <div className="flex items-center gap-3 mt-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 cursor-pointer shrink-0"
                    onClick={() => wavesurferRef.current?.playPause()}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

                  {audioFiles.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                        disabled={currentIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {currentIndex + 1} / {audioFiles.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => setCurrentIndex((p) => Math.min(audioFiles.length - 1, p + 1))}
                        disabled={currentIndex === audioFiles.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  <span className="text-xs text-muted-foreground truncate">
                    {audioFiles[currentIndex]?.name}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
              No audio available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}