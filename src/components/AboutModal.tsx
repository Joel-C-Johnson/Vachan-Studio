// src/components/AboutModal.tsx

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mic,
  Volume2,
  Languages,
  Waves,
  Sparkles,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ModelInfo {
  name: string;
  type: string;
  languages: string;
  developer: string;
  notes: string;
  languageCode?: string;
  samplingRate?: string;
  parameters?: string;
  license?: string;
  path?: string;
  hfUrl?: string;
}

const MODEL_GROUPS: {
  id: string;
  title: string;
  subtitle: string;
  models: ModelInfo[];
}[] = [
  {
    id: "mms-stt",
    title: "MMS — Speech-to-Text",
    subtitle: "Massively Multilingual Speech Recognition",
    models: [
      {
        name: "mms-1b-all",
        type: "Multi-Lingual ASR",
        languages: "1,162 languages",
        languageCode: "ISO 639-3",
        samplingRate: "16 kHz",
        parameters: "1 billion",
        license: "CC-BY-NC 4.0",
        developer: "Meta",
        path: "facebook/mms-1b-all",
        hfUrl: "https://huggingface.co/facebook/mms-1b-all",
        notes:
          "Fine-tuned for multi-lingual ASR using adapter models. Supports word-level highlighting in SRT format.",
      },
      {
        name: "mms-finetuned",
        type: "Multi-Lingual ASR (Finetuned)",
        languages: "Bilaspuri, Bhadrawahi, Kulvi, Khezha, Bhojpuri",
        languageCode: "ISO 639-3",
        samplingRate: "16 kHz",
        license: "CC-BY-NC 4.0",
        developer: "Meta + BCS",
        path: "s3://bcslamdabucket/models/mms/mms-finetuned",
        notes:
          "Fine-tuned using MMS Adapter training on Snow Mountain dataset for Indian low-resource languages.",
      },
    ],
  },
  {
    id: "xlsr",
    title: "XLSR — Speech-to-Text",
    subtitle: "Cross-Lingual Speech Representation (Fine-tuned)",
    models: [
      {
        name: "stt-xlsr-<lang>",
        type: "Monolingual ASR (Finetuned)",
        languages:
          "Hindi, Haryanvi, Bilaspuri, Dogri, Kulvi, Bhadrawahi, Gaddi, Kangri, Mandeali, Pahari Mahasui, Malayalam, Kannada, Tamil, Telugu, Bhojpuri, Khuzale",
        languageCode: "ISO 639-3",
        license: "Apache-2.0",
        developer: "Meta + BCS",
        path: "s3://bcslamdabucket/models/xlsr/<model-name>",
        notes:
          "Fine-tuned from wav2vec2-xls-r-1b base model using Snow Mountain dataset. Covers gateway languages (Hindi, Malayalam, Kannada, Tamil, Telugu) and Hindi minority languages. Fine-tuning reference: huggingface.co/blog/fine-tune-xlsr-wav2vec2",
      },
    ],
  },
  {
    id: "mms-tts",
    title: "MMS — Text-to-Speech",
    subtitle: "Massively Multilingual Speech Synthesis",
    models: [
      {
        name: "mms-tts-<lang>",
        type: "Mono-Lingual TTS",
        languages: "1,107 languages",
        languageCode: "ISO 639-3",
        license: "CC-BY-NC 4.0",
        developer: "Meta",
        path: "facebook/mms-tts-<lang>",
        hfUrl: "https://huggingface.co/facebook/mms-tts",
        notes:
          "Each language has its own monolingual pre-trained TTS model based on the VITS architecture.",
      },
      {
        name: "mms-tts-bhadrawahi",
        type: "Monolingual TTS (Finetuned)",
        languages: "Bhadrawahi",
        languageCode: "ISO 639-3",
        developer: "Meta + BCS",
        path: "s3://bcslamdabucket/models/mms-tts/mms-tts-bhadrawahi",
        notes: "Fine-tuned on Snow Mountain dataset.",
      },
      {
        name: "mms-tts-bilaspuri",
        type: "Monolingual TTS (Finetuned)",
        languages: "Bilaspuri",
        languageCode: "ISO 639-3",
        developer: "Meta + BCS",
        path: "s3://bcslamdabucket/models/mms-tts/mms-tts-bilaspuri",
        notes: "Fine-tuned on Snow Mountain dataset.",
      },
      {
        name: "mms-tts-kulvi",
        type: "Monolingual TTS (Finetuned)",
        languages: "Kulvi",
        languageCode: "ISO 639-3",
        developer: "Meta + BCS",
        path: "s3://bcslamdabucket/models/mms-tts/mms-tts-kulvi",
        notes: "Fine-tuned on Snow Mountain dataset.",
      },
      {
        name: "mms-tts-hindi (Blessy)",
        type: "Monolingual TTS (Finetuned)",
        languages: "Hindi",
        languageCode: "ISO 639-3",
        developer: "Meta + BCS",
        path: "s3://bcslamdabucket/models/mms-tts/mms-tts-hin-v2",
        notes: "Fine-tuned on Snow Mountain dataset. Speaker: Blessy.",
      },
      {
        name: "mms-tts-hindi (Acsah)",
        type: "Monolingual TTS (Finetuned)",
        languages: "Hindi",
        languageCode: "ISO 639-3",
        developer: "Meta + BCS",
        path: "s3://bcslamdabucket/models/mms-tts/mms-tts-hin-v3",
        notes: "Fine-tuned on Bible commentary dataset. Speaker: Acsah.",
      },
    ],
  },
  {
    id: "nllb",
    title: "NLLB — Text Translation",
    subtitle: "No Language Left Behind",
    models: [
      {
        name: "nllb-200-distilled-600M",
        type: "Multilingual MT",
        languages: "200+ languages",
        languageCode: "BCP-47",
        parameters: "600M",
        license: "CC-BY-NC 4.0",
        developer: "Meta",
        path: "facebook/nllb-200-distilled-600M",
        hfUrl: "https://huggingface.co/facebook/nllb-200-distilled-600M",
        notes:
          "Smaller, faster variant. Suitable for real-time applications. Max input: 512 tokens.",
      },
      {
        name: "nllb-200-distilled-1.3B",
        type: "Multilingual MT",
        languages: "200+ languages",
        languageCode: "BCP-47",
        parameters: "1.3 billion",
        license: "CC-BY-NC 4.0",
        developer: "Meta",
        path: "facebook/nllb-200-distilled-1.3B",
        hfUrl: "https://huggingface.co/facebook/nllb-200-distilled-1.3B",
        notes:
          "More powerful variant. Higher accuracy and robustness. Max input: 512 tokens.",
      },
    ],
  },
  {
    id: "seamless",
    title: "SeamlessM4T — Audio Translation",
    subtitle: "Massively Multilingual & Multimodal Machine Translation",
    models: [
      {
        name: "seamless-m4t-v2-large",
        type: "Multi-modal Multilingual",
        languages:
          "100 languages (speech/text input & text output), 36 languages (speech output)",
        languageCode: "ISO 639-3",
        samplingRate: "16 kHz",
        license: "CC-BY-NC 4.0",
        developer: "Meta",
        path: "facebook/seamless-m4t-v2-large",
        hfUrl: "https://huggingface.co/facebook/seamless-m4t-v2-large",
        notes:
          "Supports S2ST, S2TT, T2ST, T2TT, and ASR within a single model.",
      },
    ],
  },
  {
    id: "openvoice",
    title: "OpenVoice — Voice Cloning",
    subtitle: "Instant Voice Cloning",
    models: [
      {
        name: "openvoice-v2",
        type: "Voice Cloning & Conversion",
        languages: "Multilingual",
        license: "MIT License",
        developer: "MyShell-AI",
        path: "s3://bcslamdabucket/models/openvoice-v2/converter",
        notes:
          "Requires only a short audio clip from the reference speaker. Enables granular control over voice styles including emotion, accent, rhythm, pauses, and intonation.",
      },
    ],
  },
  {
    id: "deepfilter",
    title: "DeepFilterNet — Noise Suppression",
    subtitle: "Real-time Audio Noise Removal",
    models: [
      {
        name: "DeepFilterNet3",
        type: "Noise Removal",
        languages: "Multilingual",
        samplingRate: "48 kHz",
        license: "Apache-2.0 / MIT",
        developer: "Rikorose",
        path: "s3://bcslamdabucket/models/DeepFilterNet3",
        notes:
          "Powerful tool for real-time noise suppression. Ideal for telecommunication, broadcasting, and speech enhancement.",
      },
    ],
  },
  {
    id: "ina",
    title: "inaSpeechSegmenter — Audio Segmentation",
    subtitle: "CNN-based Voice Activity Detection",
    models: [
      {
        name: "InaSpeechSegmenter",
        type: "Audio Segmentation / VAD",
        languages: "Multilingual",
        samplingRate: "16 kHz",
        license: "MIT License",
        developer: "L'Institut National de l'Audiovisuel",
        path: "s3://bcslamdabucket/models/audio-segmentation",
        notes:
          "Splits audio into speech, music, noise and silence zones. Singing voice tagged as music.",
      },
    ],
  },
  {
    id: "mmsfa",
    title: "MMS-FA — Forced Alignment",
    subtitle: "Audio-Text Synchronization",
    models: [
      {
        name: "MMS-FA",
        type: "Forced Alignment",
        languages: "Multilingual",
        license: "BSD 2-Clause",
        developer: "Meta",
        notes:
          "Aligns audio recordings with text transcriptions at sentence level with precise time-stamped synchronization.",
      },
    ],
  },
  {
    id: "resemble",
    title: "Resemble Enhance — Audio Enhancement",
    subtitle: "AI-powered Speech Quality Improvement",
    models: [
      {
        name: "resemble-enhance",
        type: "Audio Enhancement",
        languages: "Multilingual",
        license: "MIT License",
        developer: "resemble-ai",
        notes:
          "Two modules: denoiser (UNet) separates speech from noise, enhancer (CFM) restores audio distortions and extends bandwidth.",
      },
    ],
  },
  {
    id: "chatterbox",
    title: "Chatterbox — TTS & Voice Cloning",
    subtitle: "Production-grade Open Source TTS",
    models: [
      {
        name: "chatterbox",
        type: "TTS & Voice Conversion",
        languages: "Multilingual",
        license: "MIT License",
        developer: "resemble-ai",
        notes:
          "Zero-shot TTS synthesis and voice cloning. Trained on 0.5M hours of cleaned data. Supports voice cloning through audio prompts.",
      },
    ],
  },
];

