"use client";

import "@excalidraw/excalidraw/index.css";
import dynamic from "next/dynamic";
import React, { useRef, useState } from "react";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then(mod => mod.Excalidraw),
  { ssr: false }
);

export default function Home() {
  const excalidrawContainerRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleSendScreenshot = async () => {
    if (isSending) return;
    setIsSending(true);
    setStatusMessage("");

    try {
      const container = excalidrawContainerRef.current;
      if (!container) {
        throw new Error("Не удалось найти контейнер Excalidraw");
      }
      const canvas = container.querySelector("canvas");
      if (!canvas) {
        throw new Error("Canvas не найден. Попробуйте обновить страницу");
      }

      const blob = await new Promise<Blob | null>(resolve =>
        (canvas as HTMLCanvasElement).toBlob(resolve, "image/png")
      );

      if (!blob) {
        throw new Error("Не удалось получить изображение с canvas");
      }

      const formData = new FormData();
      formData.append("file", blob, "excalidraw.png");
      await fetch("/api/send", {
        method: "POST",
        body: formData,
      });

      setStatusMessage("Скриншот отправлен на бэк");
    } catch (error) {
      console.error(error);
      setStatusMessage(
        error instanceof Error ? error.message : "Неизвестная ошибка при экспорте"
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-8 px-4 py-6">
        <h1 className="text-4xl font-semibold text-white">Broad Board</h1>
        <div className="flex w-full flex-1 items-center gap-6">
          <div
            className="flex-1 h-[80vh] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.9)]"
            ref={excalidrawContainerRef}
          >
            <Excalidraw />
          </div>
          <div className="flex w-56 flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <button
              className="w-full rounded-full bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20"
              onClick={handleSendScreenshot}
              disabled={isSending}
            >
              {isSending ? "Отправляем..." : "Отправить скриншот"}
            </button>
            {statusMessage && (
              <p className="text-xs text-slate-200">
                {statusMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
