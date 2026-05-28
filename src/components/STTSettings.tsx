// src/components/STTSettings.tsx

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAllLanguages,
  getRecommendedModel,
  supportsTimestamp,
  getModelDisplayName,
} from "@/utils/modelHelpers";
import type { Language } from "@/utils/modelHelpers";

interface STTSettingsProps {
  selectedLanguage: string;
  selectedModel: string;
  device: string;
  generateTimestamp: boolean;
  timestampFormat: string;
  onLanguageChange: (langCode: string) => void;
  onModelChange: (modelName: string) => void;
  onDeviceChange: (device: string) => void;
  onTimestampChange: (enabled: boolean) => void;
  onTimestampFormatChange: (format: string) => void;
}

export function STTSettings({
  selectedLanguage,
  selectedModel,
  device,
  generateTimestamp,
  timestampFormat,
  onLanguageChange,
  onModelChange,
  onDeviceChange,
  onTimestampChange,
  onTimestampFormatChange,
}: STTSettingsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get and sort languages alphabetically
    const allLanguages = getAllLanguages();
    const sorted = [...allLanguages].sort((a, b) =>
      a.lang_name.localeCompare(b.lang_name),
    );
    setLanguages(sorted);
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

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageSelect = (langCode: string) => {
    onLanguageChange(langCode);
    setIsOpen(false);
    setSearchTerm("");

    // Auto-select recommended model
    const recommended = getRecommendedModel(langCode);
    if (recommended) {
      onModelChange(recommended.name);
    }
  };

  // Filter languages based on search
  const filteredLanguages = searchTerm
    ? languages.filter(
        (lang) =>
          lang.lang_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lang.lang_code.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : languages.slice(0, 100); // Show only first 100 when not searching

  const selectedLangName =
    languages.find((l) => l.lang_code === selectedLanguage)?.lang_name ||
    "Select language";
  const modelSupportsTimestamp = supportsTimestamp(selectedModel);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b">
        <button className="px-4 py-2 border-b-2 border-primary font-medium text-sm">
          Input
        </button>
      </div>

      {/* Language Selection - Simple Searchable */}
      <div className="space-y-2" ref={dropdownRef}>
        <label className="text-sm font-medium">
          Audio Language <span className="text-destructive">*</span>
        </label>

        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 border rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer"
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

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-(--radix-popover-trigger-width) mt-1 border rounded-lg bg-background shadow-lg">
            {/* Search Input */}
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-accent rounded p-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-75 overflow-y-auto">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map((lang) => (
                  <button
                    key={lang.lang_code}
                    onClick={() => handleLanguageSelect(lang.lang_code)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer transition-colors ${
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

      {/* Model (Auto-selected) */}
      {selectedLanguage && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Model</label>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">
              {getModelDisplayName(selectedModel)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ℹ️ Auto-selected for {selectedLangName}
            </p>
            {selectedModel === "mms-1b-all" && (
              <div className="flex items-center gap-2 mt-2 text-xs text-primary">
                <span className="font-medium">
                  Supports word-level highlighting in SRT format
                </span>
              </div>
            )}
          </div>
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

            {/* Timestamp Options (only if model supports) */}
            {modelSupportsTimestamp && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="timestamp"
                    checked={generateTimestamp}
                    onChange={(e) => onTimestampChange(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="timestamp" className="text-sm font-medium">
                    Generate Timestamps
                  </label>
                </div>

                {generateTimestamp && (
                  <div className="space-y-2 ml-6">
                    <label className="text-sm font-medium">Format</label>
                    <select
                      value={timestampFormat}
                      onChange={(e) => onTimestampFormatChange(e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm cursor-pointer"
                    >
                      <option value="srt">SRT</option>
                      <option value="vtt">VTT</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
