"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, X, GripVertical, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  id: string;
  url: string;
  /** Optional alt text. */
  alt?: string;
  /** True when this is the primary product image. */
  primary?: boolean;
  /** Upload progress 0–100 (omit when settled). */
  progress?: number;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  /** Called when the user picks files. Real R2 upload wired in Phase 5. */
  onUploadStart?: (files: File[]) => void;
  max?: number;
  className?: string;
}

/**
 * Multi-image uploader with primary toggle + remove.
 * Currently UI-only; Phase 5 wires the R2 presigned upload flow.
 */
export function ImageUploader({
  images,
  onChange,
  onUploadStart,
  max = 8,
  className,
}: ImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function pick() {
    inputRef.current?.click();
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Phase-2 stub: turn files into object-URL previews so the UI works
    const fresh: UploadedImage[] = files.map((f) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(f),
      alt: f.name,
      progress: 100,
    }));
    onChange([...images, ...fresh].slice(0, max));
    onUploadStart?.(files);
    e.target.value = "";
  }

  function remove(id: string) {
    onChange(images.filter((i) => i.id !== id));
  }

  function setPrimary(id: string) {
    onChange(images.map((i) => ({ ...i, primary: i.id === id })));
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2.5">
        {images.map((img) => (
          <div
            key={img.id}
            className={cn(
              "relative aspect-square rounded-md overflow-hidden border-2 group",
              img.primary ? "border-brand-primary" : "border-border",
            )}
          >
            <Image src={img.url} alt={img.alt ?? ""} fill sizes="200px" className="object-cover" />
            {img.progress != null && img.progress < 100 && (
              <div className="absolute inset-0 bg-fg/50 flex items-center justify-center text-white text-xs font-bold">
                {Math.round(img.progress)}%
              </div>
            )}
            <div className="absolute inset-0 bg-fg/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end justify-between p-1.5">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPrimary(img.id)}
                  aria-label={img.primary ? "Primary image" : "Set as primary"}
                  className="size-7 rounded-md bg-white/95 text-fg flex items-center justify-center hover:bg-white"
                >
                  <Star
                    className={cn("size-3.5", img.primary && "fill-warning text-warning")}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  aria-label="Remove"
                  className="size-7 rounded-md bg-white/95 text-danger flex items-center justify-center hover:bg-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <span className="text-white text-[10px] font-semibold inline-flex items-center gap-1">
                <GripVertical className="size-3" /> drag to reorder
              </span>
            </div>
          </div>
        ))}

        {images.length < max && (
          <button
            type="button"
            onClick={pick}
            className="aspect-square rounded-md border-2 border-dashed border-border-strong text-fg-muted hover:border-brand-primary hover:text-brand-primary hover:bg-info-bg flex flex-col items-center justify-center gap-1.5"
          >
            <Upload className="size-5" />
            <span className="text-[11px] font-semibold">Upload</span>
            <span className="text-[10px] text-fg-subtle">
              {images.length}/{max}
            </span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <p className="text-[11px] text-fg-subtle mt-2">
        JPEG, PNG, WebP · up to 5 MB each · first image is the primary by default
      </p>
    </div>
  );
}
