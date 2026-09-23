"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { HandMetal, Camera, Book, Search, Video, X, Info, Hand, Download } from "lucide-react";
import { SIGNS_DATA, ALPHABET_DATA } from "@/lib/data";
import { getGesturesLibrary, seedGestures, saveGesturePattern } from "@/app/actions";
import SignAvatar from "@/components/SignAvatar";
import { useLanguage } from "@/components/LanguageProvider";

// MediaPipe types (simplified for usage)
type HandLandmark = { x: number; y: number; z: number };

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

  const normalizeLandmarks = (landmarks: HandLandmark[]) => {
    if (!landmarks || landmarks.length === 0) return [];
    const base = landmarks[0];
    const scale = Math.sqrt(
      Math.pow(landmarks[5].x - landmarks[0].x, 2) + 
      Math.pow(landmarks[5].y - landmarks[0].y, 2)
    ) || 1;

    return landmarks.map(p => ({
      x: (p.x - base.x) / scale,
      y: (p.y - base.y) / scale
    }));
  };

  const compareGestures = (detected: HandLandmark[], pattern: any[]) => {
    if (!detected || !pattern || detected.length !== pattern.length) return 100;
    
    const normDetected = normalizeLandmarks(detected);
    const normPattern = normalizeLandmarks(pattern);

    let dist = 0;
    for (let i = 0; i < normDetected.length; i++) {
      dist += Math.sqrt(
        Math.pow(normDetected[i].x - normPattern[i].x, 2) + 
        Math.pow(normDetected[i].y - normPattern[i].y, 2)
      );
    }
    return dist / normDetected.length;
  };

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

    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setIsHandDetected(true);
      
      const landmarks = results.multiHandLandmarks[0];
      lastLandmarksRef.current = landmarks;
      
      // 1. Library-based recognition
      let bestMatch = null;
      let minDistance = 0.15; // Threshold for a good match

      for (const gesture of libraryRef.current) {
        if (gesture.pattern_json) {
          try {
            const pattern = typeof gesture.pattern_json === 'string' 
              ? JSON.parse(gesture.pattern_json) 
              : gesture.pattern_json;
              
            const dist = compareGestures(landmarks, pattern);
            if (dist < minDistance) {
              minDistance = dist;
              bestMatch = gesture.word;
            }
          } catch (e) {
            console.warn("Gesture parse error", e);
          }
        }
      }
      setRecognizedWord(bestMatch);

      // 2. Heuristic for Letter Recognition (fallback/complementary)
      const isFingerExtended = (tip: number, pip: number) => landmarks[tip].y < landmarks[pip].y;
      
      const indexExtended = isFingerExtended(8, 6);
      const middleExtended = isFingerExtended(12, 10);
      const ringExtended = isFingerExtended(16, 14);
      const pinkyExtended = isFingerExtended(20, 18);

      let letter = null;

      if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) letter = 'А';
      else if (indexExtended && middleExtended && ringExtended && pinkyExtended) letter = 'В';
      else if (!indexExtended && !middleExtended && !ringExtended && pinkyExtended) letter = 'И';
      else if (indexExtended && !middleExtended && !ringExtended && pinkyExtended) letter = 'У';

      setDetectedLetter(letter);

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
      setDetectedLetter(null);
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
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20 relative">

      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-56 pointer-events-none -z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 70%)' }}
      />

      <div className="text-center pt-6 relative z-10">
        <div className="flex justify-center mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15))',
              border: '1px solid rgba(124,58,237,0.3)',
              boxShadow: '0 0 24px rgba(124,58,237,0.2)',
            }}
          >
            <span className="text-3xl animate-bounce-slow">🤟</span>
          </div>
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-black mb-2">
          {t('signs_title').split(' ')[0]} <span className="gradient-text">{t('signs_title').split(' ').slice(1).join(' ')}</span>
        </h2>
        <p className="text-[var(--text-secondary)]">{t('signs_subtitle')}</p>
      </div>

      {/* Tab switcher */}
      <div
        className="flex p-1 sticky top-4 z-10"
        style={{
          background: 'rgba(19,16,42,0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-color)',
          borderRadius: '18px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {[
          { id: 'dictionary' as Tab, label: t('signs_words'), icon: Book, action: () => { setActiveTab('dictionary'); stopCamera(); } },
          { id: 'alphabet' as Tab, label: t('signs_alphabet'), icon: HandMetal, action: () => { setActiveTab('alphabet'); stopCamera(); } },
          { id: 'camera' as Tab, label: t('signs_camera'), icon: Camera, action: () => setActiveTab('camera') },
        ].map(({ id, label, icon: Icon, action }) => (
          <button
            key={id}
            onClick={action}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-250"
            style={activeTab === id ? {
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
              color: 'white',
              boxShadow: '0 4px 16px rgba(124,58,237,0.45)',
              transform: 'scale(1.03)',
            } : {
              color: 'var(--text-secondary)',
            }}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder={activeTab === "alphabet" ? t('signs_search') : t('signs_search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full py-4 pl-12 pr-4 outline-none text-sm transition-all duration-200 placeholder:italic"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            color: 'var(--text-primary)',
          }}
          onFocus={e => {
            (e.target as HTMLElement).style.borderColor = 'rgba(124,58,237,0.5)';
            (e.target as HTMLElement).style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)';
          }}
          onBlur={e => {
            (e.target as HTMLElement).style.borderColor = 'var(--border-color)';
            (e.target as HTMLElement).style.boxShadow = 'none';
          }}
        />
      </div>

      {activeTab === "dictionary" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {filteredSigns.map((sign, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedSign(sign)}
              className="card-premium flex flex-col items-center justify-center text-center cursor-pointer p-6 group"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.1))',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}
              >
                <span className="text-3xl">{sign.emoji}</span>
              </div>
              <span className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--color-primary-light)] transition-colors">{sign.word}</span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1 font-semibold">{sign.category}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "alphabet" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] p-8 shadow-xl relative group overflow-hidden">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs font-bold uppercase tracking-wider">
                      <Info size={14} /> Справочник
                    </div>
                    <h3 className="text-2xl font-black text-[var(--text-primary)]">Общая таблица жестов</h3>
                    <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                      Используйте эту таблицу как быструю шпаргалку для изучения русского дактильного алфавита. Каждая буква соответствует определенному положению кисти руки.
                    </p>
                  </div>
                  <a 
                    href="/images/alphabet/reference-wide.png" 
                    download="daktil-alfavit.png"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--bg-card2)] hover:bg-[var(--surface)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md hover:border-[var(--color-primary)]/50 active:scale-95 shrink-0"
                  >
                    <Download size={18} />
                    Скачать
                  </a>
                </div>
                <div className="w-full relative rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--surface)] transition-colors shadow-inner flex items-center justify-center p-2" style={{ aspectRatio: '770/349' }}>
                  <div className="w-full h-full relative">
                    <Image 
                      src="/images/alphabet/reference-wide.png"
                      alt="Таблица русского дактильного алфавита"
                      fill
                      className="object-contain p-2 drop-shadow-lg"
                      style={{ filter: 'invert(1) contrast(1.1)', mixBlendMode: 'screen', opacity: 0.85 }}
                    />
                  </div>
                </div>
              </div>
            </div>


          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredAlphabet.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedSign({ emoji: '🖐️', word: `Буква ${item.letter}`, description: item.description, isLetter: true, slug: item.slug })}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-2 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--bg-card2)] hover:-translate-y-1.5 transition-all duration-300 group shadow-sm hover:shadow-md aspect-square relative overflow-hidden"
              >
                <div className="absolute top-2 left-2 z-10 text-xl font-black text-[var(--color-primary)] group-hover:scale-125 transition-transform">{item.letter}</div>
                <div className="w-full h-full relative">
                  <Image 
                    src={`/images/alphabet/${item.slug}.png`}
                    alt={`Жест для буквы ${item.letter}`}
                    fill
                    className="object-contain p-3 group-hover:scale-110 transition-transform duration-500 z-10 drop-shadow-md"
                    style={{ filter: 'invert(1) contrast(1.2)', mixBlendMode: 'screen', opacity: 0.9 }}
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
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--color-primary-light)] z-0">
                    <Hand size={32} className="opacity-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "camera" && (
        <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-300">
          <div className="w-full max-w-2xl aspect-video bg-black rounded-[2rem] border-4 border-[var(--bg-card)] relative overflow-hidden shadow-2xl group">
            {/* Always render video and canvas when tab is active to avoid ref issues */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
            />
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              width={1280}
              height={720}
            />

            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-8 text-center bg-red-500/10 backdrop-blur-sm z-30">
                <Video size={48} className="mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">Ошибка камеры</h3>
                <p className="max-w-xs text-sm">{cameraError}</p>
                <button 
                  onClick={startCamera}
                  className="mt-6 px-6 py-2 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-colors"
                >
                  Попробовать снова
                </button>
              </div>
            ) : !isCameraActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] p-6 text-center bg-[var(--bg-card2)] z-30">
                <div className="w-16 h-16 border-4 border-white/20 border-t-[var(--color-primary)] rounded-full animate-spin mb-4" />
                <p className="font-display font-bold text-lg text-[var(--text-primary)] tracking-wide">Запуск камеры...</p>
              </div>
            ) : !isHandsReady ? (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm transition-all z-20">
                <div className="w-16 h-16 border-4 border-white/20 border-t-[var(--color-primary)] rounded-full animate-spin mb-4" />
                <p className="font-display font-bold text-lg text-white tracking-wide">Загрузка ИИ-модели...</p>
              </div>
            ) : null}

            {/* Overlay UI */}
            {isCameraActive && (
              <div className="absolute top-4 left-4 flex gap-2 z-20">
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border ${isHandDetected ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${isHandDetected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  {isHandDetected ? 'HAND DETECTED' : 'NO HAND'}
                </div>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className={`w-full max-w-2xl p-4 rounded-2xl border flex items-center justify-between transition-all duration-500 ${isHandDetected ? 'border-[var(--success)]/50 bg-[var(--success)]/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isHandDetected ? 'bg-[var(--success)] text-white' : 'bg-[var(--surface)] text-[var(--text-muted)]'}`}>
                <Hand size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">Статус анализа</p>
                <p className={`font-bold transition-all ${isHandDetected ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                  {isHandDetected ? "Рука обнаружена" : "Поместите руку в кадр"}
                </p>
              </div>
            </div>

            {(detectedLetter || recognizedWord) && (
              <div className="flex items-center gap-3 animate-in zoom-in duration-300">
                <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tighter text-right">
                  {recognizedWord ? "Слово:" : "Буква:"}
                </div>
                <div className="px-4 h-12 bg-[var(--color-primary)] text-white rounded-xl flex items-center justify-center text-xl font-black shadow-lg shadow-[var(--color-primary)]/30 animate-bounce-slow min-w-[3rem]">
                  {recognizedWord || detectedLetter}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            className={`w-full max-w-2xl py-5 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3
              ${isCameraActive 
                ? 'bg-[var(--bg-card2)] border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--surface)]' 
                : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] text-white hover:shadow-[0_12px_30px_rgba(108,58,232,0.4)] hover:-translate-y-1'
              }
            `}
          >
            {isCameraActive ? <X size={24} /> : <Camera size={24} />}
            {isCameraActive ? "Выключить камеру" : "Запустить камеру"}
          </button>

          {isCameraActive && isHandsReady && (
            <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] p-6 space-y-4 animate-in slide-in-from-top-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold">Режим обучения</h4>
                  <p className="text-xs text-[var(--text-muted)]">Добавьте свой жест в глобальную базу</p>
                </div>
                <button 
                  onClick={() => setIsRecording(!isRecording)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isRecording ? 'bg-red-500 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20'}`}
                >
                  {isRecording ? "Отмена" : "Записать жест"}
                </button>
              </div>

              {isRecording && (
                <div className="space-y-3 pt-2">
                  <input 
                    type="text" 
                    placeholder="Название жеста (напр. Мама)" 
                    value={newGestureName}
                    onChange={(e) => setNewGestureName(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border-color)] rounded-xl outline-none focus:border-[var(--color-primary)] transition-all"
                  />
                  <button 
                    disabled={!newGestureName || !isHandDetected}
                    onClick={handleSavePattern}
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:grayscale transition-all hover:shadow-lg hover:shadow-green-500/20 active:scale-95"
                  >
                    {saveStatus || "Сохранить образец"}
                  </button>
                  {!isHandDetected && <p className="text-[10px] text-red-400 text-center">Нужно, чтобы рука была в кадре</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Detail */}
      {selectedSign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div 
            className="bg-[var(--bg-card)] w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 border border-[var(--border-color)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64 bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary-light)]/20 flex items-center justify-center overflow-hidden">
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={() => setSelectedSign(null)}
                  className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors text-white backdrop-blur-md"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative z-0 flex flex-col items-center w-full px-8">
                <div className="w-full aspect-video bg-[var(--bg-card)] rounded-2xl flex items-center justify-center shadow-2xl mb-4 border-2 border-[var(--border-color)] relative overflow-hidden">
                  <SignAvatar 
                    currentWord={selectedSign.isLetter ? selectedSign.word.split(' ')[1] : selectedSign.word} 
                    className="w-full h-full border-none"
                  />
                </div>
                <div className="px-4 py-1 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full uppercase tracking-tighter">
                  {selectedSign.isLetter ? 'Дактилология' : selectedSign.category || 'Жест'}
                </div>
              </div>
              
              {/* Decorative background shapes */}
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[var(--color-primary)] opacity-10 rounded-full blur-3xl" />
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--color-primary-light)] opacity-10 rounded-full blur-3xl" />
            </div>
            
            <div className="p-8">
              <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                {selectedSign.word}
                <Info size={18} className="text-[var(--color-primary)]" />
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Как выполнить:</p>
                  <p className="text-[var(--text-secondary)] leading-relaxed bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border-color)]">
                    {selectedSign.description}
                  </p>
                </div>
                
                <button
                  onClick={() => setSelectedSign(null)}
                  className="btn-primary w-full py-4 justify-center"
                >
                  Понятно
                </button>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setSelectedSign(null)} />
        </div>
      )}
    </div>
  );
}
