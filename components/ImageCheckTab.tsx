"use client";

import { useRef, useState } from "react";
import { mockImageRecognition } from "@/lib/mock-data";
import type { ImageRecognitionResult } from "@/lib/types";

export default function ImageCheckTab() {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<ImageRecognitionResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStatus("idle");
    setResult(null);
  }

  function runRecognition() {
    setStatus("loading");
    window.setTimeout(() => {
      setResult(mockImageRecognition());
      setStatus("done");
    }, 1100);
  }

  return (
    <div>
      <p className="text-sm text-text-soft">
        صوّر القطعة أو ارفع صورة لها — النظام &quot;يتعرّف&quot; عليها بشكل
        تجريبي ويقترح قطع متوافقة.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-3 flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-diqa border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-accent bg-accent/10"
            : "border-line bg-bg hover:border-accent/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="معاينة القطعة المرفوعة"
            className="max-h-40 rounded-diqa-sm object-contain"
          />
        ) : (
          <>
            <span className="text-3xl">📷</span>
            <span className="text-sm text-text">
              اسحب صورة هنا أو اضغط للاختيار
            </span>
            <span className="text-xs text-text-soft">
              PNG أو JPG — لا تُرفع أي صورة فعلياً في هذه النسخة التجريبية
            </span>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runRecognition}
          disabled={status === "loading"}
          className="rounded-diqa-sm border border-primary bg-primary px-6 py-3 text-sm font-medium text-bg transition-colors hover:bg-transparent hover:text-primary disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-text-soft"
        >
          {status === "loading" ? "جارِ التحليل…" : "جرّب التعرف على القطعة"}
        </button>
        {!preview && (
          <span className="text-xs text-text-soft">
            بدون صورة؟ اضغط الزر لتجربة مثال جاهز
          </span>
        )}
      </div>

      {status === "loading" && (
        <div className="mt-6 animate-pulse rounded-diqa border border-line bg-panel p-6 text-sm text-text-soft">
          جارِ محاكاة تحليل الصورة بالذكاء الاصطناعي…
        </div>
      )}

      {status === "done" && result && (
        <div className="mt-6 rounded-diqa border border-line bg-panel p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-editorial text-2xl text-text">
              {result.partName}
            </h3>
            <span className="font-data text-xs text-accent">
              نسبة الثقة {Math.round(result.confidence * 100)}٪
            </span>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {result.compatibleParts.map((p) => (
              <li
                key={p.name}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <div className="text-text">{p.name}</div>
                  <div className="text-xs text-text-soft">{p.brand}</div>
                </div>
                <span className="font-data text-primary">{p.price} ر.س</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
