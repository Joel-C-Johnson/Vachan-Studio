import { HighlightedTranscription } from "@/components/HighlightedTranscription";
import { extractSRTFromZip } from "@/utils/zipExtractor";
import { useState, useEffect } from "react";
import { useJobStore } from "@/store/jobStore";
import { useSSESync } from "@/hooks/useSSESync";
import { FeatureLayout } from "@/components/FeatureLayout";
import { SplitView } from "@/components/SplitView";
import { AudioInput } from "@/components/AudioInput";
import { STTSettings } from "@/components/STTSettings";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { aiEngineService } from "@/services/aiEngine";
import {
  Loader2,
  Copy,
  Download,
  Info,
  Type,
  Pencil,
  Check,
  X,
  Highlighter,
} from "lucide-react";
import { toast } from "sonner";
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

// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";

export function STTPage() {
  const [showOutput, setShowOutput] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [viewMode, setViewMode] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<string>("");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
    "small",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [srtText, setSrtText] = useState<string | null>(null);
  const [wavesurferInstance, setWavesurferInstance] = useState<any>(null);
  const [isLoadingSRT, setIsLoadingSRT] = useState(false);
  const [highlightingEnabled, setHighlightingEnabled] = useState(false);
  const [hasEditedText, setHasEditedText] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [lastSubmittedSettings, setLastSubmittedSettings] = useState({
    language: "",
    model: "",
    device: "cpu",
    timestamp: true,
    format: "srt",
  });

  // Get token from auth store
  const { token } = useAuthStore();
  // Initialize SSE sync
  useSSESync(token);

  // Get job store methods
  const addJob = useJobStore((state) => state.addJob);
  const updateJobByJobId = useJobStore((state) => state.updateJobByJobId);
  const currentJob = useJobStore((state) =>
    currentJobId ? state.getJobByJobId(currentJobId) : undefined,
  );

  // Settings state
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [device, setDevice] = useState("cpu");
  const [generateTimestamp, setGenerateTimestamp] = useState(true);
  const [timestampFormat, setTimestampFormat] = useState("srt");

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    console.log("File selected:", file.name, file.size);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setShowOutput(false);
    setCurrentJobId(null);
    setTranscriptionResult("");
    setSrtText(null);
    setHasEditedText(false);
    // setHighlightingEnabled(true);
  };

  const handleEditStart = () => {
    setEditedText(transcriptionResult);
    setIsEditing(true);
    if (srtText && !hasEditedText) {
      toast.warning("Editing the text will remove word-level highlighting");
    }
  };

  const handleEditSave = () => {
    setTranscriptionResult(editedText);
    setIsEditing(false);
    setHasEditedText(true); // Mark as edited
    setSrtText(null); // Disable highlighting
    toast.success("Transcription updated!");
  };

  const handleEditCancel = () => {
    setEditedText("");
    setIsEditing(false);
  };

  const fetchSRTData = async (jobId: number) => {
    if (!token || !generateTimestamp) return;

    setIsLoadingSRT(true);

    try {
      console.log("Fetching SRT assets for job:", jobId);

      // Download assets ZIP
      const zipBlob = await aiEngineService.getJobAssets(jobId, token);

      // Extract SRT from ZIP
      const srtContent = await extractSRTFromZip(zipBlob);

      if (srtContent) {
        console.log("SRT extracted successfully");
        setSrtText(srtContent);
      } else {
        console.warn("No SRT content found");
      }
    } catch (error) {
      console.error("Failed to fetch SRT:", error);
    } finally {
      setIsLoadingSRT(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      alert("Please upload or record an audio file first");
      return;
    }

    if (!selectedLanguage) {
      alert("Please select audio language");
      return;
    }

    if (!token) {
      alert("Please login first");
      return;
    }
    setTranscriptionResult("");
    setSrtText(null);
    setHasEditedText(false);
    // setHighlightingEnabled(true);
    setSettingsChanged(false);
    setIsSubmitting(true);

    try {
      // Submit job to API
      const jobId = await aiEngineService.submitSTTJob(selectedFile, token, {
        model_name: selectedModel,
        transcription_language: selectedLanguage,
        device: device,
        generate_timestamp: generateTimestamp,
        timestamp_file_format: generateTimestamp ? timestampFormat : undefined,
      });

      console.log("Job submitted successfully! Job ID:", jobId);

      // Add job to store
      addJob({
        jobId,
        type: "stt",
        status: "pending",
        input: {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          params: {
            language: selectedLanguage,
            model: selectedModel,
          },
        },
      });

      // Store job ID
      setCurrentJobId(jobId);

      // Show output section with "Processing..." state
      setShowOutput(true);
      setHasSubmitted(true);
      setTranscriptionResult(""); // Clear previous result

      setLastSubmittedSettings({
        language: selectedLanguage,
        model: selectedModel,
        device: device,
        timestamp: generateTimestamp,
        format: timestampFormat,
      });

      // TODO: SSE will notify us when complete (Phase 2)
      // For now, we can poll or wait for SSE notification
    } catch (error) {
      console.error("Failed to submit job:", error);
      alert(
        `Failed to submit transcription job: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = selectedFile && selectedLanguage && !isSubmitting;

  // Settings content for right panel
  const settingsContent = (
    <STTSettings
      selectedLanguage={selectedLanguage}
      selectedModel={selectedModel}
      device={device}
      generateTimestamp={generateTimestamp}
      timestampFormat={timestampFormat}
      onLanguageChange={setSelectedLanguage}
      onModelChange={setSelectedModel}
      onDeviceChange={setDevice}
      onTimestampChange={setGenerateTimestamp}
      onTimestampFormatChange={setTimestampFormat}
    />
  );

  // Input section content
  const inputContent = (
    <div className="h-full p-6 flex flex-col items-center justify-center">
      <div className="w-full space-y-6">
        <AudioInput
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          onRemove={handleRemoveFile}
          onWavesurferReady={setWavesurferInstance}
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
              ) : !selectedLanguage ? (
                "Select Language First"
              ) : (
                "Transcribe Audio"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Output section content
  const outputContent = showOutput ? (
    <div className="h-full p-6">
      <div className="h-full border rounded-lg p-6 bg-muted/30 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Transcribed Text</h3>

          {/* Action Icons - Only show when result exists */}
          {transcriptionResult && (
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  {/* Save Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer text-green-600 hover:text-green-700"
                        onClick={handleEditSave}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save changes</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Cancel Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer text-red-600 hover:text-red-700"
                        onClick={handleEditCancel}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cancel editing</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <>
                  {/* Copy Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(transcriptionResult);
                          toast.success("Copied to clipboard!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Download Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => {
                          const blob = new Blob([transcriptionResult], {
                            type: "text/plain",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `transcription_${currentJobId}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Edit Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={handleEditStart}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit transcription</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Font Size Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => {
                          setFontSize((prev) =>
                            prev === "small"
                              ? "medium"
                              : prev === "medium"
                                ? "large"
                                : "small",
                          );
                        }}
                      >
                        <Type
                          className={`h-4 w-4 ${
                            fontSize === "small"
                              ? "scale-75"
                              : fontSize === "medium"
                                ? "scale-100"
                                : "scale-125"
                          }`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Font size: {fontSize}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Add Highlighting Toggle - Only show if SRT available and model supports it */}
                  {srtText &&
                    selectedModel === "mms-1b-all" &&
                    !hasEditedText && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() =>
                              setHighlightingEnabled(!highlightingEnabled)
                            }
                          >
                            <Highlighter
                              className={`h-4 w-4 ${
                                highlightingEnabled ? "text-primary" : ""
                              }`}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {highlightingEnabled ? "Disable" : "Enable"} word
                            highlighting
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                  {/* Info HoverCard */}
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
                                <span className="font-mono">
                                  {currentJobId}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Language:
                                </span>
                                <span>{selectedLanguage}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Model:
                                </span>
                                <span>{selectedModel}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Device:
                                </span>
                                <span>{device.toUpperCase()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Timestamp:
                                </span>
                                <span>
                                  {generateTimestamp ? "Enabled" : "Disabled"}
                                </span>
                              </div>
                              {generateTimestamp && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Format:
                                  </span>
                                  <span>{timestampFormat.toUpperCase()}</span>
                                </div>
                              )}
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

        {transcriptionResult ? (
          // Show actual result
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-4 bg-background rounded-lg overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className={`w-full min-h-full block bg-transparent border-none outline-none resize-none focus:ring-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
                    fontSize === "small"
                      ? "text-sm"
                      : fontSize === "medium"
                        ? "text-base"
                        : "text-lg"
                  }`}
                  autoFocus
                />
              ) : isLoadingSRT && !hasEditedText ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-sm text-muted-foreground">
                    Loading word-level timestamps...
                  </span>
                </div>
              ) : highlightingEnabled &&
                srtText &&
                wavesurferInstance &&
                !hasEditedText ? (
                <HighlightedTranscription
                  srtText={srtText}
                  wavesurfer={wavesurferInstance}
                  fontSize={fontSize}
                />
              ) : (
                <p
                  className={`whitespace-pre-wrap ${
                    fontSize === "small"
                      ? "text-sm"
                      : fontSize === "medium"
                        ? "text-base"
                        : "text-lg"
                  }`}
                >
                  {transcriptionResult}
                </p>
              )}
            </div>
          </div>
        ) : (
          // Show processing state
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Processing your audio...</p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few moments. You can switch to other features
                while waiting.
              </p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Job Id: {currentJobId}</p>
              <p>• Language: {selectedLanguage}</p>
              <p>• Model: {selectedModel}</p>
              <p>• Device: {device.toUpperCase()}</p>
            </div>

            {/* Cancel Button */}
            <Button
              variant="outline"
              onClick={() => {
                // Update job status in store to stop polling
                if (currentJobId) {
                  updateJobByJobId(currentJobId, {
                    status: "failed",
                    completedAt: Date.now(),
                    error: "Cancelled by user",
                  });
                }

                // Reset UI state
                setShowOutput(false);
                setCurrentJobId(null);
                setTranscriptionResult("");
                setSrtText(null);
                setSettingsChanged(false);

                // Show toast
                toast.info("Transcription cancelled");
              }}
              className="mt-4 min-w-[200px] text-red-600 hover:text-red-700 border-red-600 hover:border-red-700 cursor-pointer"
            >
              Cancel Transcription
            </Button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  // Watch for job completion
  useEffect(() => {
    if (currentJob?.output?.transcribedText) {
      console.log(
        "Updating UI with transcription:",
        currentJob.output.transcribedText,
      );
      setTranscriptionResult(currentJob.output.transcribedText);

      // Fetch SRT if timestamps were enabled
      if (generateTimestamp && currentJobId) {
        fetchSRTData(currentJobId);
      }
    }
  }, [currentJob, generateTimestamp, currentJobId]);

  useEffect(() => {
    if (!showOutput) return; // Only check after output exists

    const hasChanged =
      selectedLanguage !== lastSubmittedSettings.language ||
      selectedModel !== lastSubmittedSettings.model ||
      device !== lastSubmittedSettings.device ||
      generateTimestamp !== lastSubmittedSettings.timestamp ||
      timestampFormat !== lastSubmittedSettings.format;

    if (hasChanged && !settingsChanged) {
      setSettingsChanged(true);
      toast.info("Settings updated - click Transcribe Audio to apply changes");
    }
  }, [
    selectedLanguage,
    selectedModel,
    device,
    generateTimestamp,
    timestampFormat,
    showOutput,
    lastSubmittedSettings,
    settingsChanged,
  ]);

  return (
    <FeatureLayout
      featureName="Speech To Text"
      featureType="stt"
      settingsContent={settingsContent}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showNewButton={hasSubmitted}
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
