// src/pages/STSPage.tsx

import { useState, useEffect, useRef } from "react";
import { useJobStore } from "@/store/jobStore";
import { useSSESync } from "@/hooks/useSSESync";
import { FeatureLayout } from "@/components/FeatureLayout";
import { SplitView } from "@/components/SplitView";
import { STSSettings } from "@/components/STSSettings";
import { AudioInput } from "@/components/AudioInput";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { aiEngineService } from "@/services/aiEngine";
import { extractAudioFromZip } from "@/utils/zipExtractor";
import {
  Loader2,
  Download,
  Save,
  SaveOff,
  Play,
  Pause,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { countSavedJobs } from "@/services/indexedDB";
import WaveSurfer from "wavesurfer.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AudioFile {
  name: string;
  blob: Blob;
  url: string;
}

export function STSPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<"horizontal" | "vertical">("horizontal");
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");
  const [activeSettingsTab, setActiveSettingsTab] = useState<"input" | "output">("input");
  const [lastSubmittedSettings, setLastSubmittedSettings] = useState({
    targetLanguage: "",
    outputFormat: "wav",
    device: "cpu",
    enhance: false,
  });

  // Settings state
  const [targetLanguage, setTargetLanguage] = useState("");
  const [outputFormat, setOutputFormat] = useState("wav");
  const [device, setDevice] = useState("cpu");
  const [enhance, setEnhance] = useState(false);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const { token } = useAuthStore();
  useSSESync(token);

  const addJob = useJobStore((state) => state.addJob);
  const updateJobByJobId = useJobStore((state) => state.updateJobByJobId);
  const currentJob = useJobStore((state) =>
    currentJobId ? state.getJobByJobId(currentJobId) : undefined,
  );

  // Initialize WaveSurfer when audio file is available
  useEffect(() => {
    if (!waveformRef.current || !audioFile) return;

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

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));

    ws.loadBlob(audioFile.blob);
    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [audioFile]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioFile) URL.revokeObjectURL(audioFile.url);
    };
  }, [audioFile]);

  // Watch for job completion
  useEffect(() => {
    if (
      currentJob?.status === "completed" &&
      currentJobId &&
      !audioFile &&
      !isLoadingAudio
    ) {
      fetchAudioData(currentJobId);
    }
  }, [currentJob?.status]);

  // Watch for job failure
  useEffect(() => {
    if (currentJob?.status === "failed" && showOutput && !audioFile) {
      setShowOutput(false);
      setHasSubmitted(false);
      setCurrentJobId(null);
    }
  }, [currentJob?.status]);

  // Watch for job deletion
  useEffect(() => {
    if (currentJobId && !currentJob) {
      handleNew();
    }
  }, [currentJob, currentJobId]);

  // Settings change detection
  useEffect(() => {
    if (!showOutput) return;

    const hasChanged =
      targetLanguage !== lastSubmittedSettings.targetLanguage ||
      outputFormat !== lastSubmittedSettings.outputFormat ||
      device !== lastSubmittedSettings.device ||
      enhance !== lastSubmittedSettings.enhance;

    if (hasChanged && !settingsChanged) {
      setSettingsChanged(true);
      toast.info("Settings updated — submit again to apply changes");
    }
  }, [
    targetLanguage, outputFormat, device, enhance,
    showOutput, lastSubmittedSettings, settingsChanged,
  ]);

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

      const file = extracted[0];
      const url = URL.createObjectURL(file.blob);
      setAudioFile({ name: file.name, blob: file.blob, url });

      updateJobByJobId(jobId, {
        output: {
          ...currentJob?.output,
          audioReady: true,
          audioBlobs: [file.blob],
        },
      });
    } catch (error) {
      console.error("Failed to fetch audio:", error);
      toast.error("Failed to load translated audio");
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("Please upload or record an audio file first");
      return;
    }
    if (!targetLanguage) {
      toast.error("Please select a target language");
      return;
    }
    if (!token) {
      toast.error("Please login first");
      return;
    }

    setLastSubmittedSettings({ targetLanguage, outputFormat, device, enhance });
    setSettingsChanged(false);
    setIsSubmitting(true);
    setAudioFile(null);

    try {
      const jobId = await aiEngineService.submitSTSJob(selectedFile, token, {
        model_name: "seamless-m4t-large",
        target_language: targetLanguage,
        output_format: outputFormat,
        device,
        enhance,
      });

      addJob({
        jobId,
        type: "sts",
        status: "pending",
        input: {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          audioBlob: selectedFile,
          params: {
            language: targetLanguage,
            model: "seamless-m4t-large",
            device,
          },
        },
      });

      setCurrentJobId(jobId);
      setShowOutput(true);
      setHasSubmitted(true);
    } catch (error) {
      console.error("STS submission failed:", error);
      const parts = (error instanceof Error ? error.message : "Unknown error")
        .split("\n")
        .filter((l) => l.trim() !== "");
      toast.error(parts[parts.length - 1] ?? "Failed to submit translation job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNew = () => {
    if (audioFile) URL.revokeObjectURL(audioFile.url);
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    setSelectedFile(null);
    setHasSubmitted(false);
    setShowOutput(false);
    setCurrentJobId(null);
    setAudioFile(null);
    setIsPlaying(false);
    setSettingsChanged(false);
    setIsLoadingAudio(false);
    setIsSaving(false);
    setSaveFileName("");
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setShowOutput(false);
    setCurrentJobId(null);
    setAudioFile(null);
  };

  const handleToggleSave = async () => {
    if (!currentJob) return;
    // const wasSaved = currentJob.saved;
    if (currentJob.saved) {
      const toggleJobSavedStore = useJobStore.getState().toggleJobSaved;
      await toggleJobSavedStore(currentJob.id);
      toast.success("File unsaved");
      return;
    }
    setSaveFileName(currentJob.input.fileName || `sts_${currentJob.jobId}`);
    setIsSaving(true);
  };

  const handleSaveConfirm = async () => {
    if (!currentJob) return;
    const savedCount = await countSavedJobs();
    if (savedCount >= 10) {
      toast.error("Maximum 10 saved files allowed. Please remove a file first.");
      setIsSaving(false);
      return;
    }

    const updateJob = useJobStore.getState().updateJob;
    updateJob(currentJob.id, {
      input: {
        ...currentJob.input,
        fileName: saveFileName.trim() || `sts_${currentJob.jobId}`,
      },
      output: {
        ...currentJob.output,
        audioBlobs: audioFile ? [audioFile.blob] : [],
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

  const handleDownload = () => {
    if (!audioFile) return;
    const a = document.createElement("a");
    a.href = audioFile.url;
    a.download = audioFile.name;
    a.click();
  };

  const canSubmit = selectedFile && targetLanguage && !isSubmitting;

  const settingsContent = (
    <STSSettings
      targetLanguage={targetLanguage}
      outputFormat={outputFormat}
      device={device}
      enhance={enhance}
      onTargetLanguageChange={setTargetLanguage}
      onOutputFormatChange={setOutputFormat}
      onDeviceChange={setDevice}
      onEnhanceChange={setEnhance}
      activeTab={activeSettingsTab}
      onTabChange={setActiveSettingsTab}
    />
  );

  const inputContent = (
    <div className="h-full p-6 flex flex-col items-center justify-center">
      <div className="w-full space-y-6">
        <AudioInput
          onFileSelect={setSelectedFile}
          selectedFile={selectedFile}
          onRemove={handleRemoveFile}
        />

        {selectedFile && (!showOutput || settingsChanged) && (
          <div className="flex justify-center">
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
              ) : !targetLanguage ? (
                "Select Target Language First"
              ) : (
                "Translate Audio"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const outputContent = showOutput ? (
    <div className="h-full p-6">
      <div className="h-full border rounded-lg p-6 bg-muted/30 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Translated Audio</h3>

          {audioFile && (
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
                    <TooltipContent><p>Confirm save</p></TooltipContent>
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
                    <TooltipContent><p>Cancel</p></TooltipContent>
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
                    <TooltipContent><p>Download audio</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={handleToggleSave}
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
                </>
              )}
            </div>
          )}
        </div>

        {audioFile ? (
          <div className="flex-1 flex flex-col gap-4">
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
                <span className="text-xs text-muted-foreground truncate">
                  {audioFile.name}
                </span>
              </div>
            </div>
          </div>
        ) : isLoadingAudio ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">
              Loading translated audio...
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Translating audio...</p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few moments. You can switch to other features while waiting.
              </p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Job ID: {currentJobId}</p>
              <p>• Target: {targetLanguage}</p>
              <p>• Model: seamless-m4t-large</p>
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
                setHasSubmitted(false);
                setSettingsChanged(false);
                toast.info("Translation cancelled");
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
      featureName="AI Voice Translation"
      featureType="sts"
      settingsContent={settingsContent}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showNewButton={hasSubmitted}
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