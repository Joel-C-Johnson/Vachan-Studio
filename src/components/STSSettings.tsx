// src/components/STSSettings.tsx

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  STS_INPUT_MODELS_DATA,
  STS_OUTPUT_MODELS_DATA,
} from "@/config/stsModels";

interface STSSettingsProps {
  targetLanguage: string;
  outputFormat: string;
  device: string;
  enhance: boolean;
  onTargetLanguageChange: (langCode: string) => void;
  onOutputFormatChange: (format: string) => void;
  onDeviceChange: (device: string) => void;
  onEnhanceChange: (enhance: boolean) => void;
  activeTab: "input" | "output";
  onTabChange: (tab: "input" | "output") => void;
}

export function STSSettings({
  targetLanguage,
  outputFormat,
  device,
  enhance,
  onTargetLanguageChange,
  onOutputFormatChange,
  onDeviceChange,
  onEnhanceChange,
  activeTab,
  onTabChange,
}: STSSettingsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSupportedLanguages, setShowSupportedLanguages] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState("");
  const [supportedSearch, setSupportedSearch] = useState("");
  const targetDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        targetDropdownRef.current &&
        !targetDropdownRef.current.contains(event.target as Node)
      ) {
        setTargetOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTargetLanguages = targetSearch
    ? STS_OUTPUT_MODELS_DATA.filter(
        (l) =>
          l.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
          l.code.toLowerCase().includes(targetSearch.toLowerCase())
      )
    : STS_OUTPUT_MODELS_DATA.slice(0, 100);

  const filteredSupportedLanguages = supportedSearch
    ? STS_INPUT_MODELS_DATA.filter(
        (l) =>
          l.name.toLowerCase().includes(supportedSearch.toLowerCase()) ||
          l.code.toLowerCase().includes(supportedSearch.toLowerCase())
      )
    : STS_INPUT_MODELS_DATA;

  const targetLangName =
    STS_OUTPUT_MODELS_DATA.find((l) => l.code === targetLanguage)?.name || "";

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => onTabChange("input")}
          className={`px-4 py-2 text-sm font-medium cursor-pointer border-b-2 transition-colors ${
            activeTab === "input"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Input
        </button>
        <button
          onClick={() => onTabChange("output")}
          className={`px-4 py-2 text-sm font-medium cursor-pointer border-b-2 transition-colors ${
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
          {/* Model info */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">seamless-m4t-large</p>
              <p className="text-xs text-muted-foreground mt-1">
                ℹ️ Auto-selected for audio translation
              </p>
            </div>
          </div>

          {/* Supported input languages */}
          <div className="space-y-2">
            <button
              onClick={() => setShowSupportedLanguages(!showSupportedLanguages)}
              className="w-full flex items-center cursor-pointer justify-between text-sm font-medium hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span>
                  Supported input languages ({STS_INPUT_MODELS_DATA.length})
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showSupportedLanguages ? "rotate-180" : ""
                }`}
              />
            </button>

            {showSupportedLanguages && (
              <div className="border rounded-lg overflow-hidden">
                {/* Search */}
                <div className="p-2 border-b bg-muted/30">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search languages..."
                      value={supportedSearch}
                      onChange={(e) => setSupportedSearch(e.target.value)}
                      className="pl-7 pr-7 h-8 text-xs"
                    />
                    {supportedSearch && (
                      <button
                        onClick={() => setSupportedSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Language list */}
                <div className="max-h-48 overflow-y-auto">
                  {filteredSupportedLanguages.map((lang) => (
                    <div
                      key={lang.code}
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                    >
                      {lang.name} ({lang.code})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Output Tab */}
      {activeTab === "output" && (
        <div className="space-y-4">
          {/* Target language */}
          <div className="space-y-2" ref={targetDropdownRef}>
            <label className="text-sm font-medium">
              Target Language <span className="text-destructive">*</span>
            </label>
            <button
              type="button"
              onClick={() => setTargetOpen(!targetOpen)}
              className="w-full flex items-center justify-between p-2 border rounded-lg text-sm hover:bg-accent transition-colors cursor-pointer"
            >
              <span
                className={
                  targetLanguage ? "text-foreground" : "text-muted-foreground"
                }
              >
                {targetLanguage ? targetLangName : "Select target language"}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  targetOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {targetOpen && (
              <div className="absolute z-50 w-64 mt-1 border rounded-lg bg-background shadow-lg">
                <div className="p-2 border-b sticky top-0 bg-background">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search language..."
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      className="pl-8 pr-8 h-9 text-sm"
                      autoFocus
                    />
                    {targetSearch && (
                      <button
                        onClick={() => setTargetSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-accent rounded p-0.5 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredTargetLanguages.length > 0 ? (
                    filteredTargetLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onTargetLanguageChange(lang.code);
                          setTargetOpen(false);
                          setTargetSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors ${
                          targetLanguage === lang.code
                            ? "bg-accent font-medium"
                            : ""
                        }`}
                      >
                        {lang.name} ({lang.code})
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

          {/* Output format */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Format</label>
            <select
              value={outputFormat}
              onChange={(e) => onOutputFormatChange(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm cursor-pointer"
            >
              <option value="wav">WAV</option>
              <option value="mp3">MP3</option>
              <option value="ogg">OGG</option>
            </select>
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
            className={`h-4 w-4 transition-transform ${
              showAdvanced ? "rotate-180" : ""
            }`}
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sts-enhance"
                checked={enhance}
                onChange={(e) => onEnhanceChange(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="sts-enhance" className="text-sm font-medium">
                Enhance Audio
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}