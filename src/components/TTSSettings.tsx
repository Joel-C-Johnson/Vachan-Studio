// src/components/TTSSettings.tsx

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getTTSLanguages,
  getRecommendedTTSModel,
  getModelsForTTSLanguage,
  requiresDescription,
  requiresLanguage,
} from "@/utils/ttsModelHelpers";
import type { TTSLanguage } from "@/utils/ttsModelHelpers";

interface TTSSettingsProps {
  selectedLanguage: string;
  selectedModel: string;
  device: string;
  enhance: boolean;
  description: string;
  onLanguageChange: (langCode: string) => void;
  onModelChange: (modelName: string) => void;
  onDeviceChange: (device: string) => void;
  onEnhanceChange: (enhance: boolean) => void;
  onDescriptionChange: (description: string) => void;
}

export function TTSSettings({
  selectedLanguage,
  selectedModel,
  device,
  enhance,
  description,
  onLanguageChange,
  onModelChange,
  onDeviceChange,
  onEnhanceChange,
  onDescriptionChange,
}: TTSSettingsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [languages, setLanguages] = useState<TTSLanguage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allLanguages = getTTSLanguages();
    setLanguages(allLanguages);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleLanguageSelect = (langCode: string) => {
    onLanguageChange(langCode);
    setIsOpen(false);
    setSearchTerm("");

    // Auto-select recommended model
    const recommended = getRecommendedTTSModel(langCode);
    if (recommended) onModelChange(recommended.name);
  };

  const filteredLanguages = searchTerm
    ? languages.filter(
        (lang) =>
          lang.lang_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lang.lang_code.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : languages.slice(0, 100);

  const selectedLangName =
    languages.find((l) => l.lang_code === selectedLanguage)?.lang_name ||
    "Select language";

  // Models available for override (when language is selected)
  const availableModels = selectedLanguage
    ? getModelsForTTSLanguage(selectedLanguage)
    : [];

  const showDescription = requiresDescription(selectedModel);
  const showLanguage = requiresLanguage(selectedModel);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b">
        <button className="px-4 py-2 border-b-2 border-primary font-medium text-sm">
          Input
        </button>
      </div>

      {/* Language Selection */}

      <div className="space-y-2" ref={dropdownRef}>
        <label className="text-sm font-medium">
          Language{" "}
          {showLanguage ? (
            <span className="text-destructive">*</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              (optional for this model)
            </span>
          )}
        </label>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 border rounded-lg text-sm hover:bg-accent transition-colors"
        >
          <span
            className={
              selectedLanguage ? "text-foreground" : "text-muted-foreground"
            }
          >
            {selectedLanguage ? selectedLangName : "Select language"}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-(--radix-popover-trigger-width) mt-1 border rounded-lg bg-background shadow-lg">
            <div className="p-2 border-b sticky top-0 bg-background">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search language..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-8 h-9 text-sm"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-accent rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-75 overflow-y-auto">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map((lang) => (
                  <button
                    key={lang.lang_code}
                    onClick={() => handleLanguageSelect(lang.lang_code)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                      selectedLanguage === lang.lang_code
                        ? "bg-accent font-medium"
                        : ""
                    }`}
                  >
                    {lang.lang_name} ({lang.lang_code})
                  </button>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No language found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Auto-selected Model */}
      {selectedModel && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Model</label>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">{selectedModel}</p>
            {selectedLanguage && (
              <p className="text-xs text-muted-foreground mt-1">
                ℹ️ Auto-selected for {selectedLangName}
              </p>
            )}

            {/* Model override dropdown - only if multiple models available */}
            {availableModels.length > 1 && (
              <div className="mt-2">
                <select
                  value={selectedModel}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="w-full p-1.5 border rounded text-xs cursor-pointer bg-background"
                >
                  {availableModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description - only for indic-parler-tts */}
      {showDescription && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Voice Description
            <span className="text-xs text-muted-foreground ml-1">
              (optional)
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder='e.g. "Leela speaks in a high-pitched, fast-paced, and cheerful tone..."'
            rows={3}
            className="w-full p-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Describes how the speech should sound. Specific to this model.
          </p>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="border-t pt-4">
        <Button
          variant="ghost"
          className="w-full justify-between p-2 h-auto cursor-pointer"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className="text-sm font-medium">Advanced Settings</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
        </Button>

        {showAdvanced && (
          <div className="space-y-4 mt-4">
            {/* Device */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Device</label>
              <select
                value={device}
                onChange={(e) => onDeviceChange(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm cursor-pointer"
              >
                <option value="cpu">CPU</option>
                <option value="gpu">GPU</option>
              </select>
            </div>

            {/* Enhance */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enhance"
                checked={enhance}
                onChange={(e) => onEnhanceChange(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="enhance" className="text-sm font-medium">
                Enhance Audio
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
