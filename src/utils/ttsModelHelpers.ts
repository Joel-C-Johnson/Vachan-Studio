// src/utils/ttsModelHelpers.ts

import { TTS_MODELS_DATA } from '@/config/ttsModels';

export interface TTSLanguage {
  lang_code: string;
  lang_name: string;
  lang_id: number;
}

export interface TTSModel {
  name: string;
  version: number;
  status: string;
  tags: {
    model_type: string;
    [key: string]: string;
  };
  description: string;
  languages: TTSLanguage[];
}

// Get all unique languages across all TTS models
export function getTTSLanguages(): TTSLanguage[] {
  const languageMap = new Map<string, TTSLanguage>();

  TTS_MODELS_DATA.forEach((model: TTSModel) => {
    model.languages.forEach((lang) => {
      if (!languageMap.has(lang.lang_code)) {
        languageMap.set(lang.lang_code, lang);
      }
    });
  });

  return Array.from(languageMap.values()).sort((a, b) =>
    a.lang_name.localeCompare(b.lang_name)
  );
}

// Get models that support a specific language
export function getModelsForTTSLanguage(langCode: string): TTSModel[] {
  return TTS_MODELS_DATA.filter((model: TTSModel) =>
    model.languages.some((lang) => lang.lang_code === langCode)
  );
}

// Get recommended model for a language
// Prefers model whose name contains the language name (e.g. mms-tts-hindi for Hindi)
export function getRecommendedTTSModel(langCode: string): TTSModel | null {
  const models = getModelsForTTSLanguage(langCode);
  if (models.length === 0) return null;

  // Find the language name for this code
  const allLangs = getTTSLanguages();
  const langEntry = allLangs.find((l) => l.lang_code === langCode);
  const langName = langEntry?.lang_name.toLowerCase() ?? '';

  // Prefer model whose name contains the language name (e.g. "mms-tts-hindi")
  const nameMatch = models.find((m) => m.name.toLowerCase().includes(langName));
  if (nameMatch) return nameMatch;

  // Fallback: prefer finetuned over base
  const finetuned = models.find((m) =>
    m.tags.model_type?.toLowerCase().includes('finetuned')
  );
  if (finetuned) return finetuned;

  return models[0];
}

// indic-parler-tts requires a voice description
export function requiresDescription(modelName: string): boolean {
  return modelName === 'indic-parler-tts';
}

// indic-parler-tts does NOT require a language code
export function requiresLanguage(modelName: string): boolean {
  return modelName !== 'indic-parler-tts';
}