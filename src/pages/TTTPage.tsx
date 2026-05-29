// src/pages/TTTPage.tsx

import { useState, useEffect, useRef } from "react";
import { useJobStore } from "@/store/jobStore";
import { useSSESync } from "@/hooks/useSSESync";
import { FeatureLayout } from "@/components/FeatureLayout";
import { SplitView } from "@/components/SplitView";
import { TTTSettings } from "@/components/TTTSettings";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { aiEngineService } from "@/services/aiEngine";
import {
  Loader2,
  Copy,
  Download,
  Save,
  SaveOff,
  Pencil,
  Check,
  X,
  Type,
  Info,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { checkDuplicateFileName, countSavedJobs } from "@/services/indexedDB";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const MAX_WORDS = 50;

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export function TTTPage() {
  const [inputText, setInputText] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [translatedText, setTranslatedText] = useState("");
  const [viewMode, setViewMode] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [contentChanged, setContentChanged] = useState(false);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
    "small",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    "input" | "output"
  >("input");
  const [hasAutoSwitchedTab, setHasAutoSwitchedTab] = useState(false);

  // Settings state
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [device, setDevice] = useState("cpu");

  const [lastSubmittedSettings, setLastSubmittedSettings] = useState({
    sourceLanguage: "",
    targetLanguage: "",
    model: "",
    device: "cpu",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { token } = useAuthStore();
  useSSESync(token);

  const addJob = useJobStore((state) => state.addJob);
  const updateJobByJobId = useJobStore((state) => state.updateJobByJobId);
  const currentJob = useJobStore((state) =>
    currentJobId ? state.getJobByJobId(currentJobId) : undefined,
  );

  const wordCount = countWords(inputText);
  const isOverLimit = wordCount > MAX_WORDS;

  // Auto switch to output tab when source language selected (only first time)
  useEffect(() => {
    if (sourceLanguage && !hasAutoSwitchedTab && !targetLanguage) {
      setActiveSettingsTab("output");
      setHasAutoSwitchedTab(true);
    }
  }, [sourceLanguage]);

  // Watch for job completion
  useEffect(() => {
    if (currentJob?.output?.translatedText) {
      setTranslatedText(currentJob.output.translatedText);
    }
  }, [currentJob?.output?.translatedText]);

  // Watch for job failure
  useEffect(() => {
    if (currentJob?.status === "failed" && showOutput && !translatedText) {
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
      sourceLanguage !== lastSubmittedSettings.sourceLanguage ||
      targetLanguage !== lastSubmittedSettings.targetLanguage ||
      selectedModel !== lastSubmittedSettings.model ||
      device !== lastSubmittedSettings.device;

    if (hasChanged && !settingsChanged) {
      setSettingsChanged(true);
      toast.info("Settings updated — submit again to apply changes");
    }
  }, [
    sourceLanguage,
    targetLanguage,
    selectedModel,
    device,
    showOutput,
    lastSubmittedSettings,
    settingsChanged,
  ]);

  const handleSourceLanguageChange = (langCode: string) => {
    setSourceLanguage(langCode);
    setTargetLanguage("");
    setSelectedModel("");
  };

  const handleSwapLanguages = () => {
    const prevSource = sourceLanguage;
    const prevTarget = targetLanguage;
    setSourceLanguage(prevTarget);
    setTargetLanguage(prevSource);

    // Swap text content too
    if (translatedText) {
      setInputText(translatedText);
      setTranslatedText("");
      setShowOutput(false);
      setHasSubmitted(false);
      setSettingsChanged(false);
      setContentChanged(false);
    }

    if (showOutput) {
      setSettingsChanged(true);
      toast.info("Languages swapped — submit again to apply changes");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 1MB limit");
      return;
    }

    try {
      let text = "";

      if (file.name.endsWith(".txt")) {
        text = await file.text();
      } else if (file.name.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        toast.error("Only .txt and .docx files are supported");
        return;
      }

      // Take only first 50 words
      const words = text.trim().split(/\s+/);
      if (words.length > MAX_WORDS) {
        setInputText(words.slice(0, MAX_WORDS).join(" "));
        toast.info(
          `Extracted first ${MAX_WORDS} words. Remaining words were skipped.`,
        );
      } else {
        setInputText(text.trim());
      }
    } catch (error) {
      toast.error("Failed to read file");
      console.error(error);
    } finally {
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text first");
      return;
    }
    if (!sourceLanguage) {
      toast.error("Please select a source language");
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

    setLastSubmittedSettings({
      sourceLanguage,
      targetLanguage,
      model: selectedModel,
      device,
    });
    setSettingsChanged(false);
    setContentChanged(false);
    setIsSubmitting(true);
    setTranslatedText("");

    try {
      const jobId = await aiEngineService.submitTTTJob(
        [inputText.trim()],
        token,
        {
          model_name: selectedModel,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          device,
        },
      );

      addJob({
        jobId,
        type: "ttt",
        status: "pending",
        input: {
          fileName: `ttt_${jobId}`,
          fileSize: 0,
          params: {
            language: sourceLanguage,
            model: selectedModel,
            device,
            texts: [inputText.trim()],
          },
        },
      });

      setCurrentJobId(jobId);
      setShowOutput(true);
      setHasSubmitted(true);
    } catch (error) {
      console.error("TTT submission failed:", error);
      const parts = (error instanceof Error ? error.message : "Unknown error")
        .split("\n")
        .filter((l) => l.trim() !== "");
      toast.error(
        parts[parts.length - 1] ?? "Failed to submit translation job",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNew = () => {
    setInputText("");
    setHasSubmitted(false);
    setShowOutput(false);
    setCurrentJobId(null);
    setTranslatedText("");
    setIsEditing(false);
    setEditedText("");
    setSettingsChanged(false);
    setContentChanged(false);
    setIsSaving(false);
    setSaveFileName("");
  };

  const handleEditStart = () => {
    setEditedText(translatedText);
    setIsEditing(true);
  };

  const handleEditSave = () => {
    setTranslatedText(editedText);
    setIsEditing(false);
    if (currentJobId) {
      updateJobByJobId(currentJobId, {
        output: {
          ...currentJob?.output,
          translatedText: editedText,
        },
      });
    }
    toast.success("Translation updated!");
  };

  const handleEditCancel = () => {
    setEditedText("");
    setIsEditing(false);
  };

  const handleSaveClick = async () => {
    if (!currentJob) return;
    if (currentJob.saved) {
      const toggleJobSavedStore = useJobStore.getState().toggleJobSaved;
      await toggleJobSavedStore(currentJob.id);
      toast.success("File unsaved");
      return;
    }
    setSaveFileName(currentJob.input.fileName || `ttt_${currentJob.jobId}`);
    setIsSaving(true);
  };

  const handleSaveConfirm = async () => {
    if (!currentJob) return;
    const savedCount = await countSavedJobs("ttt");
    if (savedCount >= 10) {
      toast.error(
        "Maximum 10 saved files allowed. Please remove a file first.",
      );
      setIsSaving(false);
      return;
    }

    const isDuplicate = await checkDuplicateFileName(
      saveFileName.trim() || `ttt_${currentJob.jobId}`,
      "ttt",
      currentJob.id,
    );
    if (isDuplicate) {
      toast.error(
        "A file with this name already exists. Please choose a different name.",
      );
      return;
    }

    const updateJob = useJobStore.getState().updateJob;
    updateJob(currentJob.id, {
      output: {
        ...currentJob.output,
        translatedText,
        savedFileName: saveFileName.trim() || `ttt_${currentJob.jobId}`,
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
    if (!translatedText) return;
    const blob = new Blob([translatedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(currentJob?.output?.savedFileName || currentJob?.input.fileName || `translation_${currentJobId}`).replace(/\.[^/.]+$/, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canSubmit =
    !isSubmitting &&
    !isOverLimit &&
    inputText.trim() !== "" &&
    sourceLanguage !== "" &&
    targetLanguage !== "";

  const settingsContent = (
    <TTTSettings
      sourceLanguage={sourceLanguage}
      targetLanguage={targetLanguage}
      selectedModel={selectedModel}
      device={device}
      onSourceLanguageChange={handleSourceLanguageChange}
      onTargetLanguageChange={setTargetLanguage}
      onModelChange={setSelectedModel}
      onDeviceChange={setDevice}
      onSwapLanguages={handleSwapLanguages}
      activeTab={activeSettingsTab}
      onTabChange={setActiveSettingsTab}
    />
  );

  const inputContent = (
    <div className="h-full p-6 flex flex-col gap-4 justify-center">
      {/* Text input area */}
      <div
        className={`relative border rounded-lg transition-colors ${
          isOverLimit
            ? "border-destructive ring-1 ring-destructive"
            : "border-input"
        }`}
      >
        <textarea
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            if (hasSubmitted && translatedText) setContentChanged(true);
          }}
          placeholder="Enter text to translate, or upload a file..."
          rows={10}
          className="w-full p-3 text-sm bg-transparent rounded-lg resize-none focus:outline-none focus:ring-0"
        />

        {/* File upload button inside textarea area */}
        <div className="flex items-center justify-between px-3 pb-2">
          <span
            className={`text-xs ${isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}
          >
            {wordCount} / {MAX_WORDS} words
            {isOverLimit && " — over limit, please reduce text"}
          </span>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs cursor-pointer gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>txt , docx • up to 1MB</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Submit button */}
      {(!hasSubmitted || settingsChanged || contentChanged) && (
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
            ) : !sourceLanguage ? (
              "Select Source Language First"
            ) : !targetLanguage ? (
              "Select Target Language"
            ) : (
              "Translate"
            )}
          </Button>
        </div>
      )}
    </div>
  );

  const outputContent = showOutput ? (
    <div className="h-full p-6">
      <div className="h-full border rounded-lg p-6 bg-muted/30 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Translation</h3>

          {translatedText && (
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
              ) : isEditing ? (
                <>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(translatedText);
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
                        onClick={handleEditStart}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit translation</p>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() =>
                          setFontSize((prev) =>
                            prev === "small"
                              ? "medium"
                              : prev === "medium"
                                ? "large"
                                : "small",
                          )
                        }
                      >
                        <Type
                          className={`h-4 w-4 ${fontSize === "small" ? "scale-75" : fontSize === "medium" ? "scale-100" : "scale-125"}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Font size: {fontSize}</p>
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
                                <span>{currentJobId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Source:
                                </span>
                                <span>{sourceLanguage}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Target:
                                </span>
                                <span>{targetLanguage}</span>
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

        {translatedText ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 p-4 bg-background rounded-lg overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className={`w-full min-h-full bg-transparent border-none outline-none resize-none focus:ring-0 ${
                    fontSize === "small"
                      ? "text-sm"
                      : fontSize === "medium"
                        ? "text-base"
                        : "text-lg"
                  }`}
                  autoFocus
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
                  {translatedText}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Translating...</p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few moments. You can switch to other features
                while waiting.
              </p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Job ID: {currentJobId}</p>
              <p>• Source: {sourceLanguage}</p>
              <p>• Target: {targetLanguage}</p>
              <p>• Model: {selectedModel}</p>
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
                setContentChanged(false);
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
      featureName="Text Translation"
      featureType="ttt"
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
