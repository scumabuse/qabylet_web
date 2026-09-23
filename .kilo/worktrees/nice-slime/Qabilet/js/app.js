/* =========================================
   QABILET — Main App Controller
   ========================================= */

let currentPage = 'home';
let appSettings = {
  largeFont: false,
  darkMode: false,
  highContrast: false,
  simpleMode: false,
  tts: true,
  theme: 'default',
};

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  runSplash();
  loadSettings();
});

function runSplash() {
  const fill = document.getElementById('loaderFill');
  let pct = 0;
  const interval = setInterval(() => {
    pct += Math.random() * 12 + 4;
    if (pct >= 100) {
      pct = 100;
      clearInterval(interval);
      setTimeout(hideSplash, 300);
    }
    if (fill) fill.style.width = pct + '%';
  }, 60);
}

function hideSplash() {
  const splash = document.getElementById('splash');
  const wrapper = document.getElementById('appWrapper');
  if (splash) splash.classList.add('fade-out');
  setTimeout(() => {
    if (splash) splash.style.display = 'none';
    if (wrapper) {
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
    }
    initApp();
  }, 600);
}

function initApp() {
  initVoice();
  initSigns();
  initLearn();
  initAI();
  setupKeyboardNav();
  setupSwipeNav();

  // Welcome voice
  setTimeout(() => {
    if (appSettings.tts) {
      speakText('Добро пожаловать в Qabilet. Платформа доступности для всех.');
    }
  }, 800);
}

/* ===== PAGE NAVIGATION ===== */
function openModule(moduleName) {
  const prevPage = document.getElementById(`page-${currentPage}`);
  const nextPage = document.getElementById(`page-${moduleName}`);
  if (!nextPage) return;

  if (prevPage) prevPage.classList.remove('active');
  nextPage.classList.add('active');
  currentPage = moduleName;

  // Update top bar
  const titles = {
    voice: '🎙️ Голосовой помощник',
    signs: '🤟 Жестовый язык',
    learn: '📚 Образование',
    ai: '🧠 ИИ-Тьютор',
  };
  document.getElementById('topBarTitle').textContent = titles[moduleName] || 'Qabilet';
  document.getElementById('backBtn').style.display = 'flex';

  // Scroll to top
  nextPage.scrollTop = 0;

  // Module init hooks
  if (moduleName === 'voice' && appSettings.tts) {
    setTimeout(() => speakText('Голосовой помощник. Нажмите на микрофон чтобы начать.'), 400);
  }
  if (moduleName === 'signs') {
    renderSignsGrid(SIGNS_DATA);
  }
  if (moduleName === 'learn') {
    renderCourses(currentCourseFilter || 'all');
  }
  if (moduleName === 'ai') {
    const chat = document.getElementById('aiChat');
    if (chat) setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 100);
  }
}

function goHome() {
  const currentEl = document.getElementById(`page-${currentPage}`);
  const homeEl = document.getElementById('page-home');
  if (!homeEl || currentPage === 'home') return;

  // Stop camera if active
  if (typeof stopCamera === 'function') stopCamera();

  if (currentEl) {
    currentEl.classList.remove('active');
    currentEl.classList.add('slide-back');
    setTimeout(() => currentEl.classList.remove('slide-back'), 400);
  }
  homeEl.classList.add('active');
  currentPage = 'home';

  document.getElementById('topBarTitle').textContent = 'Qabilet';
  document.getElementById('backBtn').style.display = 'none';
}

/* ===== LESSON ACTION (global override support) ===== */
function lessonAction() {
  if (window._lessonActionOverride) {
    const fn = window._lessonActionOverride;
    window._lessonActionOverride = null;
    fn();
  } else {
    // Default: step through current sign lesson
    if (typeof currentLessonData !== 'undefined' && currentLessonData && currentLessonData.content) {
      if (typeof currentLessonStep !== 'undefined') {
        currentLessonStep++;
        if (currentLessonStep >= currentLessonData.content.length) {
          closeLesson();
          showToast('🎉 Урок завершён!');
        } else {
          showLessonStep(currentLessonData, currentLessonStep);
        }
      }
    } else {
      closeLesson();
    }
  }
}

/* ===== ACCESSIBILITY SETTINGS ===== */
function openSettings() {
  document.getElementById('settingsOverlay').classList.add('active');
  document.getElementById('settingsPanel').classList.add('active');
}

function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('active');
  document.getElementById('settingsPanel').classList.remove('active');
}

function toggleLargeFont() {
  appSettings.largeFont = document.getElementById('largeFontToggle').checked;
  document.body.classList.toggle('large-font', appSettings.largeFont);
  showToast(appSettings.largeFont ? '🔤 Крупный шрифт включён' : '🔤 Стандартный шрифт');
  saveSettings();
}

