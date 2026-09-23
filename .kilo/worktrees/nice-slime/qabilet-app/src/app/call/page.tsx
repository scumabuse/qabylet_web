"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Copy, 
  Check, 
  Plus, 
  UserPlus, 
  Maximize2, 
  Minimize2,
  Camera,
  MessageSquare,
  Sparkles,
  RefreshCw,
  X,
  Loader2
} from "lucide-react";
import { SIGNS_DATA } from "@/lib/data";
import { PeerConnection } from "@/lib/PeerConnection";
import { getGesturesLibrary } from "@/app/actions";
import { useLanguage } from "@/components/LanguageProvider";

type CallState = "idle" | "selecting_role" | "creating" | "joining" | "connected";
type UserRole = "mute" | "hearing";
type HandLandmark = { x: number; y: number; z: number };

export default function CallPage() {
  const [state, setState] = useState<CallState>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isHandTrackingOn, setIsHandTrackingOn] = useState(true);
  const [recognizedText, setRecognizedText] = useState("");
  const [peerText, setPeerText] = useState<string | null>(null);
  const [status, setStatus] = useState("Initializing...");
  const [role, setRole] = useState<UserRole>("mute");
  const [gesturesLibrary, setGesturesLibrary] = useState<any[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnRef = useRef<PeerConnection | null>(null);
  const handsRef = useRef<any>(null);
  const requestRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  const libraryRef = useRef<any[]>([]);
  const recognitionRef = useRef<any>(null);
  const drawingModuleRef = useRef<any>(null);
  const handsModuleRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const { t } = useLanguage();

  // Load gestures library
  useEffect(() => {
    const loadLibrary = async () => {
      const res = await getGesturesLibrary();
      if (res.data) {
        console.log('Загружено жестов из БД:', res.data.length);
        setGesturesLibrary(res.data);
        libraryRef.current = res.data;
      }
    };
    loadLibrary();
  }, []);

  // Sync local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const isInitializingHands = useRef(false);

  // Initialize MediaPipe Hands
  useEffect(() => {
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
        console.log("MediaPipe Hands initialized for Call");
      } catch (error) {
        console.error("Failed to initialize MediaPipe", error);
      } finally {
        isInitializingHands.current = false;
      }
    };

    initHands();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) {}
        handsRef.current = null;
      }
    };
  }, []);

  const onResults = (results: any) => {
    if (!canvasRef.current) return;
    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      console.log('Начинаю поиск совпадений для координат...');

      // Drawing logic using cached modules
      if (drawingModuleRef.current && handsModuleRef.current) {
        const drawing = drawingModuleRef.current;
        const hands = handsModuleRef.current;
        const connections = hands.HAND_CONNECTIONS || [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
        
        for (const handLandmarks of results.multiHandLandmarks) {
          drawing.drawConnectors(canvasCtx, handLandmarks, connections, {
            color: "#6C3AE8",
            lineWidth: 4,
          });
          drawing.drawLandmarks(canvasCtx, handLandmarks, {
            color: "#FFFFFF",
            lineWidth: 1,
            radius: 3,
          });
        }
      }

      let bestMatch = null;
      let minDistance = 0.18; // Threshold for a good match
      let closestFoundDist = 999;

      for (const gesture of libraryRef.current) {
        if (gesture.pattern_json) {
          try {
            const pattern = typeof gesture.pattern_json === 'string' 
              ? JSON.parse(gesture.pattern_json) 
              : gesture.pattern_json;
              
            const dist = compareGestures(landmarks, pattern);
            if (dist < closestFoundDist) closestFoundDist = dist;
            
            if (dist < minDistance) {
              minDistance = dist;
              bestMatch = gesture.word;
            }
          } catch (e) {
            console.warn("Error parsing gesture pattern for word:", gesture.word, e);
          }
        }
      }

      console.log(`Дистанция до ближайшего жеста: ${closestFoundDist.toFixed(4)} (Threshold: ${minDistance})`);

      if (bestMatch && bestMatch !== recognizedText) {
        console.log('Слово из БД:', bestMatch);
        setRecognizedText(bestMatch);
        
        // PeerJS send check
        if (peerConnRef.current) {
          peerConnRef.current.sendData(bestMatch);
        } else {
          console.warn("PeerJS connection not available, cannot send data");
        }

        // Clear after a while
        setTimeout(() => setRecognizedText(""), 3000);
      }
    }
    canvasCtx.restore();
  };

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

  const startSpeechToText = () => {
    if (isListening) return;
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "ru-RU";
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const text = event.results[event.results.length - 1][0].transcript;
        console.log("🎙️ Speech detected:", text); // Иконка для заметности в консоли
        setRecognizedText(text);
        peerConnRef.current?.sendData(text);
        // Clear after 3 seconds
        setTimeout(() => setRecognizedText(""), 3000);
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        if (error === "no-speech" || error === "aborted" || (typeof error === 'string' && error.includes('abort'))) return;
        
        console.error("❌ Speech recognition error:", error);
        if (error === "not-allowed") {
           alert("Доступ к микрофону запрещен. Пожалуйста, разрешите доступ к микрофону в настройках браузера для распознавания речи.");
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        // Restart recognition if it hasn't been explicitly stopped
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Ignore already started errors
          }
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setIsListening(true);
        console.log("✅ Слушаю микрофон...");
      } catch (e) {
        console.error("❌ Ошибка при запуске распознавания:", e);
      }
    } else {
      console.error("❌ Распознавание речи не поддерживается в этом браузере.");
      alert("Распознавание речи не поддерживается. Пожалуйста, используйте Google Chrome.");
    }
  };

  const stopSpeechToText = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null; // Disable restart loop
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  useEffect(() => {
    return () => {
      stopSpeechToText();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) {}
        handsRef.current = null;
      }
    };
  }, []);

  const startDetectionLoop = () => {
    const process = async () => {
      if (!isTrackingRef.current) return;
      
      if (localVideoRef.current && localVideoRef.current.readyState >= 2 && handsRef.current) {
        try {
          await handsRef.current.send({ image: localVideoRef.current });
        } catch (e) {
          console.error("MediaPipe send error", e);
        }
      }
      
      if (isTrackingRef.current) {
        requestRef.current = requestAnimationFrame(process);
      }
    };
    requestRef.current = requestAnimationFrame(process);
  };

  // Generate 4-digit code
  const generateCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomCode(code);
    setState("creating");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const joinRoom = () => {
    if (inputCode.length === 4) {
      setRoomCode(inputCode);
      setState("selecting_role");
    }
  };

  const startCall = async (isCreator: boolean = true, selectedRole: UserRole) => {
    // Cleanup existing connection if any
    if (peerConnRef.current) {
      console.log("Cleaning up existing connection before starting new one...");
      peerConnRef.current.destroy();
      peerConnRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      
      // Initialize PeerConnection
      peerConnRef.current = new PeerConnection(
        roomCode,
        isCreator,
        stream,
        (remoteStream) => {
          setRemoteStream(remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        },
        (data) => {
          setPeerText(data);
          // Clear after a while
          setTimeout(() => setPeerText(null), 5000);
        },
        (status) => setStatus(status)
      );

      setState("connected");
      
      // Start tracking or speech based on the actual selected role
      if (selectedRole === "mute") {
        isTrackingRef.current = true;
        startDetectionLoop();
      } else if (selectedRole === "hearing") {
        startSpeechToText();
      }

    } catch (err) {
      console.error("Error accessing media devices:", err);
      setStatus("Camera error");
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const newState = !isVideoOn;
      localStream.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
      setIsVideoOn(newState);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const newState = !isMicOn;
      localStream.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
      setIsMicOn(newState);
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    peerConnRef.current?.destroy();
    peerConnRef.current = null;
    isTrackingRef.current = false;
    stopSpeechToText();
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    setLocalStream(null);
    setRemoteStream(null);
    setState("idle");
    setRoomCode("");
    setInputCode("");
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[var(--color-primary)]/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[var(--color-primary-light)]/5 rounded-full blur-[100px] -z-10" />

      {state === "idle" && (
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-[var(--color-primary)]/20">
              <Video className="text-white" size={40} />
            </div>
            <h1 className="text-4xl font-black gradient-text">Qabilet Video</h1>
            <p className="text-[var(--text-secondary)]">{t('call_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={generateCode}
              className="group relative p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] flex items-center gap-4 transition-all hover:border-[var(--color-primary)] hover:shadow-xl hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">{t('call_create')}</p>
                <p className="text-xs text-[var(--text-muted)]">{t('call_get_code')}</p>
              </div>
            </button>

            <button 
              onClick={() => setState("joining")}
              className="group relative p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] flex items-center gap-4 transition-all hover:border-[var(--color-primary-light)] hover:shadow-xl hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-[var(--color-primary-light)]/10 text-[var(--color-primary-light)] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserPlus size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">{t('call_join')}</p>
                <p className="text-xs text-[var(--text-muted)]">{t('call_enter_code_desc')}</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {state === "selecting_role" && (
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-black">{t('call_role_title')}</h2>
            <p className="text-[var(--text-secondary)]">{t('call_role_sub')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => { setRole("mute"); startCall(!inputCode, "mute"); }}
              className={`p-6 border-2 rounded-[2rem] text-left transition-all hover:scale-[1.02] ${role === "mute" ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-xl flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <p className="font-bold text-lg">{t('call_role_mute')}</p>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{t('call_role_mute_desc')}</p>
            </button>
            <button 
              onClick={() => { setRole("hearing"); startCall(!inputCode, "hearing"); }}
              className={`p-6 border-2 rounded-[2rem] text-left transition-all hover:scale-[1.02] ${role === "hearing" ? 'border-[var(--color-primary-light)] bg-[var(--color-primary-light)]/5' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 bg-[var(--color-primary-light)]/10 text-[var(--color-primary-light)] rounded-xl flex items-center justify-center">
                  <Mic size={20} />
                </div>
                <p className="font-bold text-lg">{t('call_role_hearing')}</p>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{t('call_role_hearing_desc')}</p>
            </button>
          </div>
        </div>
      )}

      {state === "creating" && (
        <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-[3rem] shadow-2xl text-center space-y-6">
            <h2 className="text-2xl font-black">{t('call_your_code')}</h2>
            <div className="flex items-center justify-center gap-4 py-8 bg-[var(--surface)] rounded-[2rem] border-2 border-dashed border-[var(--border-color)]">
              {roomCode.split('').map((digit, i) => (
                <div key={i} className="w-12 h-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex items-center justify-center text-3xl font-black text-[var(--color-primary)] shadow-sm">
                  {digit}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCopyCode}
                className="flex-1 py-4 bg-[var(--bg-card2)] border border-[var(--border-color)] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--surface)] transition-all"
              >
                {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                {copied ? t('call_copied') : t('call_copy')}
              </button>
              <button 
                onClick={() => setState("selecting_role")}
                className="flex-[1.5] py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[var(--color-primary)]/30 transition-all active:scale-95"
              >
                <Video size={20} />
                {t('call_select_role')}
              </button>
            </div>
              <button 
              onClick={() => setState("idle")}
              className="text-[var(--text-muted)] font-semibold hover:text-[var(--text-primary)] transition-colors"
            >
              {t('call_cancel')}
            </button>
          </div>
        </div>
      )}

      {state === "joining" && (
        <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-[3rem] shadow-2xl text-center space-y-6">
            <h2 className="text-2xl font-black">{t('call_enter_code')}</h2>
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="w-14 h-20 bg-[var(--surface)] border-2 border-[var(--border-color)] rounded-2xl text-center text-3xl font-black focus:border-[var(--color-primary)] focus:outline-none transition-all shadow-inner"
                  value={inputCode[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val) {
                      const newCode = inputCode.split("");
                      newCode[i] = val;
                      setInputCode(newCode.join(""));
                      if (i < 3) (e.target.nextElementSibling as HTMLInputElement)?.focus();
                    } else {
                      const newCode = inputCode.split("");
                      newCode[i] = "";
                      setInputCode(newCode.join(""));
                      if (i > 0) (e.target.previousElementSibling as HTMLInputElement)?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !inputCode[i] && i > 0) {
                      (e.currentTarget.previousElementSibling as HTMLInputElement)?.focus();
                    }
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <button 
              disabled={inputCode.length < 4}
              onClick={joinRoom}
              className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                inputCode.length === 4 
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] text-white hover:shadow-xl' 
                  : 'bg-[var(--bg-card2)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
            >
              <UserPlus size={24} />
              {t('call_join_room')}
            </button>
            <button 
              onClick={() => setState("idle")}
              className="text-[var(--text-muted)] font-semibold hover:text-[var(--text-primary)] transition-colors"
            >
              {t('call_back')}
            </button>
          </div>
        </div>
      )}

      {state === "connected" && (
        <div className="w-full h-full max-w-6xl mx-auto flex flex-col gap-4 animate-in fade-in duration-700">
          {/* Main View Area */}
          <div className="relative flex-1 rounded-[3rem] overflow-hidden bg-black border border-[var(--border-color)] shadow-2xl min-h-[500px]">
            
            {/* Remote Video (Main View) */}
            <div className="absolute inset-0 z-0 bg-black">
              {remoteStream ? (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  onLoadedMetadata={(e) => e.currentTarget.play()}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-card2)]">
                  <div className="w-32 h-32 bg-[var(--bg-card)] rounded-full flex items-center justify-center mb-4 border border-[var(--border-color)] animate-pulse">
                    <UserPlus size={48} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="text-[var(--text-secondary)] font-bold">{t('call_waiting')}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-2">{t('call_room_code')} {roomCode}</p>
                </div>
              )}
            </div>
            
            {/* Local Video (PiP) */}
            <div className={`absolute top-6 right-6 w-48 aspect-video md:w-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20 transition-all`}>
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  onLoadedMetadata={(e) => e.currentTarget.play()}
                  className="w-full h-full object-cover"
                />
                <canvas 
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  width={640}
                  height={480}
                />
              {!isVideoOn && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <VideoOff className="text-white/40" size={32} />
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-lg text-[10px] text-white font-bold uppercase tracking-wider">
                Вы ({role === "mute" ? "Жесты" : "Слушатель"})
              </div>
            </div>



            {/* Subtitles / Translation Overlay (Hearing Mode: shows gestures from mute peer) */}
            {role === "hearing" && peerText && (
              <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30 pointer-events-none animate-in slide-in-from-bottom-4">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl text-center">
                  <p className="text-xs text-[var(--color-primary-light)] font-black uppercase tracking-[0.3em] mb-3">Перевод жестов</p>
                  <p className="text-4xl font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">{peerText}</p>
                </div>
              </div>
            )}

            {/* Translation Overlay (Mute Mode: shows speech from hearing peer) */}
            {role === "mute" && peerText && (
              <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30 pointer-events-none animate-in slide-in-from-bottom-4">
                <div className="bg-[var(--color-primary)]/60 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl text-center">
                  <p className="text-[10px] text-white/80 font-black uppercase tracking-[0.2em] mb-2">Слышащий говорит:</p>
                  <p className="text-2xl font-black text-white">{peerText}</p>
                </div>
              </div>
            )}

            {/* Global Recognition Feedback (Shows what YOU are sending) - MATCHES SCREENSHOT */}
            {recognizedText && (
              <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-in fade-in zoom-in duration-300">
                <div className="relative group">
                  {/* Glowing background effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#6C3AE8] to-[#A78BFA] rounded-[3rem] blur opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                  
                  <div className="relative px-12 py-8 bg-[#13102A]/90 backdrop-blur-3xl border-2 border-[#6C3AE8]/50 rounded-[2.5rem] shadow-[0_0_50px_rgba(108,58,232,0.4)] min-w-[400px] text-center">
                    <p className="text-[10px] text-[#A78BFA] font-black uppercase tracking-[0.5em] mb-4 opacity-80">
                      Передаю собеседнику
                    </p>
                    <p className="text-5xl font-black text-white tracking-tight drop-shadow-lg">
                      {recognizedText}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Badges */}
            <div className="absolute top-6 left-6 flex flex-col gap-2 z-20">
              <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status === "Connected" ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'} `} />
                <span className="text-xs font-bold text-white uppercase tracking-wider">{status}</span>
              </div>
              <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--color-primary-light)]" />
                <span className="text-xs font-bold text-white tracking-wider">AI Translate On</span>
              </div>
            </div>
          </div>

          {/* Control Bar */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-[2.5rem] shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest px-4">{t('call_room_code')} {roomCode}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={toggleMic}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all ${isMicOn ? 'bg-[var(--surface)] text-[var(--text-primary)]' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
              >
                {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
              <button 
                onClick={toggleVideo}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all ${isVideoOn ? 'bg-[var(--surface)] text-[var(--text-primary)]' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
              >
                {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
              </button>
              <button 
                onClick={endCall}
                className="w-14 h-14 md:w-16 md:h-16 bg-red-500 hover:bg-red-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-red-500/30 transition-all hover:-translate-y-1 active:scale-90"
              >
                <PhoneOff size={28} />
              </button>
              <button 
                onClick={() => {
                  if (isListening) stopSpeechToText();
                  else startSpeechToText();
                }}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-[var(--surface)] text-[var(--text-primary)]'}`}
              >
                {isListening ? <Sparkles size={22} className="animate-pulse" /> : <Sparkles size={22} className="opacity-40" />}
              </button>
              <button className="w-12 h-12 md:w-14 md:h-14 bg-[var(--surface)] text-[var(--text-primary)] rounded-2xl flex items-center justify-center hover:bg-[var(--bg-card2)] transition-all">
                <MessageSquare size={22} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <Maximize2 size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
