"use client";

import * as React from "react";
import { Paperclip, FileText, FileImage, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PickedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface FilePickerProps {
  files: PickedFile[];
  onChange: (files: PickedFile[]) => void;
  accept?: string;
  max?: number;
  multiple?: boolean;
  className?: string;
  hint?: string;
}

export function FilePicker({
  files,
  onChange,
  accept = "image/*,application/pdf",
  max = 5,
  multiple = true,
  className,
  hint,
}: FilePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  function add(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      url: URL.createObjectURL(f),
    }));
    onChange([...files, ...next].slice(0, max));
  }

  function remove(id: string) {
    onChange(files.filter((f) => f.id !== id));
  }

  return (
    <div className={className}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-md border-2 border-dashed p-6 cursor-pointer text-center transition-colors",
          drag
            ? "border-brand-primary bg-info-bg"
            : "border-border-strong hover:border-brand-primary hover:bg-info-bg",
        )}
      >
        <Paperclip className="size-6 text-fg-muted mx-auto mb-2" />
        <div className="text-sm font-semibold">Click or drag files here</div>
        <div className="text-[11px] text-fg-muted mt-0.5">
          {hint ?? "Images & PDFs · up to 5 MB each"}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {files.map((f) => {
            const Icon = f.type.startsWith("image/") ? FileImage : FileText;
            return (
              <li
                key={f.id}
                className="flex items-center gap-2.5 p-2 rounded-md bg-surface-2 border border-border"
              >
                <Icon className="size-4 text-fg-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{f.name}</div>
                  <div className="text-[10px] text-fg-muted">
                    {(f.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  aria-label="Remove"
                  className="p-1 text-fg-muted hover:text-danger rounded-md"
                >
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
