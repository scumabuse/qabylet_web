"use client";

import React, { useEffect, useRef, useState } from "react";
import { Info, Loader2, ScanLine } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { getGesturesLibrary } from "@/app/actions";
import { useLanguage } from "@/components/LanguageProvider";
import { classifyStaticSign, matchLibrary, GestureSmoother } from "@/lib/gesture-recognition";

export default function GesturesPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [status, setStatus] = useState("Инициализация камеры...");
  const [handDetected, setHandDetected] = useState(false);
  const [gesturesLibrary, setGesturesLibrary] = useState<any[]>([]);
  const [recognizedWord, setRecognizedWord] = useState<string | null>(null);
  const [detectedLetter, setDetectedLetter] = useState<string | null>(null);
  const { t } = useLanguage();

  const libraryRef = useRef<any[]>([]);
  const lastLandmarksRef = useRef<any>(null);
  // Turns per-frame guesses into a stable result, so it does not flicker.
  const smootherRef = useRef(new GestureSmoother());

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    let camera: any = null;
    let hands: any = null;

    const loadLibrary = async () => {
      const res = await getGesturesLibrary();
      if (res.data) {
        setGesturesLibrary(res.data);
        libraryRef.current = res.data;
      }
    };
    loadLibrary();

    const initMediaPipe = async () => {
      try {
        // Dynamic imports to avoid SSR issues and satisfy Turbopack
        const handsModule = await import("@mediapipe/hands");
        const cameraModule = await import("@mediapipe/camera_utils");
        const drawingModule = await import("@mediapipe/drawing_utils");

        // Handle different export patterns
        const HandsClass = handsModule.Hands || (handsModule as any).default?.Hands || handsModule;
        const CameraClass = cameraModule.Camera || (cameraModule as any).default?.Camera || cameraModule;
        const HAND_CONNECTIONS = handsModule.HAND_CONNECTIONS || (handsModule as any).default?.HAND_CONNECTIONS;

        hands = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: any) => {
          if (!canvasRef.current) return;
          const canvasCtx = canvasRef.current.getContext("2d")!;
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw video frame to canvas
          canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setHandDetected(true);
            const landmarks = results.multiHandLandmarks[0];
            lastLandmarksRef.current = landmarks;
            
            // Recognition: gestures recorded by users first, then built-in
            // letters and words; smoothed over recent frames.
            const aspect = (results.image?.width || 640) / (results.image?.height || 480);
            const libraryWord = matchLibrary(landmarks, libraryRef.current, aspect);
            const sign = libraryWord ? null : classifyStaticSign(landmarks, aspect);
            const frameLabel = libraryWord
              ? `w:${libraryWord}`
              : sign
                ? `${sign.kind === "word" ? "w" : "l"}:${sign.label}`
                : null;
            const stable = smootherRef.current?.push(frameLabel) ?? null;
            const word = stable?.startsWith("w:") ? stable.slice(2) : null;
            const letter = stable?.startsWith("l:") ? stable.slice(2) : null;
            setRecognizedWord(word);
            setDetectedLetter(letter);

            if (word || letter) {
              setStatus(`Распознано: ${word || letter}`);
            } else {
              setStatus("Анализирую жест...");
            }

            for (const handLandmarks of results.multiHandLandmarks) {
              drawingModule.drawConnectors(canvasCtx, handLandmarks, HAND_CONNECTIONS, {
                color: "#8B5CF6",
                lineWidth: 4,
              });
              drawingModule.drawLandmarks(canvasCtx, handLandmarks, {
                color: "#E879F9",
                lineWidth: 1,
                radius: 4,
              });
            }
          } else {
            setHandDetected(false);
            // A frame without a hand counts as "nothing"; the result clears
            // after a few such frames, so a tracking dropout does not flicker.
            const stable = smootherRef.current?.push(null) ?? null;
            setRecognizedWord(stable?.startsWith("w:") ? stable.slice(2) : null);
            setDetectedLetter(stable?.startsWith("l:") ? stable.slice(2) : null);
            setStatus("Камера не видит рук");
          }
          canvasCtx.restore();
        });

        const videoEl = videoRef.current;
        if (!videoEl) throw new Error("Video element is not mounted");

        camera = new CameraClass(videoEl, {
          onFrame: async () => {
            if (hands && videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        setIsCameraActive(true);
        setStatus("Камера активна. Покажите руку.");
      } catch (err) {
        console.error("MediaPipe initialization error:", err);
        setStatus("Ошибка доступа к камере или ИИ");
      }
    };

    initMediaPipe();

    return () => {
      if (camera) camera.stop();
      if (hands) hands.close();
    };
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI визия"
        title={t('gestures_title')}
        description={t('gestures_subtitle')}
        actions={
          <Badge
            variant={handDetected ? "success" : "outline"}
            className="h-8 max-w-full px-3 text-[0.8125rem]"
            role="status"
            aria-live="polite"
          >
            <StatusDot tone={handDetected ? "success" : "neutral"} live={handDetected} />
            <span className="truncate">{status}</span>
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Stage */}
        <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-black shadow-sm">
          <video ref={videoRef} className="hidden" />
          <canvas ref={canvasRef} className="h-full w-full -scale-x-100 object-cover" width="640" height="480" />

          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950 p-8 text-center" role="status">
              <Loader2 size={22} className="animate-spin text-white/60" />
              <p className="text-sm font-medium text-white/80">Запуск нейронной сети MediaPipe...</p>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between">
            <span className="rounded-md border border-white/10 bg-black/55 px-2 py-1 font-mono text-[0.625rem] text-white/70">
              AI VISION • HAND_LANDMARKS_V2
            </span>
            <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/55 px-2 py-1">
              <StatusDot tone={isCameraActive ? "success" : "danger"} />
              <span className="font-mono text-[0.625rem] text-white/70">{isCameraActive ? "LIVE" : "OFF"}</span>
            </span>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <AnimatePresence>
            {(recognizedWord || detectedLetter) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-accent-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ScanLine size={15} className="text-accent-text" />
                      Результат ИИ
                    </CardTitle>
                    <Badge variant="accent" className="h-5 px-1.5 font-mono text-[0.625rem]">LIVE</Badge>
                  </CardHeader>
                  <CardBody className="flex flex-col items-center gap-1 py-6" aria-live="polite">
                    <span className="text-5xl font-semibold tracking-[-0.03em] text-fg">{recognizedWord || detectedLetter}</span>
                    <span className="text-xs text-fg-muted">Распознано в реальном времени</span>
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {!isCameraActive && (
            <Alert tone="warning">Разрешите браузеру доступ к камере, чтобы запустить переводчик.</Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info size={15} className="text-fg-subtle" />
                Инструкция
              </CardTitle>
            </CardHeader>
            <ol className="space-y-3 p-5">
              {[
                'Убедитесь, что ваше лицо и руки хорошо освещены.',
                'Поместите ладонь полностью в рамку камеры.',
                'Система автоматически отрисует скелет вашей руки.',
              ].map((text, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-[0.6875rem] text-fg-muted">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed text-fg-muted">{text}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="divide-y divide-border">
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-xs text-fg-subtle">База знаний ИИ</p>
                <p className="mt-0.5 font-mono text-2xl font-medium tabular-nums text-fg">{gesturesLibrary.length}</p>
              </div>
              <Badge variant="success">Активна</Badge>
            </div>
            <p className="px-4 py-3 text-[0.8125rem] leading-relaxed text-fg-muted">
              Жестов загружено из глобальной библиотеки. ИИ готов к распознаванию.
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-semibold text-fg">Технология MediaPipe</p>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-fg-muted">
              Мы используем передовые алгоритмы Google для отслеживания 21 ключевой точки ладони в 3D пространстве.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
