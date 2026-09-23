/* =========================================
   QABILET — Voice Assistant Module
   ========================================= */

let recognition = null;
let synthesis = window.speechSynthesis;
let isListening = false;
let ttsEnabled = true;

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Speech Recognition not supported');
    const status = document.getElementById('voiceStatus');
    if (status) status.textContent = 'Браузер не поддерживает голосовой ввод';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    updateVoiceUI(true);
  };

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    const display = final || interim;
    const transcriptEl = document.getElementById('voiceTranscript');
    if (transcriptEl) {
      transcriptEl.textContent = display;
      transcriptEl.classList.add('active');
    }
    if (final) {
      processVoiceCommand(final.toLowerCase().trim());
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech error:', event.error);
    isListening = false;
    updateVoiceUI(false);
    const status = document.getElementById('voiceStatus');
    if (status) {
      const msgs = {
        'not-allowed': 'Разрешите доступ к микрофону',
        'no-speech': 'Речь не обнаружена',
        'network': 'Ошибка сети',
      };
      status.textContent = msgs[event.error] || 'Ошибка распознавания';
    }
  };

  recognition.onend = () => {
    isListening = false;
    updateVoiceUI(false);
  };
}

function updateVoiceUI(listening) {
  const circle = document.getElementById('voiceCircle');
  const status = document.getElementById('voiceStatus');
  if (circle) {
    if (listening) {
      circle.classList.add('listening');
    } else {
      circle.classList.remove('listening');
    }
  }
  if (status) {
    status.textContent = listening ? '🔴 Слушаю вас...' : 'Нажмите для начала';
  }
}

function toggleVoice() {
  if (!recognition) {
    initVoice();
    if (!recognition) return;
  }
  if (isListening) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start error', e);
    }
  }
}

function processVoiceCommand(text) {
  // Check built-in commands
  for (const [cmd, action] of Object.entries(VOICE_COMMANDS)) {
    if (text.includes(cmd)) {
      action();
      const response = `Выполнено: ${cmd}`;
      setVoiceOutput(response);
      if (ttsEnabled) speakText(response);
      return;
    }
  }

  // Generic voice response
  const replies = [
    `Я слышу вас: "${text}". Как я могу помочь?`,
    `Вы сказали: "${text}". Попробуйте команду "помощь" для списка команд.`,
    `Принято: "${text}". Скажите "открыть обучение" или "помощь".`,
  ];
  const reply = replies[Math.floor(Math.random() * replies.length)];
  setVoiceOutput(reply);
  if (ttsEnabled) speakText(reply);

  // Also send to AI
  if (text.length > 3 && !text.startsWith('открыть')) {
    setTimeout(() => addAIMessage(text, true), 500);
  }
}

function setVoiceOutput(text) {
  const box = document.getElementById('voiceOutputText');
  if (box) {
    box.textContent = text;
    // Flash animation
    const container = document.getElementById('voiceOutputBox');
    if (container) {
      container.style.borderColor = 'var(--primary)';
      setTimeout(() => container.style.borderColor = '', 1000);
    }
  }
}

function speakText(text) {
  if (!ttsEnabled) return;
  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU';
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  utterance.volume = 1;

  // Try to find a Russian voice
  const voices = synthesis.getVoices();
  const ruVoice = voices.find(v => v.lang.startsWith('ru'));
  if (ruVoice) utterance.voice = ruVoice;

  utterance.onstart = () => {
    const circle = document.getElementById('voiceCircle');
    if (circle) circle.style.boxShadow = '0 0 60px rgba(6,182,212,0.6)';
  };
  utterance.onend = () => {
    const circle = document.getElementById('voiceCircle');
    if (circle) circle.style.boxShadow = '';
  };

  synthesis.speak(utterance);
}

function stopSpeech() {
  synthesis.cancel();
  if (recognition && isListening) {
    recognition.stop();
  }
  showToast('⏹ Остановлено');
}

function startVoiceGreeting() {
  const greeting = 'Добро пожаловать в Qabilet! Я ваш голосовой помощник. Вы можете говорить команды или нажать на микрофон. Скажите "помощь" для получения списка команд.';
  setVoiceOutput(greeting);
  speakText(greeting);
}

function toggleTTS() {
  ttsEnabled = document.getElementById('ttsToggle').checked;
  showToast(ttsEnabled ? '🔊 Озвучивание включено' : '🔇 Озвучивание выключено');
}

function startAIVoice() {
  if (!recognition) initVoice();
  if (!recognition) { showToast('Голосовой ввод не поддерживается'); return; }

  // Temporarily redirect recognition output to AI
  const originalOnResult = recognition.onresult;

  recognition.onresult = (event) => {
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      }
    }
    if (final.trim()) {
      document.getElementById('aiInput').value = final.trim();
      sendAIMessage();
    }
    recognition.onresult = originalOnResult;
  };

  recognition.onerror = () => {
    recognition.onresult = originalOnResult;
    isListening = false;
  };

  try {
    recognition.start();
    showToast('🎤 Говорите...');
  } catch (e) {}
}

// Load voices async (browsers load them lazily)
if (synthesis) {
  synthesis.onvoiceschanged = () => { synthesis.getVoices(); };
}
