// src/pages/AudioToolsPage.tsx

import { useState, useEffect, useRef } from "react";
import { useJobStore } from "@/store/jobStore";
import { useSSESync } from "@/hooks/useSSESync";
import { SplitView } from "@/components/SplitView";
import { AudioInput } from "@/components/AudioInput";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { aiEngineService } from "@/services/aiEngine";
// import { extractAudioFromZip } from "@/utils/zipExtractor";
import {
  Loader2,
  Download,
  Save,
  SaveOff,
  Play,
  Pause,
  Check,
  X,
  Wand2,
  ShieldOff,
  Sparkles,
  Info,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  countSavedJobs,
  checkDuplicateFileName,
  deleteJobFromDB,
} from "@/services/indexedDB";
import WaveSurfer from "wavesurfer.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JobDetailModal } from "@/components/JobDetailModal";
import { useNavigate } from "react-router-dom";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { Job } from "@/types";

type SubFeature = "vc" | "nr" | "ae";

interface AudioFile {
  name: string;
  blob: Blob;
  url: string;
}

interface SubFeatureState {
  selectedFile: File | null;
  hasSubmitted: boolean;
  showOutput: boolean;
  currentJobId: number | null;
  audioFile: AudioFile | null;
  isLoadingAudio: boolean;
  outputFileName: string;
  settingsChanged: boolean;
}

const defaultSubState = (): SubFeatureState => ({
  selectedFile: null,
  hasSubmitted: false,
  showOutput: false,
  currentJobId: null,
  audioFile: null,
  isLoadingAudio: false,
  outputFileName: "",
  settingsChanged: false,
});

const SUB_FEATURES = [
  { id: "vc" as SubFeature, label: "Voice Clone", icon: Wand2 },
  { id: "nr" as SubFeature, label: "Noise Removal", icon: ShieldOff },
  { id: "ae" as SubFeature, label: "Audio Enhance", icon: Sparkles },
];

const SPEAKERS = [
  {
    value: "speaker_1_hin_female",
    label: "Speaker 1 - Hindi Female",
    audio: "/speakers/speaker_1_hin_female.mp3",
  },
  {
    value: "speaker_2_hin_female",
    label: "Speaker 2 - Hindi Female",
    audio: "/speakers/speaker_2_hin_female.mp3",
  },
  {
    value: "speaker_3_tam_male",
    label: "Speaker 3 - Tamil Male",
    audio: "/speakers/speaker_3_tam_male.mp3",
  },
  {
    value: "speaker_4_tel_male",
    label: "Speaker 4 - Telugu Male",
    audio: "/speakers/speaker_4_tel_male.mp3",
  },
];

const MODEL_NAMES: Record<SubFeature, string> = {
  vc: "chatterbox",
  nr: "DeepFilterNet3",
  ae: "resemble-enhance",
};

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

