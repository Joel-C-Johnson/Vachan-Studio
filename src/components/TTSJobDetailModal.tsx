// src/components/TTSJobDetailModal.tsx

import { useState, useEffect, useRef } from "react";
import {
  Download,
  Info,
  Pause,
  Play,
  SaveOff,
  Save,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from "lucide-react";
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
import { checkDuplicateFileName, countSavedJobs } from "@/services/indexedDB";

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

export function TTSJobDetailModal({
  job,
  isOpen,
  onClose,
}: TTSJobDetailModalProps) {
  const liveJob = useJobStore((state) =>
    state.jobs.find((j) => j.id === job?.id),
  );
  const currentJobData = liveJob || job;

  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const autoPlayRef = useRef(autoPlay);

  const toggleJobSavedStore = useJobStore((state) => state.toggleJobSaved);

  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  // Effect 1 — initialize audio files from blobs
  useEffect(() => {
    if (!isOpen || currentJobData?.type !== "tts") return;
    const blobs = currentJobData?.output?.audioBlobs;
    if (!blobs || blobs.length === 0) return;

    const files: AudioFile[] = blobs.map((b, i) => ({
      name: `audio_${i}.wav`,
      blob: b,
      url: URL.createObjectURL(b),
    }));
    setAudioFiles(files);
    setCurrentIndex(0);
    setHasStartedPlaying(false);
  }, [isOpen, currentJobData?.output?.audioBlobs]);

  // Effect 2 — create WaveSurfer after audioFiles exist in DOM
  useEffect(() => {
    if (!isOpen || audioFiles.length === 0) return;

    const init = () => {
      if (!waveformRef.current) {
        setTimeout(init, 100);
        return;
      }

      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
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

      ws.on("play", () => {
        setIsPlaying(true);
        setHasStartedPlaying(true);
      });
      ws.on("pause", () => setIsPlaying(false));
      ws.on("finish", () => {
        setIsPlaying(false);
        setCurrentIndex((prev) => {
          if (autoPlayRef.current && prev < audioFiles.length - 1)
            return prev + 1;
          return prev;
        });
      });

      ws.loadBlob(audioFiles[currentIndex].blob);
      wavesurferRef.current = ws;
    };

    init();

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [isOpen, audioFiles, currentIndex]);

  useEffect(() => {
    if (!wavesurferRef.current || audioFiles.length === 0) return;
    if (autoPlayRef.current && currentIndex > 0) {
      wavesurferRef.current.once("ready", () => {
        wavesurferRef.current?.play();
      });
    }
  }, [currentIndex]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      audioFiles.forEach((f) => URL.revokeObjectURL(f.url));
    };
  }, [audioFiles]);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentJobData) return;
    if (currentJobData.saved) {
      handleUnsave();
      return;
    }

    const nameWithoutExt = (
      currentJobData.input.fileName || `tts_${currentJobData.jobId}`
    ).replace(/\.[^/.]+$/, "");
    setSaveFileName(nameWithoutExt);
    setIsSaving(true);
  };

  const handleUnsave = async () => {
    if (!currentJobData) return;
    await toggleJobSavedStore(currentJobData.id);
    toast.success("File unsaved");
  };

  const handleSaveConfirm = async () => {
    if (!currentJobData) return;

    const savedCount = await countSavedJobs("tts");
    if (savedCount >= 10) {
      toast.error(
        "Maximum 10 saved files allowed. Please remove a file first.",
      );
      setIsSaving(false);
      return;
    }

    const isDuplicate = await checkDuplicateFileName(
      saveFileName.trim() || `tts_${currentJobData.jobId}`,
      "tts",
      currentJobData.id,
    );
    if (isDuplicate) {
      toast.error(
        "A file with this name already exists. Please choose a different name.",
      );
      return;
    }

    const updateJob = useJobStore.getState().updateJob;
    updateJob(currentJobData.id, {
      input: {
        ...currentJobData.input,
        fileName: saveFileName.trim() || `tts_${currentJobData.jobId}`,
      },
    });

    await toggleJobSavedStore(currentJobData.id);
    setIsSaving(false);
    toast.success("File saved!");
  };

  const handleSaveCancel = () => {
    setIsSaving(false);
    setSaveFileName("");
  };

  const handleDownload = async () => {
    if (audioFiles.length === 0) return;

    if (audioFiles.length === 1) {
      const file = audioFiles[0];
      const a = document.createElement("a");
      a.href = file.url;
      a.download = file.name;
      a.click();
      return;
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    audioFiles.forEach((file) => {
      zip.file(file.name, file.blob);
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tts_audio.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[90vw] max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>
            <h2 className="text-xl font-semibold">Audio Generation</h2>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 mt-6">
          {/* Input text - readonly */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
            {/* <h3 className="text-sm font-semibold mb-5">Input Text</h3> */}
            {currentJobData?.input?.params?.texts &&
            currentJobData.input.params.texts.length > 0 ? (
              currentJobData.input.params.texts.map((text, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-sm bg-background transition-colors ${
                    hasStartedPlaying && i === currentIndex
                      ? "border-blue-400 ring-1 ring-blue-400"
                      : "border-input"
                  }`}
                >
                  {text}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No input text available
              </p>
            )}
          </div>

          {/* Audio Player */}
          {audioFiles.length > 0 ? (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
              {/* Header with actions */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Audio</h3>
                <div className="flex items-center gap-1">
                  {isSaving ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={saveFileName}
                        onChange={(e) => setSaveFileName(e.target.value)}
                        className="h-8 text-sm border rounded px-2 w-40 focus:outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveConfirm();
                          if (e.key === "Escape") handleSaveCancel();
                        }}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer text-green-600 hover:text-green-700"
                            onClick={handleSaveConfirm}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Confirm save</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer text-red-600 hover:text-red-700"
                            onClick={handleSaveCancel}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cancel</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <>
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
                        <TooltipContent>
                          <p>Download audio</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Save/Unsave */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={handleSaveClick}
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
                                <h4 className="font-semibold text-sm">
                                  Job Information
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Job ID:
                                    </span>
                                    <span>{currentJobData?.jobId}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Language:
                                    </span>
                                    <span>
                                      {currentJobData?.input.params?.language}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Model:
                                    </span>
                                    <span>
                                      {currentJobData?.input.params?.model}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Device:
                                    </span>
                                    <span>
                                      {currentJobData?.input.params?.device?.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </TooltipTrigger>
                      </Tooltip>
                    </>
                  )}
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
                        onClick={() =>
                          setCurrentIndex((p) => Math.max(0, p - 1))
                        }
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
                        onClick={() =>
                          setCurrentIndex((p) =>
                            Math.min(audioFiles.length - 1, p + 1),
                          )
                        }
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