const CURRENT_FEATURES = [
  {
    icon: Mic,
    title: "Audio Transcription",
    desc: "Convert speech to text in 1000+ languages",
    color: "bg-purple-500",
  },
  {
    icon: Volume2,
    title: "Audio Generation",
    desc: "Generate natural speech from text",
    color: "bg-pink-500",
  },
  {
    icon: Languages,
    title: "Text Translation",
    desc: "Translate text across 200+ languages",
    color: "bg-blue-500",
  },
  {
    icon: Waves,
    title: "Audio Translation",
    desc: "Translate speech to another language",
    color: "bg-indigo-500",
  },
  {
    icon: Sparkles,
    title: "Noise Removal",
    desc: "Remove background noise from audio",
    color: "bg-green-500",
  },
  {
    icon: Sparkles,
    title: "Voice Cloning",
    desc: "Clone and convert voice tones",
    color: "bg-orange-500",
  },
  {
    icon: Sparkles,
    title: "Audio Enhancement",
    desc: "Boost and restore audio quality",
    color: "bg-red-500",
  },
];

// const COMING_SOON = [
//   {
//     icon: Sparkles,
//     title: "Noise Removal",
//     desc: "Remove background noise from audio",
//     color: "bg-green-500",
//   },
//   {
//     icon: Sparkles,
//     title: "Voice Cloning",
//     desc: "Clone and convert voice tones",
//     color: "bg-orange-500",
//   },
//   {
//     icon: Sparkles,
//     title: "Audio Enhancement",
//     desc: "Boost and restore audio quality",
//     color: "bg-red-500",
//   },
// ];

