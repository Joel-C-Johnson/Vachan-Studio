// src/components/AudioInput.tsx

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Mic,
  Trash2,
  Play,
  Pause,
  X,
  Check,
  Pencil,
} from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { toast } from "sonner";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes
const ALLOWED_EXTENSIONS = [".wav", ".mp3", ".ogg"];
const ALLOWED_MIME_TYPES = [
  "audio/wav",
  "audio/mpeg",
  "audio/ogg",
  "audio/mp3",
];

interface AudioInputProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  disabled?: boolean;
  onRemove?: () => void;
  onWavesurferReady?: (wavesurfer: any) => void;
}

export function AudioInput({
  onFileSelect,
  selectedFile,
  disabled = false,
  onRemove,
  onWavesurferReady,
}: AudioInputProps) {
  const audioFile = selectedFile;
  const [isRecorded, setIsRecorded] = useState(false); // Track if file is from recording
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [originalName, setOriginalName] = useState("");

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize WaveSurfer when audio file is set
  useEffect(() => {
    if (audioFile && waveformRef.current && !wavesurfer.current) {
      wavesurfer.current = WaveSurfer.create({
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

      const url = URL.createObjectURL(audioFile);
      wavesurfer.current.load(url);

      wavesurfer.current.on("play", () => setIsPlaying(true));
      wavesurfer.current.on("pause", () => setIsPlaying(false));
      wavesurfer.current.on("finish", () => setIsPlaying(false));

      // Notify parent when ready
      wavesurfer.current.on("ready", () => {
        if (onWavesurferReady && wavesurfer.current) {
          onWavesurferReady(wavesurfer.current);
        }
      });
    }

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
        wavesurfer.current = null;
      }
    };
  }, [audioFile]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!wavesurfer.current || !audioFile) return;

      // Don't capture keys if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        wavesurfer.current.playPause();
      }

      if (e.code === "ArrowRight") {
        e.preventDefault();
        wavesurfer.current.skip(2);
      }

      if (e.code === "ArrowLeft") {
        e.preventDefault();
        wavesurfer.current.skip(-2);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [audioFile]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
    }

    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext),
    );

    if (!hasValidExtension && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return "Invalid format. Please upload WAV, MP3, or OGG files only.";
    }

    return null;
  };

  const handleFileSelect = (file: File, recorded = false) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setIsRecorded(false);
      setTimeout(() => setError(""), 5000);
      return;
    }

    setError("");
    setIsRecorded(recorded);
    setIsEditingName(false); // Reset editing state
    setEditedName(""); // Clear edited name
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file, false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, false);
    }
    e.target.value = "";
  };

  const handleRemove = () => {
    if (wavesurfer.current) {
      wavesurfer.current.destroy();
      wavesurfer.current = null;
    }
    setIsRecorded(false);
    setIsPlaying(false);
    setError("");
    setIsEditingName(false);
    setEditedName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Audio removed - add a new audio to continue");
    onRemove?.();
  };

  const togglePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  const startEditing = () => {
    if (audioFile) {
      const nameWithoutExt = audioFile.name.replace(/\.[^/.]+$/, "");
      setOriginalName(nameWithoutExt);
      setEditedName(nameWithoutExt);
      setIsEditingName(true);
    }
  };

  const cancelEditing = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  const saveEditing = () => {
    if (audioFile && editedName.trim() && editedName.trim() !== originalName) {
      const extension = audioFile.name.split(".").pop();
      const newName = `${editedName.trim()}.${extension}`;

      const newFile = new File([audioFile], newName, { type: audioFile.type });
      onFileSelect(newFile);
    }
    setIsEditingName(false);
    setEditedName("");
  };

  const hasChanges =
    editedName.trim() !== "" && editedName.trim() !== originalName;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
        const audioFile = new File([audioBlob], `recording_${Date.now()}.wav`, {
          type: "audio/wav",
        });

        handleFileSelect(audioFile, true); // Mark as recorded

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setError("");
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access.");
      setTimeout(() => setError(""), 5000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  if (!audioFile && !disabled) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">Drop audio here</p>
              <p className="text-sm text-muted-foreground mt-1">
                WAV, MP3, OGG • up to 3MB
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.ogg,audio/wav,audio/mpeg,audio/ogg"
            onChange={handleFileInput}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload audio
          </Button>

          <Button
            variant={isRecording ? "destructive" : "outline"}
            onClick={isRecording ? stopRecording : startRecording}
          >
            <Mic className="w-4 h-4 mr-2 cursor-pointer" />
            {isRecording ? "Stop Recording" : "Record"}
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <X className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* File Info */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            ✓
          </div>
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-8 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEditing();
                    if (e.key === "Escape") cancelEditing();
                  }}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  .{audioFile?.name.split(".").pop()}
                </span>
              </div>
            ) : (
              <p className="font-medium text-sm truncate">{audioFile?.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {audioFile?.size
                ? (audioFile.size / 1024 / 1024).toFixed(2)
                : "0"}{" "}
              MB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isEditingName ? (
            <>
              {hasChanges && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={saveEditing}
                  title="Save"
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={cancelEditing}
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              {isRecorded && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={startEditing}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit filename</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer"
                    onClick={handleRemove}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove audio</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* Waveform Player */}
      <div className="border rounded-lg p-4 space-y-3">
        <div ref={waveformRef} className="w-full" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="w-9 h-9 cursor-pointer"
              size="icon"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 " />
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              Click to play audio
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
