"use client";

import React, { useEffect, useRef, useState } from "react";
import { Video, Info, Hand, AlertCircle, Sparkles } from "lucide-react";
import { getGesturesLibrary } from "@/app/actions";
import { useLanguage } from "@/components/LanguageProvider";

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
  const normalizeLandmarks = (landmarks: any[]) => {
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

  const compareGestures = (detected: any[], pattern: any[]) => {
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
            
            // Recognition Logic
            let bestMatch = null;
            let minDistance = 0.22; // More forgiving threshold

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
                } catch (e) {}
              }
            }
            setRecognizedWord(bestMatch);

            // Heuristic for letters
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

            if (bestMatch || letter) {
              setStatus(`Распознано: ${bestMatch || letter}`);
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
            setRecognizedWord(null);
            setDetectedLetter(null);
            setStatus("Камера не видит рук");
          }
          canvasCtx.restore();
        });

        camera = new CameraClass(videoRef.current, {
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
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto relative">
      <div
        className="absolute top-0 right-0 w-80 h-64 pointer-events-none -z-0"
        style={{ background: 'radial-gradient(ellipse at 80% 0%, rgba(124,58,237,0.1) 0%, transparent 70%)' }}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10 pt-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold mb-2">AI визия</p>
          <h2 className="font-display text-3xl md:text-4xl font-black mb-1">{t('gestures_title').split(' ')[0]} <span className="gradient-text">{t('gestures_title').split(' ').slice(1).join(' ')}</span></h2>
          <p className="text-[var(--text-secondary)] text-sm">{t('gestures_subtitle')}</p>
        </div>
        <div
          className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-500 shrink-0"
          style={handDetected ? {
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.3)',
            boxShadow: '0 0 20px rgba(52,211,153,0.15)',
          } : {
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Hand
            size={18}
            style={{ color: handDetected ? '#34D399' : 'var(--text-muted)' }}
            className={handDetected ? 'animate-bounce' : ''}
          />
          <span
            className="font-bold text-sm uppercase tracking-wider"
            style={{ color: handDetected ? '#34D399' : 'var(--text-secondary)' }}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div
          className="lg:col-span-2 relative aspect-video rounded-3xl overflow-hidden"
          style={{
            background: '#000',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)',
          }}
        >
          <video ref={videoRef} className="hidden" />
          <canvas ref={canvasRef} className="w-full h-full object-cover mirror" width="640" height="480" />

          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ border: '2px solid rgba(124,58,237,0.3)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }}
              />
              <p className="font-display font-bold text-lg text-white tracking-wide">Запуск нейронной сети MediaPipe...</p>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
            <div
              className="px-3 py-1.5 rounded-xl text-[10px] font-mono"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
            >
              AI VISION • HAND_LANDMARKS_V2
            </div>
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={isCameraActive ? {
                background: '#22c55e',
                boxShadow: '0 0 10px #22c55e',
              } : { background: '#ef4444' }}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div
            className="relative overflow-hidden rounded-3xl p-6"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.3), transparent)' }}
            />
            <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
              <Info size={17} className="text-[var(--color-primary-light)]" />
              Инструкция
            </h3>
            <ul className="space-y-3">
              {[
                'Убедитесь, что ваше лицо и руки хорошо освещены.',
                'Поместите ладонь полностью в рамку камеры.',
                'Система автоматически отрисует скелет вашей руки.',
              ].map((text, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
                    style={{
                      background: 'rgba(124,58,237,0.15)',
                      border: '1px solid rgba(124,58,237,0.2)',
                      color: 'var(--color-primary-light)',
                    }}
                  >{i + 1}</span>
                  <span className="text-[var(--text-secondary)] leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="relative overflow-hidden rounded-3xl p-6"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
              boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
            }}
          >
            <div className="absolute -right-4 -bottom-4 opacity-15 pointer-events-none">
              <Hand size={80} color="white" />
            </div>
            <div className="relative z-10">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <Info size={16} color="white" />
              </div>
              <h4 className="font-bold text-base mb-2 text-white">Технология MediaPipe</h4>
              <p className="text-white/75 text-xs leading-relaxed">
                Мы используем передовые алгоритмы Google для отслеживания 21 ключевой точки ладони в 3D пространстве.
              </p>
            </div>
          </div>

          {!isCameraActive && (
            <div
              className="p-4 rounded-2xl flex gap-3 text-sm"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#FCD34D',
              }}
            >
              <AlertCircle size={17} className="shrink-0 mt-0.5" />
              <p>Разрешите браузеру доступ к камере, чтобы запустить переводчик.</p>
            </div>
          )}

          {/* Library Info */}
          <div className="card-premium p-5 border border-[var(--border-color)] bg-[var(--bg-card)]/50 backdrop-blur-md">
             <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">База знаний ИИ</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">Активна</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="text-2xl font-black text-[var(--color-primary-light)]">{gesturesLibrary.length}</div>
                <div className="text-[10px] text-[var(--text-secondary)] leading-tight">
                   Жестов загружено из глобальной библиотеки.<br/>ИИ готов к распознаванию.
                </div>
             </div>
          </div>

          {/* Results Display */}
          {(recognizedWord || detectedLetter) && (
            <div className="card-premium p-6 border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[var(--color-primary-light)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Результат ИИ</span>
                </div>
                <div className="px-2 py-1 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-md">LIVE</div>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-5xl font-black gradient-text mb-2">{recognizedWord || detectedLetter}</span>
                <p className="text-xs text-[var(--text-secondary)] font-semibold tracking-wide">Распознано в реальном времени</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