function ModelCard({ model }: { model: ModelInfo }) {
  return (
    <div className="border rounded-lg p-4 bg-background space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm">{model.name}</h4>
        {model.hfUrl && (
          <a
            href={model.hfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1 text-xs shrink-0"
          >
            HuggingFace <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">Type: </span>
          <span>{model.type}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Developer: </span>
          <span>{model.developer}</span>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Languages: </span>
          <span>{model.languages}</span>
        </div>
        {model.parameters && (
          <div>
            <span className="text-muted-foreground">Parameters: </span>
            <span>{model.parameters}</span>
          </div>
        )}
        {model.samplingRate && (
          <div>
            <span className="text-muted-foreground">Sampling Rate: </span>
            <span>{model.samplingRate}</span>
          </div>
        )}
        {model.license && (
          <div>
            <span className="text-muted-foreground">License: </span>
            <span>{model.license}</span>
          </div>
        )}
        {model.languageCode && (
          <div>
            <span className="text-muted-foreground">Lang Code: </span>
            <span>{model.languageCode}</span>
          </div>
        )}
      </div>
      {model.path && (
        <div className="text-xs">
          <span className="text-muted-foreground">Path: </span>
          <code className="bg-muted px-1 rounded text-xs break-all">
            {model.path}
          </code>
        </div>
      )}
      {model.notes && (
        <p className="text-xs text-muted-foreground italic">{model.notes}</p>
      )}
    </div>
  );
}

function ModelGroup({ group }: { group: (typeof MODEL_GROUPS)[0] }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors text-left cursor-pointer"
      >
        <div>
          <h3 className="font-semibold text-sm">{group.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {group.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {group.models.length} model{group.models.length > 1 ? "s" : ""}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 space-y-3 border-t bg-muted/20">
          {group.models.map((model) => (
            <ModelCard key={model.name} model={model} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "models" | "contact">(
    "overview",
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="w-[90vw] max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-xl font-bold">
                  ⚡
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Vachan Studio</h2>
                <p className="text-sm text-muted-foreground font-normal">
                  AI Feature Showcase by BCS
                </p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b px-6 shrink-0">
          {(["overview", "models", "contact"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium cursor-pointer border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Notice banner */}
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-start gap-3">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                  <span className="animate-pulse">NEW</span>
                </span>
                <div>
                  <p className="text-sm font-medium text-primary">
                    Custom Model Finetuning Available
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on the available data and need, we are able to
                    finetune the model for new languages. Please reach out to
                    us.
                  </p>
                  {/* <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <a
                      href="mailto:bcssupport@bridgeconn.com"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" /> bcssupport@bridgeconn.com
                    </a>
                    <a
                      href="tel:8447646426"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" /> 8447646426
                    </a>
                  </div> */}
                </div>
              </div>

              {/* About */}
              <div className="space-y-2">
                <h3 className="font-semibold">About</h3>
                <p className="text-sm text-muted-foreground">
                  Vachan Studio is a showcase platform for BCS's AI-powered speech and
                  language APIs. Built to help developers explore, test, and
                  integrate state-of-the-art multilingual AI models including
                  speech recognition, text-to-speech, text translation, and
                  audio translation — all in one place.
                </p>
                {/* <p className="text-sm text-muted-foreground">
                  Built by{" "}
                  <span className="font-medium text-foreground">
                    Joel C Johnson
                  </span>{" "}
                  · Bridge Connectivity Solutions (BCS)
                </p> */}
              </div>

              {/* Current features */}
              <div className="space-y-3">
                <h3 className="font-semibold">Available Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  {CURRENT_FEATURES.map((f) => (
                    <div
                      key={f.title}
                      className="flex items-start gap-3 border rounded-lg p-3"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg ${f.color} flex items-center justify-center shrink-0`}
                      >
                        <f.icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{f.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coming soon
              <div className="space-y-3">
                <h3 className="font-semibold">Coming Soon</h3>
                <div className="grid grid-cols-2 gap-3">
                  {COMING_SOON.map((f) => (
                    <div
                      key={f.title}
                      className="flex items-start gap-3 border rounded-lg p-3 opacity-60"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg ${f.color} flex items-center justify-center shrink-0`}
                      >
                        <f.icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{f.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div> */}
            </div>
          )}

          {/* MODELS TAB */}
          {activeTab === "models" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                All AI models powering this platform. Click any group to expand
                details.
              </p>
              {MODEL_GROUPS.map((group) => (
                <ModelGroup key={group.id} group={group} />
              ))}
            </div>
          )}

          {/* CONTACT TAB */}
          {activeTab === "contact" && (
            <div className="space-y-6">
              {/* Finetuning notice */}
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                    <span className="animate-pulse">NEW</span>
                  </span>
                  <h3 className="font-semibold text-primary">
                    Custom Model Finetuning
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on the available data and need, we are able to finetune
                  the model for new languages. Please reach out to us to discuss
                  your requirements.
                </p>
              </div>

              {/* Contact details */}
              <div className="space-y-3">
                <h3 className="font-semibold">Get in Touch</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 border rounded-lg p-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>

                      <a
                        href="mailto:bcssupport@bridgeconn.com"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        bcssupport@bridgeconn.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border rounded-lg p-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>

                      <a
                        href="tel:8447646426"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        8447646426
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Built by */}
              <div className="space-y-2">
                <h3 className="font-semibold">Built By</h3>
                <div className="border rounded-lg p-4 space-y-1">
                  <p className="text-sm font-medium">Joel C Johnson</p>
                  <p className="text-sm text-muted-foreground">
                    Bridge Connectivity Solutions (BCS)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