function toggleDarkMode() {
  appSettings.darkMode = document.getElementById('darkModeToggle').checked;
  // In our design, dark mode is default — this toggles to extra-dark
  if (appSettings.darkMode) {
    document.documentElement.style.setProperty('--bg', '#000000');
    document.documentElement.style.setProperty('--bg-card', '#0A0A0A');
    document.documentElement.style.setProperty('--bg-card2', '#111111');
    document.documentElement.style.setProperty('--surface', '#1A1A1A');
  } else {
    // Restore from theme
    setTheme(appSettings.theme);
  }
  showToast(appSettings.darkMode ? '🌙 Тёмный режим' : '☀️ Обычный режим');
  saveSettings();
}

function toggleHighContrast() {
  appSettings.highContrast = document.getElementById('highContrastToggle').checked;
  document.body.classList.toggle('high-contrast', appSettings.highContrast);
  showToast(appSettings.highContrast ? '⚡ Высокий контраст' : '⚡ Обычный контраст');
  saveSettings();
}

function toggleSimpleMode() {
  appSettings.simpleMode = document.getElementById('simpleModeToggle').checked;
  document.body.classList.toggle('simple-mode', appSettings.simpleMode);
  showToast(appSettings.simpleMode ? '✋ Упрощённый режим' : '✋ Стандартный режим');
  saveSettings();
}

function setTheme(theme) {
  appSettings.theme = theme;

  // Remove all existing themes
  document.body.classList.remove('theme-default', 'theme-blue', 'theme-green', 'theme-dark');

  if (theme !== 'default') {
    document.body.classList.add(`theme-${theme}`);
  }

  // Update active dot
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.classList.remove('active');
    if (dot.classList.contains(`theme-${theme}`)) {
      dot.classList.add('active');
    }
  });

  // Reset inline CSS vars if any
  if (!appSettings.darkMode) {
    ['--bg','--bg-card','--bg-card2','--surface'].forEach(v =>
      document.documentElement.style.removeProperty(v)
    );
  }

  showToast('🎨 Тема изменена');
  saveSettings();
}

/* ===== SETTINGS PERSISTENCE ===== */
function saveSettings() {
  try {
    localStorage.setItem('qabilet_settings', JSON.stringify(appSettings));
  } catch (e) {}
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('qabilet_settings');
    if (!saved) return;
    const s = JSON.parse(saved);
    appSettings = { ...appSettings, ...s };

    // Apply saved settings
    if (appSettings.largeFont) {
      document.getElementById('largeFontToggle').checked = true;
      document.body.classList.add('large-font');
    }
    if (appSettings.highContrast) {
      document.getElementById('highContrastToggle').checked = true;
      document.body.classList.add('high-contrast');
    }
    if (appSettings.simpleMode) {
      document.getElementById('simpleModeToggle').checked = true;
      document.body.classList.add('simple-mode');
    }
    if (!appSettings.tts) {
      document.getElementById('ttsToggle').checked = false;
      ttsEnabled = false;
    }
    if (appSettings.theme && appSettings.theme !== 'default') {
      setTheme(appSettings.theme);
    }
    if (appSettings.darkMode) {
      document.getElementById('darkModeToggle').checked = true;
      toggleDarkMode();
    }
  } catch (e) {}
}

/* ===== TOAST NOTIFICATIONS ===== */
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ===== KEYBOARD NAVIGATION ===== */
function setupKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    // Escape closes modals/settings
    if (e.key === 'Escape') {
      if (document.getElementById('settingsPanel').classList.contains('active')) {
        closeSettings();
      } else if (document.getElementById('lessonModal').classList.contains('active')) {
        closeLesson();
      } else if (currentPage !== 'home') {
        goHome();
      }
    }
    // Space on voice page triggers mic
    if (e.key === ' ' && currentPage === 'voice' && document.activeElement === document.body) {
      e.preventDefault();
      toggleVoice();
    }
  });
}

/* ===== SWIPE NAVIGATION ===== */
function setupSwipeNav() {
  let startX = 0;
  let startY = 0;
  const THRESHOLD = 80;
  const RATIO = 2;

  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    // Swipe right (back) — only if horizontal swipe dominant
    if (dx > THRESHOLD && Math.abs(dx) > Math.abs(dy) * RATIO) {
      if (currentPage !== 'home') {
        // Don't swipe back if settings is open
        if (!document.getElementById('settingsPanel').classList.contains('active')) {
          goHome();
        }
      }
    }
  }, { passive: true });
}

/* ===== PWA SERVICE WORKER ===== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* ===== ACCESSIBILITY: Focus visible outline ===== */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') document.body.classList.add('keyboard-nav');
});
document.addEventListener('mousedown', () => {
  document.body.classList.remove('keyboard-nav');
});
