"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { HandMetal, Camera, Book, Search, SearchX, VideoOff, X, Info, Hand, Download, Loader2, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Card, interactiveCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";
import {
  classifyStaticSign,
  matchLibrary,
  GestureSmoother,
  SUPPORTED_LETTERS,
  SUPPORTED_WORDS,
  DYNAMIC_LETTERS,
} from "@/lib/gesture-recognition";
import { SIGNS_DATA, ALPHABET_DATA } from "@/lib/data";
import { getGesturesLibrary, seedGestures, saveGesturePattern } from "@/app/actions";
import SignAvatar from "@/components/SignAvatar";
import GestureAnimation from "@/components/GestureAnimation";
import { useLanguage } from "@/components/LanguageProvider";

type Tab = "dictionary" | "alphabet" | "camera";

export default function SignsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dictionary");
  const [search, setSearch] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [selectedSign, setSelectedSign] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isHandsReady, setIsHandsReady] = useState(false);
  const [detectedLetter, setDetectedLetter] = useState<string | null>(null);
  const [recognizedWord, setRecognizedWord] = useState<string | null>(null);
  const [gesturesLibrary, setGesturesLibrary] = useState<any[]>([]);
  const { t } = useLanguage();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const requestRef = useRef<number | null>(null);
  const cameraActiveRef = useRef(false);
  const libraryRef = useRef<any[]>([]);
  const handsModuleRef = useRef<any>(null);
  const drawingModuleRef = useRef<any>(null);
  const lastLandmarksRef = useRef<any>(null);
  // Turns per-frame guesses into a stable result ("w:<word>" / "l:<letter>").
  const smootherRef = useRef(new GestureSmoother());
  
  const [isRecording, setIsRecording] = useState(false);
  const [newGestureName, setNewGestureName] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const loadLibrary = async () => {
    const res = await getGesturesLibrary();
    if (res.data) {
      setGesturesLibrary(res.data);
      libraryRef.current = res.data;
    }
  };

  const handleSavePattern = async () => {
    if (!lastLandmarksRef.current || !newGestureName) return;
    setSaveStatus("Сохранение...");
    const res = await saveGesturePattern(newGestureName, lastLandmarksRef.current);
    if (res.success) {
      setSaveStatus("Сохранено!");
      setNewGestureName("");
      setIsRecording(false);
      loadLibrary(); // Reload
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus(`Ошибка: ${res.error || 'Неизвестно'}`);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const filteredSigns = SIGNS_DATA.filter(s => 
    s.word.toLowerCase().includes(search.toLowerCase()) || 
    s.category.includes(search.toLowerCase())
  );

  const filteredAlphabet = ALPHABET_DATA.filter(a => 
    a.letter.toLowerCase().includes(search.toLowerCase())
  );

  const stopCamera = () => {
    cameraActiveRef.current = false;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsHandDetected(false);
    smootherRef.current?.reset();
    setDetectedLetter(null);
    setRecognizedWord(null);
  };

  const startDetectionLoop = () => {
    const process = async () => {
      if (!cameraActiveRef.current) return;

      if (videoRef.current && videoRef.current.readyState >= 2 && handsRef.current) {
        try {
          await handsRef.current.send({ image: videoRef.current });
        } catch (e) {
          console.error("MediaPipe send error", e);
        }
      }
      if (cameraActiveRef.current) {
        requestRef.current = requestAnimationFrame(process);
      }
    };
    requestRef.current = requestAnimationFrame(process);
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!videoRef.current && activeTab === "camera") {
      // Retry if element not yet available
      setTimeout(startCamera, 100);
      return;
    }

    try {
      const constraints = {
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } 
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Play error:", e));
          setIsCameraActive(true);
          cameraActiveRef.current = true;
          startDetectionLoop();
        };
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errorMsg = "Ошибка доступа к камере. Убедитесь, что вы разрешили доступ в браузере.";
      if (err.name === 'NotAllowedError') errorMsg = "Доступ к камере отклонен. Пожалуйста, разрешите доступ в настройках браузера.";
      if (err.name === 'NotFoundError') errorMsg = "Камера не найдена. Подключите устройство и попробуйте снова.";
      setCameraError(errorMsg);
      setIsCameraActive(false);
      cameraActiveRef.current = false;
    }
  };

  const onResults = (results: any) => {
    if (!canvasRef.current) return;

    // Match the overlay to the real camera frame so the hand skeleton lines
    // up with the video (4:3 and 16:9 cameras) and geometry is aspect-correct.
    const frameW = results.image?.width || videoRef.current?.videoWidth || 1280;
    const frameH = results.image?.height || videoRef.current?.videoHeight || 720;
    if (canvasRef.current.width !== frameW || canvasRef.current.height !== frameH) {
      canvasRef.current.width = frameW;
      canvasRef.current.height = frameH;
    }
    const aspect = frameW / frameH;

    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setIsHandDetected(true);
      
      const landmarks = results.multiHandLandmarks[0];
      lastLandmarksRef.current = landmarks;
      
      // 1. Gestures recorded by users (library), 2. built-in letters and words.
      const libraryWord = matchLibrary(landmarks, libraryRef.current, aspect);
      const sign = libraryWord ? null : classifyStaticSign(landmarks, aspect);
      const frameLabel = libraryWord
        ? `w:${libraryWord}`
        : sign
          ? `${sign.kind === "word" ? "w" : "l"}:${sign.label}`
          : null;
      const stable = smootherRef.current?.push(frameLabel) ?? null;
      setRecognizedWord(stable?.startsWith("w:") ? stable.slice(2) : null);
      setDetectedLetter(stable?.startsWith("l:") ? stable.slice(2) : null);

      if (drawingModuleRef.current && handsModuleRef.current) {
        const drawing = drawingModuleRef.current;
        const hands = handsModuleRef.current;
        const connections = hands.HAND_CONNECTIONS || [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
        for (const handLandmarks of results.multiHandLandmarks) {
          drawing.drawConnectors(canvasCtx, handLandmarks, connections, {
            color: "#6C3AE8",
            lineWidth: 5,
          });
          drawing.drawLandmarks(canvasCtx, handLandmarks, {
            color: "#FFFFFF",
            lineWidth: 2,
            radius: 4,
          });
        }
      }
    } else {
      setIsHandDetected(false);
      // A frame without a hand counts as "nothing"; the result clears after a
      // few such frames, so a one-frame tracking dropout does not flicker.
      const stable = smootherRef.current?.push(null) ?? null;
      setRecognizedWord(stable?.startsWith("w:") ? stable.slice(2) : null);
      setDetectedLetter(stable?.startsWith("l:") ? stable.slice(2) : null);
    }
    canvasCtx.restore();
  };

  const isInitializingHands = useRef(false);

  // Initialize MediaPipe Hands once
  useEffect(() => {
    loadLibrary();

    if (handsRef.current || isInitializingHands.current) return;

    const initHands = async () => {
      isInitializingHands.current = true;
      try {
        const handsModule = await import("@mediapipe/hands");
        const drawingModule = await import("@mediapipe/drawing_utils");
        
        handsModuleRef.current = handsModule;
        drawingModuleRef.current = drawingModule;

        // Handle different export patterns (ESM vs CJS)
        const HandsClass = handsModule.Hands || (handsModule as any).default?.Hands || handsModule;
        
        const hands = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        await hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);
        handsRef.current = hands;
        setIsHandsReady(true);
        console.log("MediaPipe Hands initialized");
      } catch (error) {
        console.error("Failed to initialize MediaPipe", error);
        setCameraError("Не удалось загрузить ИИ-модель. Попробуйте обновить страницу.");
      } finally {
        isInitializingHands.current = false;
      }
    };

    initHands();

    return () => {
      stopCamera();
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) {}
        handsRef.current = null;
      }
    };
  }, []);

  // Handle Tab Switch and Auto-start Camera
  useEffect(() => {
    if (activeTab === "camera") {
      // Small delay to ensure video element is in DOM
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [activeTab]);

  return (
    <div className="space-y-8">
      <PageHeader title={t('signs_title')} description={t('signs_subtitle')} />

      {/* Toolbar */}
      <div className="sticky top-14 z-20 -mx-4 flex flex-col gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:static md:mx-0 md:flex-row md:items-center md:justify-between md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        <Segmented<Tab>
          id="signs-tabs"
          ariaLabel={t('signs_title')}
          value={activeTab}
          className="w-full md:w-auto"
          fullWidth
          items={[
            { value: 'dictionary', label: t('signs_words'), icon: <Book />, onSelect: () => { setActiveTab('dictionary'); stopCamera(); } },
            { value: 'alphabet', label: t('signs_alphabet'), icon: <HandMetal />, onSelect: () => { setActiveTab('alphabet'); stopCamera(); } },
            { value: 'camera', label: t('signs_camera'), icon: <Camera />, onSelect: () => setActiveTab('camera') },
          ]}
        />
        {activeTab !== "camera" && (
          <div className="w-full md:w-72">
            <Input
              type="search"
              aria-label={t('signs_search')}
              placeholder={activeTab === "alphabet" ? t('signs_search') : t('signs_search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leadingIcon={<Search />}
            />
          </div>
        )}
      </div>

      {activeTab === "dictionary" && (
        filteredSigns.length === 0 ? (
          <EmptyState icon={<SearchX />} title={t('signs_no_results')} />
        ) : (
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredSigns.map((sign, idx) => (
              <StaggerItem key={idx}>
                <button
                  type="button"
                  onClick={() => setSelectedSign(sign)}
                  className={cn(
                    "group flex w-full flex-col items-start gap-6 rounded-xl border border-border bg-surface p-4 text-left shadow-xs",
                    interactiveCard
                  )}
                >
                  <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted font-mono text-base font-medium text-fg-muted transition-colors group-hover:border-accent-border group-hover:bg-accent-soft group-hover:text-accent-text">
                    {sign.word.charAt(0)}
                  </span>
                  <span className="w-full space-y-1">
                    <span className="block text-[0.9375rem] font-semibold tracking-[-0.01em] text-fg">{sign.word}</span>
                    <span className="block font-mono text-[0.6875rem] uppercase tracking-wider text-fg-subtle">{sign.category}</span>
                  </span>
                </button>
              </StaggerItem>
            ))}
          </Stagger>
        )
      )}

      {activeTab === "alphabet" && (
        <div className="space-y-8">
          <FadeIn>
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1.5">
                  <Badge variant="accent">
                    <Info /> Справочник
                  </Badge>
                  <h2 className="pt-1 text-lg font-semibold tracking-[-0.015em] text-fg">Общая таблица жестов</h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
                    Используйте эту таблицу как быструю шпаргалку для изучения русского дактильного алфавита. Каждая буква соответствует определенному положению кисти руки.
                  </p>
                </div>
                <a
                  href="/images/alphabet/reference-wide.png"
                  download="daktil-alfavit.png"
                  className={buttonVariants({ variant: "secondary" })}
                >
                  <Download size={16} />
                  Скачать
                </a>
              </div>
              <div className="border-t border-border bg-subtle p-4">
                <div className="relative w-full" style={{ aspectRatio: '770/349' }}>
                  <Image
                    src="/images/alphabet/reference-wide.png"
                    alt="Таблица русского дактильного алфавита"
                    fill
                    sizes="(min-width: 1280px) 1100px, 100vw"
                    className="sign-art object-contain"
                  />
                </div>
              </div>
            </Card>
          </FadeIn>

          {filteredAlphabet.length === 0 ? (
            <EmptyState icon={<SearchX />} title={t('signs_no_results')} />
          ) : (
            <Stagger className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6" stagger={0.02}>
              {filteredAlphabet.map((item, idx) => (
                <StaggerItem key={idx}>
                  <button
                    type="button"
                    onClick={() => setSelectedSign({ emoji: '🖐️', word: `Буква ${item.letter}`, description: item.description, isLetter: true, slug: item.slug })}
                    aria-label={`Буква ${item.letter}`}
                    className={cn(
                      "group relative block aspect-square w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xs",
                      interactiveCard,
                      "hover:border-accent-border"
                    )}
                  >
                    <span className="absolute left-2.5 top-2 z-20 text-base font-semibold text-fg transition-colors group-hover:text-accent-text">
                      {item.letter}
                    </span>
                    <span className="absolute inset-0 block">
                      <Image
                        src={`/images/alphabet/${item.slug}.png`}
                        alt={`Жест для буквы ${item.letter}`}
                        fill
                        sizes="(min-width: 1024px) 180px, 33vw"
                        className="sign-art z-10 object-contain p-4 pt-6 transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                        onLoad={(e) => {
                          const target = e.target as HTMLElement;
                          const sibling = target.nextElementSibling as HTMLElement;
                          if (sibling) sibling.style.display = 'none';
                        }}
                        onError={(e) => {
                          const target = e.target as any;
                          target.style.display = 'none';
                          const sibling = target.nextElementSibling as HTMLElement;
                          if (sibling) sibling.style.display = 'flex';
                        }}
                      />
                      <span className="absolute inset-0 z-0 flex items-center justify-center text-fg-subtle">
                        <Hand size={28} strokeWidth={1.5} className="opacity-40" />
                      </span>
                    </span>
                  </button>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      )}

      {activeTab === "camera" && (
        <FadeIn className="mx-auto max-w-3xl space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-black shadow-sm">
            {/* Always render video and canvas when tab is active to avoid ref issues */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full -scale-x-100 object-cover transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-10 h-full w-full -scale-x-100 object-cover pointer-events-none"
              width={1280}
              height={720}
            />

            {cameraError ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/85 p-8 text-center" role="alert">
                <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-red-300">
                  <VideoOff size={20} />
                </span>
                <p className="text-base font-semibold text-white">Ошибка камеры</p>
                <p className="max-w-xs text-sm text-white/65">{cameraError}</p>
                <Button onClick={startCamera} className="mt-2">
                  <RotateCcw size={15} />
                  Попробовать снова
                </Button>
              </div>
            ) : !isCameraActive ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-neutral-950" role="status">
                <Loader2 size={22} className="animate-spin text-white/60" />
                <p className="text-sm font-medium text-white/80">Запуск камеры...</p>
              </div>
            ) : !isHandsReady ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60" role="status">
                <Loader2 size={22} className="animate-spin text-white/60" />
                <p className="text-sm font-medium text-white/80">Загрузка ИИ-модели...</p>
              </div>
            ) : null}

            {isCameraActive && (
              <div className="absolute left-3 top-3 z-20">
                <Badge variant="overlay">
                  <StatusDot tone={isHandDetected ? "success" : "danger"} live={isHandDetected} />
                  {isHandDetected ? 'HAND DETECTED' : 'NO HAND'}
                </Badge>
              </div>
            )}
          </div>

          {/* Status */}
          <Card
            className={cn(
              "flex items-center justify-between gap-4 p-4 transition-colors duration-300",
              isHandDetected && "border-success/40"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg transition-colors",
                  isHandDetected ? "bg-success-soft text-success" : "bg-muted text-fg-subtle"
                )}
              >
                <Hand size={18} />
              </span>
              <div>
                <p className="text-xs text-fg-subtle">Статус анализа</p>
                <p className={cn("text-sm font-medium", isHandDetected ? "text-success" : "text-fg")} aria-live="polite">
                  {isHandDetected ? "Рука обнаружена" : "Поместите руку в кадр"}
                </p>
              </div>
            </div>

            <AnimatePresence>
              {(detectedLetter || recognizedWord) && (
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                >
                  <span className="text-xs text-fg-subtle">{recognizedWord ? "Слово:" : "Буква:"}</span>
                  <span className="flex h-10 min-w-10 items-center justify-center rounded-lg bg-accent px-3 text-lg font-semibold text-accent-fg" aria-live="polite">
                    {recognizedWord || detectedLetter}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          <div className="space-y-1.5 rounded-lg border border-border bg-muted/60 px-4 py-3 text-[0.8125rem] leading-relaxed text-fg-muted">
            <p>
              <span className="font-medium text-fg">Распознаются буквы:</span> {SUPPORTED_LETTERS.join(", ")}.{" "}
              <span className="font-medium text-fg">Жесты:</span> {SUPPORTED_WORDS.join(", ")}.
            </p>
            <p>
              Буквы {DYNAMIC_LETTERS.join(", ")} показываются движением, по одному кадру их не распознать.
              Держите руку в кадре целиком и задержите жест на секунду. Свои жесты можно добавить в режиме обучения ниже.
            </p>
          </div>

          <Button
            variant={isCameraActive ? "secondary" : "primary"}
            size="lg"
            onClick={isCameraActive ? stopCamera : startCamera}
            className="w-full"
          >
            {isCameraActive ? <X size={18} /> : <Camera size={18} />}
            {isCameraActive ? "Выключить камеру" : "Запустить камеру"}
          </Button>

          {isCameraActive && isHandsReady && (
            <Card>
              <div className="flex items-center justify-between gap-4 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg">Режим обучения</h3>
                  <p className="text-[0.8125rem] text-fg-muted">Добавьте свой жест в глобальную базу</p>
                </div>
                <Button
                  size="sm"
                  variant={isRecording ? "ghost" : "soft"}
                  onClick={() => setIsRecording(!isRecording)}
                >
                  {isRecording ? "Отмена" : "Записать жест"}
                </Button>
              </div>

              {isRecording && (
                <div className="space-y-3 border-t border-border p-4">
                  <Input
                    type="text"
                    aria-label="Название жеста"
                    placeholder="Название жеста (напр. Мама)"
                    value={newGestureName}
                    onChange={(e) => setNewGestureName(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    disabled={!newGestureName || !isHandDetected}
                    onClick={handleSavePattern}
                    className="w-full"
                  >
                    {saveStatus || "Сохранить образец"}
                  </Button>
                  {!isHandDetected && <p className="text-center text-xs text-danger">Нужно, чтобы рука была в кадре</p>}
                </div>
              )}
            </Card>
          )}
        </FadeIn>
      )}

      {/* Sign detail */}
      <Dialog
        open={!!selectedSign}
        onOpenChange={(open) => { if (!open) setSelectedSign(null); }}
        title={selectedSign?.word ?? ""}
        hideHeader
        className="sm:max-w-md"
      >
        {selectedSign && (
          <div>
            <div className="relative border-b border-border bg-subtle p-4">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-surface">
                {selectedSign.isLetter && selectedSign.slug ? (
                  <Image
                    src={`/images/alphabet/${selectedSign.slug}.png`}
                    alt=""
                    fill
                    sizes="400px"
                    className="sign-art object-contain p-4"
                  />
                ) : (
                  <GestureAnimation word={selectedSign.word} />
                )}
                <SignAvatar
                  currentWord={selectedSign.isLetter ? selectedSign.word.split(' ')[1] : selectedSign.word}
                  showLoading={false}
                  className="absolute inset-0 z-10 h-full w-full rounded-none border-0"
                />
              </div>
              <Button
                variant="secondary"
                size="icon-sm"
                onClick={() => setSelectedSign(null)}
                aria-label="Закрыть"
                className="absolute right-6 top-6 z-20"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="space-y-5 p-5">
              <div className="space-y-2">
                <Badge variant="accent">{selectedSign.isLetter ? 'Дактилология' : selectedSign.category || 'Жест'}</Badge>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-fg">{selectedSign.word}</h2>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-fg-subtle">Как выполнить:</p>
                <p className="rounded-lg border border-border bg-muted px-3.5 py-3 text-sm leading-relaxed text-fg-muted">
                  {selectedSign.description}
                </p>
              </div>
              <Button variant="primary" size="lg" onClick={() => setSelectedSign(null)} className="w-full">
                Понятно
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
