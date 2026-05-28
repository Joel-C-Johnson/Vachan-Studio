// src/components/TTTJobDetailModal.tsx

import { useState } from "react";
import {
  Copy,
  Download,
  Info,
  Type,
  Pencil,
  Check,
  X,
  Save,
  SaveOff,
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
import type { Job } from "@/types";
import { useJobStore } from "@/store/jobStore";
import { checkDuplicateFileName, countSavedJobs } from "@/services/indexedDB";

interface TTTJobDetailModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TTTJobDetailModal({
  job,
  isOpen,
  onClose,
}: TTTJobDetailModalProps) {
  const liveJob = useJobStore((state) =>
    state.jobs.find((j) => j.id === job?.id),
  );
  const currentJobData = liveJob || job;

  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(
    "small",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");

  const updateJob = useJobStore((state) => state.updateJob);
  const toggleJobSavedStore = useJobStore((state) => state.toggleJobSaved);

  const translatedText = currentJobData?.output?.translatedText || "";
  const inputText = currentJobData?.input?.params?.texts?.[0] || "";

  const handleEditStart = () => {
    setEditedText(translatedText);
    setIsEditing(true);
  };

  const handleEditSave = () => {
    if (!currentJobData) return;
    updateJob(currentJobData.id, {
      output: {
        ...currentJobData.output,
        translatedText: editedText,
      },
    });
    setIsEditing(false);
    toast.success("Translation updated!");
  };

  const handleEditCancel = () => {
    setEditedText("");
    setIsEditing(false);
  };

  const handleDownload = () => {
    if (!translatedText) return;
    const blob = new Blob([translatedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translation_${currentJobData?.jobId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentJobData) return;
    if (currentJobData.saved) {
      await toggleJobSavedStore(currentJobData.id);
      toast.success("File unsaved");
      return;
    }
    setSaveFileName(
      currentJobData.input.fileName || `ttt_${currentJobData.jobId}`,
    );
    setIsSaving(true);
  };

  const handleSaveConfirm = async () => {
    if (!currentJobData) return;
    const savedCount = await countSavedJobs("ttt");
    if (savedCount >= 10) {
      toast.error(
        "Maximum 10 saved files allowed. Please remove a file first.",
      );
      setIsSaving(false);
      return;
    }

    const isDuplicate = await checkDuplicateFileName(
      saveFileName.trim() || `ttt_${currentJobData.jobId}`,
      "ttt",
      currentJobData.id,
    );
    if (isDuplicate) {
      toast.error(
        "A file with this name already exists. Please choose a different name.",
      );
      return;
    }

    updateJob(currentJobData.id, {
      input: {
        ...currentJobData.input,
        fileName: saveFileName.trim() || `ttt_${currentJobData.jobId}`,
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
            <h2 className="text-xl font-semibold">Text Translation</h2>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 mt-6">
          {/* Input text */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">Input Text</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {inputText || "No input text available"}
            </p>
          </div>

          {/* Translation output */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Translation</h3>

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
                        <p>Edit</p>
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
                                    Source:
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

            <div className="p-4 bg-background rounded-lg min-h-40 max-h-96 overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className={`w-full h-40 bg-transparent border-none outline-none resize-none ${
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
                  {translatedText || "No translation available"}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
