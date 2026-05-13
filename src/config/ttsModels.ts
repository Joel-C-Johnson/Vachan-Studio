export const TTS_MODELS_DATA = [
  {
    name: "indic-parler-tts",
    version: 1,
    runId: "80aa19e59d13493e8710353d685134ff",
    currentStage: "None",
    status: "READY",
    tags: {
      meta_data:
        "{'developed_by': 'ai4bharat', 'license': 'Apache 2.0', 'languages': '24 languages'}",
      stage: "Staging",
      tasks: "['tts', 'text-to-speech']",
      model_type: "TTS-Indic-Parler",
      tags: "{'function': 'audio generation', 'model': 'indic-parler-tts', 'model_type': 'multi-lingual'}",
    },
    description: "",
    languages: [
      { lang_code: "as", lang_name: "Assamese", lang_id: 900 },
      { lang_code: "bn", lang_name: "Bengali", lang_id: 901 },
      { lang_code: "en", lang_name: "English", lang_id: 101710 },
      { lang_code: "gu", lang_name: "Gujarati", lang_id: 902 },
      { lang_code: "hi", lang_name: "Hindi", lang_id: 102218 },
      { lang_code: "kn", lang_name: "Kannada", lang_id: 102625 },
      { lang_code: "ks", lang_name: "Kashmiri", lang_id: 903 },
      { lang_code: "ml", lang_name: "Malayalam", lang_id: 103552 },
      { lang_code: "mr", lang_name: "Marathi", lang_id: 103555 },
      { lang_code: "ne", lang_name: "Nepali", lang_id: 904 },
      { lang_code: "om", lang_name: "Odia", lang_id: 905 },
      { lang_code: "or", lang_name: "Oriya", lang_id: 906 },
      { lang_code: "pa", lang_name: "Punjabi", lang_id: 907 },
      { lang_code: "sa", lang_name: "Sanskrit", lang_id: 908 },
      { lang_code: "sd", lang_name: "Sindhi", lang_id: 909 },
      { lang_code: "ta", lang_name: "Tamil", lang_id: 910 },
      { lang_code: "te", lang_name: "Telugu", lang_id: 105832 },
      { lang_code: "ur", lang_name: "Urdu", lang_id: 911 },
    ],
  },
  {
    name: "chatterbox-multilingual",
    version: 1,
    runId: "4e31150991c04acd85ee581f117595f0",
    currentStage: "None",
    status: "READY",
    tags: {
      tags: "{'function': 'transcription', 'model': 'MMS', 'model_type': 'multi-lingual'}",
      tasks: "['stt', 'speech-to-text', 'asr']",
      meta_data:
        "{'language_code_type': 'ISO 639-3', 'developed_by': 'Meta', 'license': 'CC-BY-NC 4.0', 'languages': '1162 languages', 'audio_sampling_rate': '16kHz'}",
      model_type: "TTS-chatterbox",
      stage: "Staging",
    },
    description: "",
    languages: [
      {
        lang_code: "ar",
        lang_name: "Arabic",
        lang_id: 100328,
      },
      {
        lang_code: "da",
        lang_name: "Danish",
        lang_id: 101394,
      },
      {
        lang_code: "de",
        lang_name: "German",
        lang_id: 101447,
      },
      {
        lang_code: "el",
        lang_name: "Greek",
        lang_id: 101684,
      },
      {
        lang_code: "en",
        lang_name: "English",
        lang_id: 101710,
      },
      {
        lang_code: "es",
        lang_name: "Spanish",
        lang_id: 105557,
      },
      {
        lang_code: "fi",
        lang_name: "Finnish",
        lang_id: 101790,
      },
      {
        lang_code: "fr",
        lang_name: "French",
        lang_id: 101816,
      },
      {
        lang_code: "he",
        lang_name: "Hebrew",
        lang_id: 102196,
      },
      {
        lang_code: "hi",
        lang_name: "Hindi",
        lang_id: 102218,
      },
      {
        lang_code: "it",
        lang_name: "Italian",
        lang_id: 102459,
      },
      {
        lang_code: "ja",
        lang_name: "Japanese",
        lang_id: 102583,
      },
      {
        lang_code: "ko",
        lang_name: "Korean",
        lang_id: 102963,
      },
      {
        lang_code: "ms",
        lang_name: "Malay",
        lang_id: 107146,
      },
      {
        lang_code: "nl",
        lang_name: "Dutch",
        lang_id: 104380,
      },
      {
        lang_code: "no",
        lang_name: "Norwegian",
        lang_id: 104457,
      },
      {
        lang_code: "pl",
        lang_name: "Polish",
        lang_id: 104957,
      },
      {
        lang_code: "pt",
        lang_name: "Portuguese",
        lang_id: 104963,
      },
      {
        lang_code: "ru",
        lang_name: "Russian",
        lang_id: 105240,
      },
      {
        lang_code: "sv",
        lang_name: "Swedish",
        lang_id: 105679,
      },
      {
        lang_code: "sw",
        lang_name: "Swahili",
        lang_id: 105682,
      },
      {
        lang_code: "tr",
        lang_name: "Turkish",
        lang_id: 106150,
      },
      {
        lang_code: "zh",
        lang_name: "Chinese (Simplified)",
        lang_id: 107318,
      },
    ],
  },
  {
    name: "chatterbox-tuned-multilingual",
    version: 1,
    runId: "69d6601c9aa64a28a778089c6b2cb98e",
    currentStage: "None",
    status: "READY",
    tags: {
      meta_data:
        "{'base_model': 'chatterbox', 'developed_by': 'resemble-ai', 'finetuned_by': 'BCS', 'license': 'MIT License', 'languages': 'Hindi,English, Malayalam, Telugu'}",
      tasks: "['tts', 'text-to-speech']",
      stage: "Staging",
      tags: "{'function': 'audio generation', 'model': 'chatterbox', 'model_type': 'multilingual'}",
      model_type: "TTS-chatterbox-finetuned",
    },
    description: "",
    languages: [
      {
        lang_code: "eng",
        lang_name: "English",
        lang_id: 101710,
      },
      {
        lang_code: "hin",
        lang_name: "Hindi",
        lang_id: 102218,
      },
      {
        lang_code: "mal",
        lang_name: "Malayalam",
        lang_id: 103552,
      },
      {
        lang_code: "tel",
        lang_name: "Telugu",
        lang_id: 105832,
      },
    ],
  },
  {
    name: "mms-tts-kulvi",
    version: 1,
    runId: "e23b8278e194443aafc0aa364070ef80",
    currentStage: "None",
    status: "READY",
    tags: {
      tags: "{'function': 'audio generation', 'model': 'mms-tts', 'model_type': 'monolingual'}",
      tasks: "['tts', 'text-to-speech']",
      meta_data:
        "{'language_code_type': 'ISO 639-3', 'developed_by': 'Meta', 'finetuned_by': 'BCS', 'languages': 'Kulvi'}",
      model_type: "TTS-MMS-finetuned",
      stage: "Staging",
    },
    description: "",
    languages: [
      {
        lang_code: "kfx",
        lang_name: "Kulvi",
        lang_id: 102753,
      },
    ],
  },
  {
    name: "mms-tts-bilaspuri",
    version: 1,
    runId: "1df1a3b131454aad85d4629e11393e89",
    currentStage: "None",
    status: "READY",
    tags: {
      tags: "{'function': 'audio generation', 'model': 'mms-tts', 'model_type': 'monolingual'}",
      tasks: "['tts', 'text-to-speech']",
      meta_data:
        "{'language_code_type': 'ISO 639-3', 'developed_by': 'Meta', 'finetuned_by': 'BCS', 'languages': 'Bilaspuri'}",
      model_type: "TTS-MMS-finetuned",
      stage: "Staging",
    },
    description: "",
    languages: [
      {
        lang_code: "kfs",
        lang_name: "Bilaspuri",
        lang_id: 102747,
      },
    ],
  },
  {
    name: "mms-tts-bhadrawahi",
    version: 1,
    runId: "25f9224b82744aaf96ad753ffa509480",
    currentStage: "None",
    status: "READY",
    tags: {
      tags: "{'function': 'audio generation', 'model': 'mms-tts', 'model_type': 'monolingual'}",
      tasks: "['tts', 'text-to-speech']",
      meta_data:
        "{'language_code_type': 'ISO 639-3', 'developed_by': 'Meta', 'finetuned_by': 'BCS', 'languages': 'Bhadrawahi'}",
      model_type: "TTS-MMS-finetuned",
      stage: "Staging",
    },
    description: "",
    languages: [
      {
        lang_code: "bhd",
        lang_name: "Bhadrawahi",
        lang_id: 100649,
      },
    ],
  },
  {
    name: "mms-tts-kannada",
    version: 1,
    runId: "f3fbe27b24354cf68d0e77171f64e0e2",
    currentStage: "None",
    status: "READY",
    tags: {
      tags: "{'function': 'audio generation', 'model': 'mms-tts', 'model_type': 'monolingual'}",
      tasks: "['tts', 'text-to-speech']",
      meta_data:
        "{'language_code_type': 'ISO 639-3', 'developed_by': 'Meta', 'languages': 'Kannada'}",
      model_type: "TTS-MMS",
      stage: "Staging",
    },
    description: "",
    languages: [
      {
        lang_code: "kan",
        lang_name: "Kannada",
        lang_id: 102625,
      },
    ],
  },
  {
    name: "mms-tts-marathi",
    version: 1,
    runId: "119b62ae28304a9d9f07558f881ee6ba",
    currentStage: "None",
    status: "READY",
    tags: {
      tags: "{'function': 'audio generation', 'model': 'mms-tts', 'model_type': 'monolingual'}",
      tasks: "['tts', 'text-to-speech']",
      meta_data:
        "{'language_code_type': 'ISO 639-3', 'developed_by': 'Meta', 'languages': 'Marathi'}",
      model_type: "TTS-MMS",
      stage: "Staging",
    },
    description: "",
    languages: [
      {
        lang_code: "mar",
        lang_name: "Marathi",
        lang_id: 103555,
      },
    ],
  },
  {
    name: "mms-tts-telugu",
    version: 1,
    runId: "8d0be735d22e4003835868a66209fd89",
    currentStage: "None",
    status: "READY",
    tags: {
      tags: "{'function': 'audio generation', 'model': 'mms-tts', 'model_type': 'monolingual'}",
      tasks: "['tts', 'text-to-speech']",
      meta_data:
        "{'language_code_type': 'ISO 639-3', 'developed_by': 'Meta', 'languages': 'Telugu'}",
      model_type: "TTS-MMS",
      stage: "Staging",
    },
    description: "",
    languages: [
      {
        lang_code: "tel",
        lang_name: "Telugu",
        lang_id: 105832,
      },
    ],
  },
  {
    name: "mms-tts-hindi",
    version: 1,
    runId: "87fc8835dcf4410b9210c597f9d09da0",
    currentStage: "None",
    status: "READY",
    tags: {
      tags: "{'function': 'audio generation', 'model': 'mms-tts', 'model_type': 'monolingual'}",
      tasks: "['tts', 'text-to-speech']",
      meta_data:
        "{'language_code_type': 'ISO 639-3', 'developed_by': 'Meta', 'finetuned_by': 'BCS', 'languages': 'Hindi', 'speaker': 'Blessy'}",
      model_type: "TTS-MMS-finetuned",
      stage: "Staging",
    },
    description: "",
    languages: [
      {
        lang_code: "hin",
        lang_name: "Hindi",
        lang_id: 102218,
      },
    ],
  },
  {
    name: "mms-tts-english",
    version: 1,
    runId: "c40ed698da7a4c8a8e2008094ffcb58d",
    currentStage: "None",
    status: "READY",
    tags: {
      tags: "{'function': 'audio generation', 'model': 'mms-tts', 'model_type': 'monolingual'}",
      tasks: "['tts', 'text-to-speech']",
      meta_data:
        "{'language_code_type': 'ISO 639-3', 'developed_by': 'Meta', 'languages': 'English'}",
      model_type: "TTS-MMS",
      stage: "Staging",
    },
    description: "",
    languages: [
      {
        lang_code: "eng",
        lang_name: "English",
        lang_id: 101710,
      },
    ],
  },
];
