// src/components/TTTSettings.tsx

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, X, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getTTTLanguages,
  getTargetLanguages,
  getRecommendedTTTModel,
  getModelsForLanguagePair,
  isBidirectional,
} from "@/utils/tttModelHelpers";
import type { TTTLanguage, TTTModel } from "@/utils/tttModelHelpers";

interface TTTSettingsProps {
  sourceLanguage: string;
  targetLanguage: string;
  selectedModel: string;
  device: string;
  onSourceLanguageChange: (langCode: string) => void;
  onTargetLanguageChange: (langCode: string) => void;
  onModelChange: (modelName: string) => void;
  onDeviceChange: (device: string) => void;
  onSwapLanguages: () => void;
  activeTab: "input" | "output";
  onTabChange: (tab: "input" | "output") => void;
}

export function TTTSettings({
  sourceLanguage,
  targetLanguage,
  selectedModel,
  device,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onModelChange,
  onDeviceChange,
  onSwapLanguages,
  activeTab,
  onTabChange,
}: TTTSettingsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allLanguages, setAllLanguages] = useState<TTTLanguage[]>([]);
  const [targetLanguages, setTargetLanguages] = useState<TTTLanguage[]>([]);
  const [availableModels, setAvailableModels] = useState<TTTModel[]>([]);

  const [sourceOpen, setSourceOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");

  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const targetDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAllLanguages(getTTTLanguages());
  }, []);

  // Update target languages when source changes
  useEffect(() => {
    if (sourceLanguage) {
      setTargetLanguages(getTargetLanguages(sourceLanguage));
    }
  }, [sourceLanguage]);

  // Update available models when pair changes
  useEffect(() => {
    if (sourceLanguage && targetLanguage) {
      const models = getModelsForLanguagePair(sourceLanguage, targetLanguage);
      setAvailableModels(models);
      const recommended = getRecommendedTTTModel(sourceLanguage, targetLanguage);
      if (recommended) onModelChange(recommended.name);
    }
  }, [sourceLanguage, targetLanguage]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) {
        setSourceOpen(false);
      }
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(event.target as Node)) {
        setTargetOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSourceSelect = (langCode: string) => {
    onSourceLanguageChange(langCode);
    setSourceOpen(false);
    setSourceSearch("");
  };

  const handleTargetSelect = (langCode: string) => {
    onTargetLanguageChange(langCode);
    setTargetOpen(false);
    setTargetSearch("");
  };

  const filteredSourceLanguages = sourceSearch
    ? allLanguages.filter(
        (l) =>
          l.lang_name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
          l.lang_code.toLowerCase().includes(sourceSearch.toLowerCase())
      )
    : allLanguages.slice(0, 100);

  const filteredTargetLanguages = targetSearch
    ? targetLanguages.filter(
        (l) =>
          l.lang_name.toLowerCase().includes(targetSearch.toLowerCase()) ||
          l.lang_code.toLowerCase().includes(targetSearch.toLowerCase())
      )
    : targetLanguages.slice(0, 100);

  const sourceLangName =
    allLanguages.find((l) => l.lang_code === sourceLanguage)?.lang_name || "";
  const targetLangName =
    allLanguages.find((l) => l.lang_code === targetLanguage)?.lang_name || "";

  const currentModel = availableModels.find((m) => m.name === selectedModel);
  const showSwap =
    sourceLanguage && targetLanguage && currentModel
      ? isBidirectional(currentModel)
      : false;

  const renderLanguageDropdown = (
    isSource: boolean,
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    search: string,
    setSearch: (v: string) => void,
    selectedCode: string,
    selectedName: string,
    filtered: TTTLanguage[],
    onSelect: (code: string) => void,
    dropdownRef: React.RefObject<HTMLDivElement | null>,
    disabled?: boolean
  ) => (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-2 border rounded-lg text-sm transition-colors ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-muted"
            : "hover:bg-accent cursor-pointer"
        }`}
      >
        <span className={selectedCode ? "text-foreground" : "text-muted-foreground"}>
          {selectedCode ? selectedName : isSource ? "Select source language" : "Select target language"}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 border rounded-lg bg-background shadow-lg">
          <div className="p-2 border-b sticky top-0 bg-background">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search language..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-8 h-9 text-sm"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-accent rounded p-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((lang) => (
                <button
                  key={lang.lang_code}
                  onClick={() => onSelect(lang.lang_code)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointertransition-colors ${
                    selectedCode === lang.lang_code ? "bg-accent font-medium" : ""
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
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => onTabChange("input")}
          className={`px-4 py-2 text-sm font-medium border-b-2 cursor-pointer transition-colors ${
            activeTab === "input"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Input
        </button>
        <button
          onClick={() => onTabChange("output")}
          className={`px-4 py-2 text-sm font-medium border-b-2 cursor-pointer transition-colors ${
            activeTab === "output"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Output
        </button>
      </div>

      {/* Input Tab */}
      {activeTab === "input" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Source Language <span className="text-destructive">*</span>
            </label>
            {renderLanguageDropdown(
              true,
              sourceOpen,
              setSourceOpen,
              sourceSearch,
              setSourceSearch,
              sourceLanguage,
              sourceLangName,
              filteredSourceLanguages,
              handleSourceSelect,
              sourceDropdownRef
            )}
          </div>

          {/* Swap button */}
          {showSwap && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onSwapLanguages}
                className="gap-2 cursor-pointer"
              >
                <ArrowLeftRight className="h-3 w-3" />
                Swap languages
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Output Tab */}
      {activeTab === "output" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Target Language <span className="text-destructive">*</span>
            </label>
            {renderLanguageDropdown(
              false,
              targetOpen,
              setTargetOpen,
              targetSearch,
              setTargetSearch,
              targetLanguage,
              targetLangName,
              filteredTargetLanguages,
              handleTargetSelect,
              targetDropdownRef,
              !sourceLanguage
            )}
            {!sourceLanguage && (
              <p className="text-xs text-muted-foreground">
                Select a source language first
              </p>
            )}
          </div>

          {/* Swap button */}
          {showSwap && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onSwapLanguages}
                className="gap-2 cursor-pointer"
              >
                <ArrowLeftRight className="h-3 w-3" />
                Swap languages
              </Button>
            </div>
          )}

          {/* Model info */}
          {selectedModel && sourceLanguage && targetLanguage && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">{selectedModel}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ℹ️ Auto-selected for {sourceLangName} → {targetLangName}
                </p>
                {availableModels.length > 1 && (
                  <select
                    value={selectedModel}
                    onChange={(e) => onModelChange(e.target.value)}
                    className="w-full p-1.5 border rounded text-xs cursor-pointer bg-background mt-2"
                  >
                    {availableModels.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
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
          </div>
        )}
      </div>
    </div>
  );
}