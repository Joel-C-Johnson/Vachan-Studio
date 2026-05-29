// src/components/AudioToolsJobDetailModal.tsx

import { useState, useEffect, useRef } from "react";
import {
  Download,
  Info,
  Pause,
  Play,
  SaveOff,
  Save,
  Check,
  X,
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
import { countSavedJobs, checkDuplicateFileName } from "@/services/indexedDB";

interface AudioToolsJobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

const FEATURE_LABELS: Record<string, string> = {
  vc: "Voice Clone",
  nr: "Noise Removal",
  ae: "Audio Enhance",
};

export function AudioToolsJobDetailModal({
  job,
  isOpen,
  onClose,
}: AudioToolsJobDetailModalProps) {
  const liveJob = useJobStore((state) =>
    state.jobs.find((j) => j.id === job?.id),
  );
  const currentJobData = liveJob || job;

  const [isPlaying, setIsPlaying] = useState(false);
  const [inputIsPlaying, setInputIsPlaying] = useState(false);
  const [outputAudioUrl, setOutputAudioUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");

  const outputWaveformRef = useRef<HTMLDivElement>(null);
  const outputWavesurferRef = useRef<WaveSurfer | null>(null);
  const inputWaveformRef = useRef<HTMLDivElement>(null);
  const inputWavesurferRef = useRef<WaveSurfer | null>(null);

  const toggleJobSavedStore = useJobStore((state) => state.toggleJobSaved);

  const wavesurferConfig = {
    waveColor: "rgb(148, 163, 184)",
    progressColor: "rgb(99, 102, 241)",
    cursorColor: "rgb(99, 102, 241)",
    barWidth: 2,
    barRadius: 3,
    cursorWidth: 1,
    height: 60,
    barGap: 2,
  };

  // Effect 1 — init output audio blob
  useEffect(() => {
    if (!isOpen) return;
    const blobs = currentJobData?.output?.audioBlobs;
    if (!blobs || blobs.length === 0) return;

    const url = URL.createObjectURL(blobs[0]);
    setOutputAudioUrl(url);
    setIsPlaying(false);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isOpen, currentJobData?.output?.audioBlobs]);

  // Effect 2 — create output WaveSurfer
  useEffect(() => {
    if (!isOpen || !outputAudioUrl) return;

    const init = () => {
      if (!outputWaveformRef.current) {
        setTimeout(init, 100);
        return;
      }
      if (outputWavesurferRef.current) {
        outputWavesurferRef.current.destroy();
        outputWavesurferRef.current = null;
      }
      const ws = WaveSurfer.create({
        container: outputWaveformRef.current,
        ...wavesurferConfig,
      });
      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));
      ws.on("finish", () => setIsPlaying(false));
      ws.load(outputAudioUrl);
      outputWavesurferRef.current = ws;
    };

    init();

    return () => {
      if (outputWavesurferRef.current) {
        outputWavesurferRef.current.destroy();
        outputWavesurferRef.current = null;
      }
    };
  }, [isOpen, outputAudioUrl]);

  // Effect 3 — create input WaveSurfer
  useEffect(() => {
    if (!isOpen || !currentJobData?.input.audioBlob) return;

    const init = () => {
      if (!inputWaveformRef.current) {
        setTimeout(init, 100);
        return;
      }
      if (inputWavesurferRef.current) {
        inputWavesurferRef.current.destroy();
        inputWavesurferRef.current = null;
      }
      const ws = WaveSurfer.create({
        container: inputWaveformRef.current,
        ...wavesurferConfig,
      });
      ws.on("play", () => setInputIsPlaying(true));
      ws.on("pause", () => setInputIsPlaying(false));
      ws.on("finish", () => setInputIsPlaying(false));
      const url = URL.createObjectURL(currentJobData.input.audioBlob!);
      ws.load(url);
      inputWavesurferRef.current = ws;
    };

    init();

    return () => {
      if (inputWavesurferRef.current) {
        inputWavesurferRef.current.destroy();
        inputWavesurferRef.current = null;
      }
    };
  }, [isOpen, currentJobData?.input.audioBlob]);

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentJobData) return;
    if (currentJobData.saved) {
      await toggleJobSavedStore(currentJobData.id);
      toast.success("File unsaved");
      return;
    }
    const nameWithoutExt = (
      currentJobData.input.fileName ||
      `${currentJobData.type}_${currentJobData.jobId}`
    ).replace(/\.[^/.]+$/, "");
    setSaveFileName(nameWithoutExt);
    setIsSaving(true);
  };

  const handleSaveConfirm = async () => {
    if (!currentJobData) return;
    const savedCount = await countSavedJobs(currentJobData.type);
    if (savedCount >= 10) {
      toast.error(
        "Maximum 10 saved files allowed. Please remove a file first.",
      );
      setIsSaving(false);
      return;
    }
    const isDuplicate = await checkDuplicateFileName(
      saveFileName.trim() || `${currentJobData.type}_${currentJobData.jobId}`,
      currentJobData.type,
      currentJobData.id,
    );
    if (isDuplicate) {
      toast.error(
        "A file with this name already exists. Please choose a different name.",
      );
      return;
    }
    useJobStore.getState().updateJob(currentJobData.id, {
      output: {
        ...currentJobData.output,
        savedFileName:
          saveFileName.trim() ||
          `${currentJobData.type}_${currentJobData.jobId}`,
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

  const handleDownload = () => {
    if (!outputAudioUrl) return;
    const savedName = (
      currentJobData?.output?.savedFileName ||
      currentJobData?.input.fileName ||
      `${currentJobData?.type}_${currentJobData?.jobId}`
    ).replace(/\.[^/.]+$/, "");
    const a = document.createElement("a");
    a.href = outputAudioUrl;
    const ext = currentJobData?.input.params?.outputFormat || "wav";
    a.download = `${savedName}.${ext}`;
    a.click();
  };

  if (!job) return null;

  const featureLabel =
    FEATURE_LABELS[currentJobData?.type || ""] || "Audio Tools";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[90vw] max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>
            <h2 className="text-xl font-semibold">{featureLabel}</h2>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 mt-6">
          {/* Input audio */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <h3 className="text-sm font-semibold">Input Audio</h3>
            {currentJobData?.input.audioBlob ? (
              <div className="border rounded-lg p-4 bg-background">
                <div
                  ref={inputWaveformRef}
                  className="w-full overflow-hidden"
                />
                <div className="flex items-center gap-3 mt-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 cursor-pointer shrink-0"
                    onClick={() => inputWavesurferRef.current?.playPause()}
                  >
                    {inputIsPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground truncate">
                    {currentJobData?.input.fileName
                      ? `${currentJobData.input.fileName.replace(/\.[^/.]+$/, "")}.wav`
                      : `output.wav`}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {currentJobData?.input.fileName}
              </p>
            )}
          </div>

          {/* Output audio */}
          {outputAudioUrl ? (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Output Audio</h3>
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
                          <p>Download</p>
                        </TooltipContent>
                      </Tooltip>
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
                                      Feature:
                                    </span>
                                    <span>{featureLabel}</span>
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

              <div className="border rounded-lg p-4 bg-background">
                <div
                  ref={outputWaveformRef}
                  className="w-full overflow-hidden"
                />
                <div className="flex items-center gap-3 mt-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 cursor-pointer shrink-0"
                    onClick={() => outputWavesurferRef.current?.playPause()}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground truncate">
                    {(() => {
                      const ext =
                        currentJobData?.input.params?.outputFormat || "wav";
                      const name =
                        currentJobData?.output?.savedFileName ||
                        currentJobData?.input.fileName;
                      return name
                        ? `${name.replace(/\.[^/.]+$/, "")}.${ext}`
                        : `output.${ext}`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
              No output audio available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
