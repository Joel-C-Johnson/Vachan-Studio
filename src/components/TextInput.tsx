// src/components/TextInput.tsx

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";

const MAX_BOXES = 3;
const MAX_WORDS = 30;

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function countTotalWords(boxes: string[]): number {
  return boxes.reduce((sum, text) => sum + countWords(text), 0);
}

interface TextInputProps {
  boxes: string[];
  onBoxesChange: (boxes: string[]) => void;
  isSubmitted: boolean;
  hasResult: boolean;
  onContentChanged?: () => void;
}

export function TextInput({
  boxes,
  onBoxesChange,
  isSubmitted,
  hasResult,
  onContentChanged,
}: TextInputProps) {
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const totalWords = countTotalWords(boxes);
  const isOverLimit = totalWords > MAX_WORDS;
  const canAddBox = boxes.length < MAX_BOXES && !isOverLimit && !isSubmitted;

  const handleChange = (index: number, value: string) => {
    const updated = [...boxes];
    updated[index] = value;
    onBoxesChange(updated);
    setPendingDelete(null);
    if (hasResult) onContentChanged?.();
  };

  const handleAddBox = () => {
    if (!canAddBox) return;
    onBoxesChange([...boxes, ""]);
    setTimeout(() => {
      textareaRefs.current[boxes.length]?.focus();
    }, 50);
  };

  const removeBox = (index: number) => {
    if (boxes.length === 1) return;
    const updated = boxes.filter((_, i) => i !== index);
    onBoxesChange(updated);
    setPendingDelete(null);
    if (hasResult) onContentChanged?.();
    setTimeout(() => {
      textareaRefs.current[Math.max(0, index - 1)]?.focus();
    }, 50);
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === "Backspace" && boxes[index] === "" && index > 0) {
      if (pendingDelete === index) {
        removeBox(index);
      } else {
        setPendingDelete(index);
      }
    } else {
      setPendingDelete(null);
    }
  };

  const isReadOnly = isSubmitted;

  return (
    <div className="space-y-3">
      {boxes.map((text, index) => (
        <div
          key={index}
          className={`relative border rounded-lg transition-colors ${
            pendingDelete === index
              ? "border-red-400 ring-1 ring-red-400 bg-red-50 dark:bg-red-950/20"
              : isOverLimit
                ? "border-destructive ring-1 ring-destructive"
                : "border-input"
          }`}
        >
          <textarea
            ref={(el) => { textareaRefs.current[index] = el; }}
            value={text}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            readOnly={isReadOnly}
            placeholder={
              pendingDelete === index
                ? "Press backspace again to remove this segment"
                : index === 0
                  ? "Enter text to convert to speech..."
                  : `Text segment ${index + 1}...`
            }
            rows={3}
            className={`w-full p-3 text-sm bg-transparent rounded-lg resize-none focus:outline-none focus:ring-0 pr-8 ${
              isReadOnly ? "cursor-default opacity-70" : ""
            }`}
          />

          {index > 0 && !isReadOnly && (
            <button
              onClick={() => removeBox(index)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${
            isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"
          }`}
        >
          {totalWords} / {MAX_WORDS} words
          {isOverLimit && " — over limit, please reduce text"}
        </span>

        {canAddBox && (
          <button
            onClick={handleAddBox}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add segment
          </button>
        )}
      </div>
    </div>
  );
}