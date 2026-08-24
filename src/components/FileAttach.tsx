import { useRef, useState, type DragEvent } from "react";
import { Check, Paperclip, UploadCloud } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import type { FileItem } from "../data/types";
import { g, isFemaleUser } from "../lib/gender";

type Kind = FileItem["kind"];
type AttachState = "idle" | "dragging" | "uploading" | "done";

export interface AttachedFileMeta {
  name: string;
  size: string;
  kind: Kind;
}

function detectKind(file: File): Kind {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "sheet";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) || file.type.startsWith("image/")) {
    return "image";
  }
  return "doc";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileAttach({
  onAttach,
  label,
  compact = false,
}: {
  onAttach: (meta: AttachedFileMeta) => void;
  label?: string;
  compact?: boolean;
}) {
  const { currentUser } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const [state, setState] = useState<AttachState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultLabel = g(isFemale, "أرفقي ملف", "أرفق ملف");
  const btnLabel = label ?? defaultLabel;

  const handleFile = (file: File) => {
    setState("uploading");
    window.setTimeout(() => {
      onAttach({ name: file.name, size: formatSize(file.size), kind: detectKind(file) });
      setState("done");
      window.setTimeout(() => setState("idle"), 1400);
    }, 650);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setState("idle");
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => state !== "uploading" && inputRef.current?.click()}
          disabled={state === "uploading"}
          className={clsx(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
            state === "done"
              ? "bg-brand-500 text-white"
              : "bg-surface-muted text-brand-950/60 hover:bg-brand-50 hover:text-brand-700",
          )}
        >
          {state === "uploading" ? (
            <UploadCloud size={14} className="animate-pulse" />
          ) : state === "done" ? (
            <Check size={14} />
          ) : (
            <Paperclip size={14} />
          )}
          {state === "uploading"
            ? g(isFemale, "جاري الإرفاق...", "جاري الإرفاق...")
            : state === "done"
              ? "تم الإرفاق"
              : btnLabel}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={onInputChange} />
      </>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (state !== "uploading") setState("dragging");
      }}
      onDragLeave={() => setState((s) => (s === "dragging" ? "idle" : s))}
      onDrop={onDrop}
      onClick={() => state !== "uploading" && inputRef.current?.click()}
      className={clsx(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all",
        state === "dragging" && "scale-[1.01] border-brand-400 bg-brand-50",
        state === "uploading" && "border-brand-200 bg-brand-50",
        state === "done" && "border-brand-400 bg-brand-50 ring-4 ring-brand-100",
        state === "idle" && "border-brand-100 bg-surface-muted hover:border-brand-200 hover:bg-brand-50/50",
      )}
    >
      {state === "uploading" ? (
        <UploadCloud size={26} className="animate-bounce text-brand-500" />
      ) : state === "done" ? (
        <Check size={26} className="text-brand-500" />
      ) : (
        <Paperclip size={22} className="text-brand-950/35" />
      )}
      <p className="text-sm font-semibold text-brand-950/70">
        {state === "uploading"
          ? "جاري الإرفاق..."
          : state === "done"
            ? "تم الإرفاق بنجاح!"
            : g(
                isFemale,
                "اسحبي الملف هنا أو اضغطي للاختيار",
                "اسحب الملف هنا أو اضغط للاختيار",
              )}
      </p>
      <input ref={inputRef} type="file" className="hidden" onChange={onInputChange} />
    </div>
  );
}