export function AudioToolsPage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState<SubFeature>("vc");
  const [viewMode, setViewMode] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [savedSectionOpen, setSavedSectionOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Per sub-feature states
  const [vcState, setVcState] = useState<SubFeatureState>(defaultSubState());
  const [nrState, setNrState] = useState<SubFeatureState>(defaultSubState());
  const [aeState, setAeState] = useState<SubFeatureState>(defaultSubState());

  // VC settings
  const [refMode, setRefMode] = useState<"speaker" | "audio">("speaker");
  const [referenceSpeaker, setReferenceSpeaker] = useState(
    "speaker_1_hin_female",
  );
  const [referenceAudio, setReferenceAudio] = useState<File | null>(null);
  const [vcOutputFormat, setVcOutputFormat] = useState("wav");
  const [vcEnhance, setVcEnhance] = useState(false);

  // NR settings
  const [nrOutputFormat, setNrOutputFormat] = useState("wav");
  const [nrEnhance, setNrEnhance] = useState(false);
  const [nrDevice, setNrDevice] = useState("cpu");

  // AE settings
  const [aeOutputFormat, setAeOutputFormat] = useState("wav");
  const [aeDenoise, setAeDenoise] = useState(true);
  const [aeDevice, setAeDevice] = useState("cpu");

  // Speaker preview
  const [playingSpeaker, setPlayingSpeaker] = useState<string | null>(null);
  const speakerAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastVcSettings, setLastVcSettings] = useState({
    outputFormat: "wav",
    enhance: false,
    refMode: "speaker",
    referenceSpeaker: "speaker_1_hin_female",
  });
  const [lastNrSettings, setLastNrSettings] = useState({
    outputFormat: "wav",
    enhance: false,
    device: "cpu",
  });
  const [lastAeSettings, setLastAeSettings] = useState({
    outputFormat: "wav",
    denoise: true,
    device: "cpu",
  });

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const { token } = useAuthStore();
  useSSESync(token);

  const addJob = useJobStore((state) => state.addJob);
  const updateJobByJobId = useJobStore((state) => state.updateJobByJobId);
  const removeJob = useJobStore((state) => state.removeJob);
  const activeJobCount = useJobStore((state) => state.getActiveJobs().length);
  const isNewDisabled = activeJobCount >= 3;

  const allJobs = useJobStore((state) => state.jobs);
  const savedJobs = allJobs.filter(
    (job) => job.saved && job.type === activeFeature,
  );

  const getState = (f: SubFeature) =>
    f === "vc" ? vcState : f === "nr" ? nrState : aeState;
  const setState = (f: SubFeature) =>
    f === "vc" ? setVcState : f === "nr" ? setNrState : setAeState;
  const currentState = getState(activeFeature);
  const setCurrentState = (updates: Partial<SubFeatureState>) =>
    setState(activeFeature)((prev) => ({ ...prev, ...updates }));

  const vcJob = useJobStore((state) =>
    vcState.currentJobId
      ? state.getJobByJobId(vcState.currentJobId)
      : undefined,
  );
  const nrJob = useJobStore((state) =>
    nrState.currentJobId
      ? state.getJobByJobId(nrState.currentJobId)
      : undefined,
  );
  const aeJob = useJobStore((state) =>
    aeState.currentJobId
      ? state.getJobByJobId(aeState.currentJobId)
      : undefined,
  );

  const getJob = (f: SubFeature) =>
    f === "vc" ? vcJob : f === "nr" ? nrJob : aeJob;
  const currentJob = getJob(activeFeature);

  // Settings change detection
  useEffect(() => {
    if (!currentState.showOutput) return;

    let hasChanged = false;

    if (activeFeature === "vc") {
      hasChanged =
        vcOutputFormat !== lastVcSettings.outputFormat ||
        vcEnhance !== lastVcSettings.enhance ||
        refMode !== lastVcSettings.refMode ||
        referenceSpeaker !== lastVcSettings.referenceSpeaker;
    } else if (activeFeature === "nr") {
      hasChanged =
        nrOutputFormat !== lastNrSettings.outputFormat ||
        nrEnhance !== lastNrSettings.enhance ||
        nrDevice !== lastNrSettings.device;
    } else {
      hasChanged =
        aeOutputFormat !== lastAeSettings.outputFormat ||
        aeDenoise !== lastAeSettings.denoise ||
        aeDevice !== lastAeSettings.device;
    }

    if (hasChanged && !currentState.settingsChanged) {
      setCurrentState({ settingsChanged: true });
      toast.info("Settings updated — click Run to apply changes");
    }
  }, [
    vcOutputFormat,
    vcEnhance,
    refMode,
    referenceSpeaker,
    nrOutputFormat,
    nrEnhance,
    nrDevice,
    aeOutputFormat,
    aeDenoise,
    aeDevice,
    activeFeature,
    currentState.showOutput,
  ]);

  // Watch for job completion — fetch audio blobs
  useEffect(() => {
    (["vc", "nr", "ae"] as SubFeature[]).forEach((f) => {
      const job = getJob(f);
      const s = getState(f);
      const set = setState(f);

      if (
        job?.output?.audioBlobs &&
        job.output.audioBlobs.length > 0 &&
        !s.audioFile &&
        !s.isLoadingAudio
      ) {
        const blob = job.output.audioBlobs[0];
        const url = URL.createObjectURL(blob);
        const ext =
          f === "vc"
            ? vcOutputFormat
            : f === "nr"
              ? nrOutputFormat
              : aeOutputFormat;
        set((prev) => ({
          ...prev,
          audioFile: { name: `output.${ext}`, blob, url },
          outputFileName: `output.${ext}`,
          isLoadingAudio: false,
        }));
      }

      if (job?.status === "failed" && s.showOutput && !s.audioFile) {
        set((prev) => ({
          ...prev,
          showOutput: false,
          hasSubmitted: false,
          currentJobId: null,
        }));
      }
    });
  }, [
    vcJob?.output?.audioBlobs,
    nrJob?.output?.audioBlobs,
    aeJob?.output?.audioBlobs,
    vcJob?.status,
    nrJob?.status,
    aeJob?.status,
  ]);

  // Init WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !currentState.audioFile) return;

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
    ws.loadBlob(currentState.audioFile.blob);
    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [currentState.audioFile, activeFeature]);

  useEffect(() => {
    return () => {
      [vcState, nrState, aeState].forEach((s) => {
        if (s.audioFile) URL.revokeObjectURL(s.audioFile.url);
      });
      speakerAudioRef.current?.pause();
    };
  }, []);

  const handleSpeakerPreview = (value: string, audioPath: string) => {
    if (speakerTimerRef.current) {
      clearTimeout(speakerTimerRef.current);
      speakerTimerRef.current = null;
    }

    if (playingSpeaker === value) {
      speakerAudioRef.current?.pause();
      setPlayingSpeaker(null);
      return;
    }

    speakerAudioRef.current?.pause();
    const audio = new Audio(audioPath);
    speakerAudioRef.current = audio;
    audio.play();
    setPlayingSpeaker(value);

    // Auto-stop after 5 seconds
    speakerTimerRef.current = setTimeout(() => {
      audio.pause();
      setPlayingSpeaker(null);
      speakerTimerRef.current = null;
    }, 5000);

    audio.onended = () => {
      setPlayingSpeaker(null);
      if (speakerTimerRef.current) {
        clearTimeout(speakerTimerRef.current);
        speakerTimerRef.current = null;
      }
    };
  };

  const handleSubmit = async () => {
    if (!currentState.selectedFile) {
      toast.error("Please upload or record an audio file first");
      return;
    }
    if (!token) {
      toast.error("Please login first");
      return;
    }

    if (currentState.selectedFile.size > MAX_FILE_SIZE) {
      toast.error(
        `File size exceeds 1MB limit (${(currentState.selectedFile.size / 1024 / 1024).toFixed(2)}MB)`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let jobId: number;

      if (activeFeature === "vc") {
        jobId = await aiEngineService.submitVoiceCloneJob(
          currentState.selectedFile,
          token,
          {
            output_format: vcOutputFormat,
            reference_speaker:
              refMode === "speaker" ? referenceSpeaker : undefined,
            enhance: vcEnhance,
            reference_audio:
              refMode === "audio" ? referenceAudio || undefined : undefined,
          },
        );
      } else if (activeFeature === "nr") {
        jobId = await aiEngineService.submitNoiseRemovalJob(
          currentState.selectedFile,
          token,
          {
            output_format: nrOutputFormat,
            enhance: nrEnhance,
            device: nrDevice,
          },
        );
      } else {
        jobId = await aiEngineService.submitEnhanceJob(
          currentState.selectedFile,
          token,
          {
            output_format: aeOutputFormat,
            denoise: aeDenoise,
            device: aeDevice,
          },
        );
      }

      addJob({
        jobId,
        type: activeFeature,
        status: "pending",
        input: {
          fileName: currentState.selectedFile.name,
          fileSize: currentState.selectedFile.size,
          audioBlob: currentState.selectedFile,
          params: {
            model: MODEL_NAMES[activeFeature],
            device:
              activeFeature === "nr"
                ? nrDevice
                : activeFeature === "ae"
                  ? aeDevice
                  : "cpu",
          },
        },
      });

      setCurrentState({
        currentJobId: jobId,
        showOutput: true,
        hasSubmitted: true,
        settingsChanged: false,
      });

      if (activeFeature === "vc") {
        setLastVcSettings({
          outputFormat: vcOutputFormat,
          enhance: vcEnhance,
          refMode,
          referenceSpeaker,
        });
      } else if (activeFeature === "nr") {
        setLastNrSettings({
          outputFormat: nrOutputFormat,
          enhance: nrEnhance,
          device: nrDevice,
        });
      } else {
        setLastAeSettings({
          outputFormat: aeOutputFormat,
          denoise: aeDenoise,
          device: aeDevice,
        });
      }
    } catch (error) {
      const parts = (error instanceof Error ? error.message : "Unknown error")
        .split("\n")
        .filter((l) => l.trim() !== "");
      toast.error(parts[parts.length - 1] ?? "Failed to submit job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNew = () => {
    const s = currentState;
    if (s.audioFile) URL.revokeObjectURL(s.audioFile.url);
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    setState(activeFeature)(() => defaultSubState());
    setIsPlaying(false);
    setIsSaving(false);
    setSaveFileName("");
  };

  const handleSaveClick = () => {
    if (!currentJob) return;
    if (currentJob.saved) {
      useJobStore.getState().toggleJobSaved(currentJob.id);
      toast.success("File unsaved");
      return;
    }
    const name = (
      currentState.outputFileName ||
      currentJob.input.fileName ||
      `${activeFeature}_${currentJob.jobId}`
    ).replace(/\.[^/.]+$/, "");
    setSaveFileName(name);
    setIsSaving(true);
  };

  const handleSaveConfirm = async () => {
    if (!currentJob) return;
    const savedCount = await countSavedJobs(activeFeature);
    if (savedCount >= 10) {
      toast.error("Maximum 10 saved files allowed.");
      setIsSaving(false);
      return;
    }
    const isDuplicate = await checkDuplicateFileName(
      saveFileName.trim() || `${activeFeature}_${currentJob.jobId}`,
      activeFeature,
      currentJob.id,
    );
    if (isDuplicate) {
      toast.error(
        "A file with this name already exists. Please choose a different name.",
      );
      return;
    }

    useJobStore.getState().updateJob(currentJob.id, {
      input: {
        ...currentJob.input,
        fileName: saveFileName.trim() || `${activeFeature}_${currentJob.jobId}`,
      },
      output: {
        ...currentJob.output,
        audioBlobs: currentState.audioFile ? [currentState.audioFile.blob] : [],
      },
    });
    await useJobStore.getState().toggleJobSaved(currentJob.id);
    setCurrentState({ outputFileName: saveFileName.trim() });
    setIsSaving(false);
    toast.success("File saved!");
  };

  const handleSaveCancel = () => {
    setIsSaving(false);
    setSaveFileName("");
  };

  const handleDownload = () => {
    if (!currentState.audioFile) return;
    const a = document.createElement("a");
    a.href = currentState.audioFile.url;
    a.download = currentState.outputFileName || currentState.audioFile.name;
    a.click();
  };

  const handleDeleteSavedJob = async (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    try {
      await deleteJobFromDB(job.id);
      removeJob(job.id);
      toast.success("File removed from saved");
    } catch {
      toast.error("Failed to remove file");
    }
  };

  const featureLabel =
    SUB_FEATURES.find((f) => f.id === activeFeature)?.label || "";

  // Settings panel
  const settingsContent = (
    <div className="space-y-4">
      <div className="flex border-b">
        <button className="px-4 py-2 border-b-2 border-primary font-medium text-sm">
          Input
        </button>
      </div>

      {/* Model - read only */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Model</label>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium">{MODEL_NAMES[activeFeature]}</p>
          <p className="text-xs text-muted-foreground mt-1">ℹ️ Auto-selected</p>
        </div>
      </div>

      {/* Voice Clone settings */}
      {activeFeature === "vc" && (
        <div className="space-y-4">
          {/* Reference mode toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Voice Reference</label>
            <div className="flex gap-2">
              <button
                onClick={() => setRefMode("speaker")}
                className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${refMode === "speaker" ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"}`}
              >
                Reference Speaker
              </button>
              <button
                onClick={() => setRefMode("audio")}
                className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${refMode === "audio" ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"}`}
              >
                Reference Audio
              </button>
            </div>
          </div>

          {/* Speaker list */}
          {refMode === "speaker" && (
            <div className="space-y-1">
              {SPEAKERS.map((speaker) => (
                <div
                  key={speaker.value}
                  onClick={() => setReferenceSpeaker(speaker.value)}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${referenceSpeaker === speaker.value ? "border-primary bg-primary/5" : "border-input hover:bg-accent"}`}
                >
                  <span className="text-sm">{speaker.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeakerPreview(speaker.value, speaker.audio);
                    }}
                    className="p-1 rounded hover:bg-accent transition-colors cursor-pointer"
                  >
                    {playingSpeaker === speaker.value ? (
                      <Pause className="h-4 w-4 text-primary" />
                    ) : (
                      <Play className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Reference audio upload */}
          {refMode === "audio" && (
            <div className="space-y-2">
              {referenceAudio ? (
                <div className="flex items-center justify-between p-2 rounded-lg border border-primary bg-primary/5">
                  <span className="text-sm truncate">
                    {referenceAudio.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        handleSpeakerPreview(
                          "ref-audio",
                          URL.createObjectURL(referenceAudio),
                        )
                      }
                      className="p-1 rounded hover:bg-accent cursor-pointer"
                    >
                      {playingSpeaker === "ref-audio" ? (
                        <Pause className="h-4 w-4 text-primary" />
                      ) : (
                        <Play className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => setReferenceAudio(null)}
                      className="p-1 rounded hover:bg-accent cursor-pointer"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".wav,.mp3,.ogg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > MAX_FILE_SIZE) {
                          toast.error(`File size exceeds 1MB limit`);
                          return;
                        }
                        setReferenceAudio(file);
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                    id="ref-audio-input"
                  />
                  <label
                    htmlFor="ref-audio-input"
                    className="w-full flex items-center justify-center p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors text-sm text-muted-foreground"
                  >
                    Click to upload reference audio (max 1MB)
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Output format */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format</label>
            <select
              value={vcOutputFormat}
              onChange={(e) => setVcOutputFormat(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm cursor-pointer"
            >
              <option value="wav">WAV</option>
              <option value="mp3">MP3</option>
              <option value="ogg">OGG</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="vc-enhance"
              checked={vcEnhance}
              onChange={(e) => setVcEnhance(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="vc-enhance" className="text-sm font-medium">
              Enhance Audio
            </label>
          </div>
        </div>
      )}

      {/* Noise Removal settings */}
      {activeFeature === "nr" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format</label>
            <select
              value={nrOutputFormat}
              onChange={(e) => setNrOutputFormat(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm cursor-pointer"
            >
              <option value="wav">WAV</option>
              <option value="mp3">MP3</option>
              <option value="ogg">OGG</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Device</label>
            <select
              value={nrDevice}
              onChange={(e) => setNrDevice(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm cursor-pointer"
            >
              <option value="cpu">CPU</option>
              <option value="gpu">GPU</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="nr-enhance"
              checked={nrEnhance}
              onChange={(e) => setNrEnhance(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="nr-enhance" className="text-sm font-medium">
              Additional Enhancement
            </label>
          </div>
        </div>
      )}

      {/* Audio Enhance settings */}
      {activeFeature === "ae" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format</label>
            <select
              value={aeOutputFormat}
              onChange={(e) => setAeOutputFormat(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm cursor-pointer"
            >
              <option value="wav">WAV</option>
              <option value="mp3">MP3</option>
              <option value="ogg">OGG</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Device</label>
            <select
              value={aeDevice}
              onChange={(e) => setAeDevice(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm cursor-pointer"
            >
              <option value="cpu">CPU</option>
              <option value="gpu">GPU</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ae-denoise"
              checked={aeDenoise}
              onChange={(e) => setAeDenoise(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="ae-denoise" className="text-sm font-medium">
              Denoise before enhancement
            </label>
          </div>
        </div>
      )}
    </div>
  );

  const inputContent = (
    <div className="h-full p-6 flex flex-col items-center justify-center">
      <div className="w-full space-y-6">
        <AudioInput
          onFileSelect={(file) => setCurrentState({ selectedFile: file })}
          selectedFile={currentState.selectedFile}
          onRemove={() =>
            setCurrentState({
              selectedFile: null,
              showOutput: false,
              currentJobId: null,
              audioFile: null,
            })
          }
        />
        {currentState.selectedFile &&
          (!currentState.showOutput || currentState.settingsChanged) && (
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="min-w-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  `Run ${featureLabel}`
                )}
              </Button>
            </div>
          )}
      </div>
    </div>
  );

  const outputContent = currentState.showOutput ? (
    <div className="h-full flex flex-col justify-center p-6">
      <div className="border rounded-lg p-6 bg-muted/30 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{featureLabel} Output</h3>
          {currentState.audioFile && (
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
                                <span>{currentState.currentJobId}</span>
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
                                <span>{MODEL_NAMES[activeFeature]}</span>
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

        {currentState.audioFile ? (
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
                {currentState.outputFileName || currentState.audioFile.name}
              </span>
            </div>
          </div>
        ) : currentState.isLoadingAudio ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">
              Loading audio...
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Processing...</p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few moments.
              </p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Job ID: {currentState.currentJobId}</p>
              <p>• Feature: {featureLabel}</p>
              <p>• Model: {MODEL_NAMES[activeFeature]}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (currentState.currentJobId) {
                  updateJobByJobId(currentState.currentJobId, {
                    status: "failed",
                    completedAt: Date.now(),
                    error: "Cancelled by user",
                  });
                }
                setCurrentState({
                  showOutput: false,
                  currentJobId: null,
                  hasSubmitted: false,
                });
                toast.info("Job cancelled");
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
    <div className="h-screen pt-16 flex overflow-hidden">
      {/* Left Panel */}
      <div
        className={`border-r bg-background transition-all duration-300 shrink-0 overflow-hidden ${leftPanelOpen ? "w-64" : "w-14"}`}
      >
        {leftPanelOpen ? (
          <div className="p-4 space-y-4 h-full flex flex-col">
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

            <h2 className="text-lg font-semibold">Audio Tools</h2>

            {/* Sub-feature buttons */}
            <div className="space-y-1">
              {SUB_FEATURES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFeature(f.id);
                    setIsPlaying(false);
                    if (wavesurferRef.current) {
                      wavesurferRef.current.destroy();
                      wavesurferRef.current = null;
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    activeFeature === f.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <f.icon className="h-4 w-4" />
                  {f.label}
                </button>
              ))}
            </div>

            {/* New button */}
            {currentState.hasSubmitted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={handleNew}
                    disabled={isNewDisabled}
                  >
                    New
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isNewDisabled
                      ? "Max 3 concurrent jobs running"
                      : `New ${featureLabel}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Saved section */}
            <div className="flex-1 overflow-auto mt-2">
              <button
                onClick={() => setSavedSectionOpen(!savedSectionOpen)}
                className="w-full flex items-center justify-between py-2 px-1 hover:bg-accent rounded transition-colors cursor-pointer"
              >
                <span className="text-sm">
                  Saved {savedJobs.length > 0 && `(${savedJobs.length})`}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${savedSectionOpen ? "rotate-180" : ""}`}
                />
              </button>
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
                          onClick={(e) => handleDeleteSavedJob(e, job)}
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
          <div className="p-2 space-y-2 flex flex-col items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLeftPanelOpen(true)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Expand panel</p>
              </TooltipContent>
            </Tooltip>

            <Button
              className="cursor-pointer"
              variant="ghost"
              size="icon"
              title="Go to homepage"
              onClick={() => navigate("/")}
            >
              <Home className="h-6 w-6" />
            </Button>
          </div>
        )}
      </div>

      {/* Middle Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 flex items-center justify-end px-2 gap-2 shrink-0">
          {currentState.showOutput && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="cursor-pointer"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setViewMode(
                      viewMode === "horizontal" ? "vertical" : "horizontal",
                    )
                  }
                >
                  {viewMode === "horizontal" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="12" y1="3" x2="12" y2="21" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                    </svg>
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
          )}
          {!rightPanelOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="cursor-pointer"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRightPanelOpen(true)}
                >
                  ⚙️
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show settings</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <SplitView
            inputContent={inputContent}
            outputContent={outputContent}
            viewMode={viewMode}
            showOutput={currentState.showOutput}
          />
        </div>
      </div>

      {/* Right Panel */}
      <div
        className={`border-l bg-background transition-all duration-300 shrink-0 ${rightPanelOpen ? "w-80" : "w-0"} overflow-hidden`}
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
            <div className="flex-1 overflow-auto">{settingsContent}</div>
          </div>
        )}
      </div>

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
