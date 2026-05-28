// src/pages/TTSPage.tsx

import { useState, useEffect, useRef } from "react";
import { useJobStore } from "@/store/jobStore";
import { useSSESync } from "@/hooks/useSSESync";
import { FeatureLayout } from "@/components/FeatureLayout";
import { SplitView } from "@/components/SplitView";
import { TTSSettings } from "@/components/TTSSettings";
import { TextInput } from "@/components/TextInput";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { aiEngineService } from "@/services/aiEngine";
import { extractAudioFromZip } from "@/utils/zipExtractor";
import {
  Loader2,
  Download,
  Save,
  SaveOff,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Check,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { checkDuplicateFileName, countSavedJobs } from "@/services/indexedDB";
import WaveSurfer from "wavesurfer.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface AudioFile {
  name: string;
  blob: Blob;
  url: string;
}

export function TTSPage() {
  const [boxes, setBoxes] = useState<string[]>([""]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");
  const [viewMode, setViewMode] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [contentChanged, setContentChanged] = useState(false);
  const [lastSubmittedSettings, setLastSubmittedSettings] = useState({
    language: "",
    model: "",
    device: "cpu",
    enhance: false,
    description: "",
  });

  // Settings state
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [device, setDevice] = useState("cpu");
  const [enhance, setEnhance] = useState(false);
  const [description, setDescription] = useState("");

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const autoPlayRef = useRef(autoPlay);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  // Keep autoPlayRef in sync
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  const { token } = useAuthStore();
  useSSESync(token);

  const addJob = useJobStore((state) => state.addJob);
  const updateJobByJobId = useJobStore((state) => state.updateJobByJobId);
  const currentJob = useJobStore((state) =>
    currentJobId ? state.getJobByJobId(currentJobId) : undefined,
  );

  // Create WaveSurfer only when audioFiles changes (new job result)
  useEffect(() => {
    if (!waveformRef.current || audioFiles.length === 0) return;

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
      // Use functional update to always have latest index
      setCurrentAudioIndex((prev) => {
        if (autoPlayRef.current && prev < audioFiles.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    });

    ws.loadBlob(audioFiles[0].blob);
    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [audioFiles]);

  // Handle segment switching — just load new blob, don't recreate WaveSurfer
  useEffect(() => {
    if (!wavesurferRef.current || audioFiles.length === 0) return;
    if (!audioFiles[currentAudioIndex]) return;

    wavesurferRef.current.loadBlob(audioFiles[currentAudioIndex].blob);

    // Auto-play when switching to next segment (not on initial load)
    if (autoPlayRef.current && currentAudioIndex > 0) {
      wavesurferRef.current.once("ready", () => {
        wavesurferRef.current?.play();
      });
    }
  }, [currentAudioIndex]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      audioFiles.forEach((f) => URL.revokeObjectURL(f.url));
    };
  }, [audioFiles]);

  const fetchAudioData = async (jobId: number) => {
    if (!token) return;
    setIsLoadingAudio(true);

    try {
      const zipBlob = await aiEngineService.getJobAssets(jobId, token);
      const extracted = await extractAudioFromZip(zipBlob);

      if (extracted.length === 0) {
        toast.error("No audio files found in result");
        return;
      }

      extracted.sort((a, b) => a.name.localeCompare(b.name));

      const audioWithUrls: AudioFile[] = extracted.map((f) => ({
        name: f.name,
        blob: f.blob,
        url: URL.createObjectURL(f.blob),
      }));

      setAudioFiles(audioWithUrls);
      setCurrentAudioIndex(0);

      updateJobByJobId(jobId, {
        output: {
          ...currentJob?.output,
          audioReady: true,
          audioBlobs: audioWithUrls.map((f) => f.blob),
        },
      });
    } catch (error) {
      console.error("Failed to fetch audio:", error);
      toast.error("Failed to load audio files");
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleSubmit = async () => {
    const filledTexts = boxes.filter((t) => t.trim() !== "");

    if (filledTexts.length === 0) {
      toast.error("Please enter some text first");
      return;
    }

    if (!selectedLanguage && selectedModel !== "indic-parler-tts") {
      toast.error("Please select a language");
      return;
    }

    if (!token) {
      toast.error("Please login first");
      return;
    }

    // Update lastSubmittedSettings FIRST before resetting changed flags
    // This prevents the settings detection effect from re-triggering
    setLastSubmittedSettings({
      language: selectedLanguage,
      model: selectedModel,
      device,
      enhance,
      description,
    });
    setSettingsChanged(false);
    setContentChanged(false);
    setIsSubmitting(true);
    setAudioFiles([]);

    try {
      const jobId = await aiEngineService.submitTTSJob(filledTexts, token, {
        model_name: selectedModel,
        output_format: "wav",
        language: selectedLanguage || undefined,
        description: description || undefined,
        device,
        enhance,
      });

      addJob({
        jobId,
        type: "tts",
        status: "pending",
        input: {
          fileName: `tts_${jobId}`,
          fileSize: 0,
          params: {
            language: selectedLanguage,
            model: selectedModel,
            device,
            texts: filledTexts,
          },
        },
      });

      setCurrentJobId(jobId);
      setShowOutput(true);
      setHasSubmitted(true);
      setCurrentAudioIndex(0);
    } catch (error) {
      console.error("TTS submission failed:", error);
      const parts = (error instanceof Error ? error.message : "Unknown error")
        .split("\n")
        .filter((l) => l.trim() !== "");
      toast.error(parts[parts.length - 1] ?? "Failed to submit TTS job");
    } finally {
      setIsSubmitting(false);
      setHasStartedPlaying(false);
    }
  };

  const handleNew = () => {
    audioFiles.forEach((f) => URL.revokeObjectURL(f.url));
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    setBoxes([""]);
    setHasSubmitted(false);
    setShowOutput(false);
    setCurrentJobId(null);
    setAudioFiles([]);
    setCurrentAudioIndex(0);
    setIsPlaying(false);
    setSettingsChanged(false);
    setContentChanged(false);
    setIsLoadingAudio(false);
    setHasStartedPlaying(false);
    setIsSaving(false);
    setSaveFileName("");
  };

  const handleContentChanged = () => {
    if (!contentChanged) {
      setContentChanged(true);
      toast.info("Content changed — submit again to generate new audio");
    }
  };

  const handleSaveClick = () => {
    if (!currentJob) return;
    if (currentJob.saved) {
      // Unsave directly, no filename needed
      handleUnsave();
      return;
    }
    // Show inline input with prefilled name
    setSaveFileName(currentJob.input.fileName || `tts_${currentJob.jobId}`);
    setIsSaving(true);
  };

  const handleUnsave = async () => {
    if (!currentJob) return;
    const toggleJobSavedStore = useJobStore.getState().toggleJobSaved;
    await toggleJobSavedStore(currentJob.id);
    toast.success("File unsaved");
  };

  const handleSaveConfirm = async () => {
    if (!currentJob) return;

    const savedCount = await countSavedJobs("tts");
    if (savedCount >= 10) {
      toast.error(
        "Maximum 10 saved files allowed. Please remove a file first.",
      );
      setIsSaving(false);
      return;
    }

    const isDuplicate = await checkDuplicateFileName(
      saveFileName.trim() || `tts_${currentJob.jobId}`,
      "tts",
      currentJob.id,
    );
    if (isDuplicate) {
      toast.error(
        "A file with this name already exists. Please choose a different name.",
      );
      return;
    }

    // Update filename and save blobs
    const updateJob = useJobStore.getState().updateJob;
    updateJob(currentJob.id, {
      input: {
        ...currentJob.input,
        fileName: saveFileName.trim() || `tts_${currentJob.jobId}`,
      },
      output: {
        ...currentJob.output,
        audioBlobs: audioFiles.map((f) => f.blob),
      },
    });

    const toggleJobSavedStore = useJobStore.getState().toggleJobSaved;
    await toggleJobSavedStore(currentJob.id);
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
      // Single file — direct download
      const file = audioFiles[0];
      const a = document.createElement("a");
      a.href = file.url;
      a.download = file.name;
      a.click();
      return;
    }

    // Multiple files — zip them
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    audioFiles.forEach((file) => {
      zip.file(file.name, file.blob);
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tts_${currentJobId}_audio.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isOverLimit =
    boxes.reduce(
      (sum, t) => sum + (t.trim() === "" ? 0 : t.trim().split(/\s+/).length),
      0,
    ) > 30;

  const canSubmit =
    !isSubmitting &&
    !isOverLimit &&
    boxes.some((t) => t.trim() !== "") &&
    (selectedLanguage !== "" || selectedModel === "indic-parler-tts");

  // Settings change detection
  useEffect(() => {
    if (!showOutput) return;

    const hasChanged =
      selectedLanguage !== lastSubmittedSettings.language ||
      selectedModel !== lastSubmittedSettings.model ||
      device !== lastSubmittedSettings.device ||
      enhance !== lastSubmittedSettings.enhance ||
      description !== lastSubmittedSettings.description;

    if (hasChanged && !settingsChanged) {
      setSettingsChanged(true);
      toast.info("Settings updated — submit again to apply changes");
    }
  }, [
    selectedLanguage,
    selectedModel,
    device,
    enhance,
    description,
    showOutput,
    lastSubmittedSettings,
    settingsChanged,
  ]);

  // Watch for job completion
  useEffect(() => {
    if (
      currentJob?.status === "completed" &&
      currentJobId &&
      audioFiles.length === 0 &&
      !isLoadingAudio
    ) {
      fetchAudioData(currentJobId);
    }
  }, [currentJob?.status]);

  // Watch for job deletion
  useEffect(() => {
    if (currentJobId && !currentJob) {
      handleNew();
    }
  }, [currentJob, currentJobId]);

  const settingsContent = (
    <TTSSettings
      selectedLanguage={selectedLanguage}
      selectedModel={selectedModel}
      device={device}
      enhance={enhance}
      description={description}
      onLanguageChange={setSelectedLanguage}
      onModelChange={setSelectedModel}
      onDeviceChange={setDevice}
      onEnhanceChange={setEnhance}
      onDescriptionChange={setDescription}
    />
  );

  const inputContent = (
  <div className="h-full p-5 flex flex-col justify-center">
      <TextInput
        boxes={boxes}
        onBoxesChange={setBoxes}
        isSubmitted={hasSubmitted && showOutput && audioFiles.length === 0}
        hasResult={audioFiles.length > 0}
        onContentChanged={handleContentChanged}
        activeSegmentIndex={hasStartedPlaying ? currentAudioIndex : null}
      />

      {(!hasSubmitted || settingsChanged || contentChanged) && (
        <div className="flex justify-center mt-6">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="min-w-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : !selectedLanguage && selectedModel !== "indic-parler-tts" ? (
              "Select Language First"
            ) : (
              "Generate Speech"
            )}
          </Button>
        </div>
      )}
    </div>
  );

  const outputContent = showOutput ? (
    <div className="h-full flex flex-col justify-center p-6">
      <div className="border rounded-lg p-6 bg-muted/30 flex flex-col pb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Generated Audio</h3>

          {audioFiles.length > 0 && (
            <div className="flex items-center gap-1">
              {isSaving ? (
                /* Inline filename input */
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
                      <p>Download audio</p>
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
                        {currentJob?.saved ? (
                          <SaveOff className="h-4 w-4" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{currentJob?.saved ? "Unsave" : "Save"}</p>
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
                                <span>{currentJob?.jobId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Language:
                                </span>
                                <span>
                                  {currentJob?.input.params?.language}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Model:
                                </span>
                                <span>
                                  {currentJob?.input.params?.model}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Device:
                                </span>
                                <span>
                                  {currentJob?.input.params?.device?.toUpperCase()}
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
          )}
        </div>

        {audioFiles.length > 0 ? (
          <div className="flex-1 flex flex-col gap-4">
            {audioFiles.length > 1 && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {audioFiles.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentAudioIndex(i)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                        i === currentAudioIndex
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
                    id="autoplay"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label
                    htmlFor="autoplay"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Auto-play next
                  </label>
                </div>
              </div>
            )}

            <div className="border rounded-lg p-4 bg-background">
              <div ref={waveformRef} className="w-full overflow-hidden" />
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
                        setCurrentAudioIndex((p) => Math.max(0, p - 1))
                      }
                      disabled={currentAudioIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {currentAudioIndex + 1} / {audioFiles.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer"
                      onClick={() =>
                        setCurrentAudioIndex((p) =>
                          Math.min(audioFiles.length - 1, p + 1),
                        )
                      }
                      disabled={currentAudioIndex === audioFiles.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                <span className="text-xs text-muted-foreground truncate">
                  {audioFiles[currentAudioIndex]?.name}
                </span>
              </div>
            </div>
          </div>
        ) : isLoadingAudio ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">
              Loading audio...
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Generating speech...</p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few moments. You can switch to other features
                while waiting.
              </p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Job ID: {currentJobId}</p>
              <p>• Language: {selectedLanguage}</p>
              <p>• Model: {selectedModel}</p>
              <p>• Device: {device.toUpperCase()}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (currentJobId) {
                  updateJobByJobId(currentJobId, {
                    status: "failed",
                    completedAt: Date.now(),
                    error: "Cancelled by user",
                  });
                }
                setShowOutput(false);
                setCurrentJobId(null);
                setSettingsChanged(false);
                setContentChanged(false);
                setHasSubmitted(false);
                toast.info("Generation cancelled");
              }}
              className="mt-4 min-w-50 text-red-600 hover:text-red-700 border-red-600 hover:border-red-700 cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <FeatureLayout
      featureName="Audio Generation"
      featureType="tts"
      settingsContent={settingsContent}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showNewButton={hasSubmitted}
      showOutput={showOutput}
      onNew={handleNew}
    >
      <SplitView
        inputContent={inputContent}
        outputContent={outputContent}
        viewMode={viewMode}
        showOutput={showOutput}
      />
    </FeatureLayout>
  );
}
