/* =========================================
   QABILET — Sign Language Module
   ========================================= */

let cameraStream = null;
let currentSignTab = 'dictionary';
let currentLessonData = null;
let currentLessonStep = 0;

function initSigns() {
  renderSignsGrid(SIGNS_DATA);
  renderSignLessons();
}

/* ===== DICTIONARY ===== */
function renderSignsGrid(data) {
  const grid = document.getElementById('signsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  data.forEach((sign, idx) => {
    const card = document.createElement('div');
    card.className = 'sign-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', sign.word);
    card.innerHTML = `
      <span class="sign-emoji">${sign.emoji}</span>
      <span class="sign-word">${sign.word}</span>
    `;
    card.addEventListener('click', () => openSignDetail(sign));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openSignDetail(sign); });
    grid.appendChild(card);
  });
}

function filterSigns() {
  const query = document.getElementById('signSearch').value.toLowerCase().trim();
  const filtered = query
    ? SIGNS_DATA.filter(s => s.word.toLowerCase().includes(query) || s.category.includes(query))
    : SIGNS_DATA;
  renderSignsGrid(filtered);
}

function openSignDetail(sign) {
  currentLessonData = {
    title: `Жест: ${sign.word}`,
    steps: [
      {
        emoji: sign.emoji,
        title: sign.word,
        content: sign.description,
        highlight: `${sign.emoji} = ${sign.word}`,
      }
    ]
  };
  currentLessonStep = 0;
  openLessonModal(
    `${sign.emoji} ${sign.word}`,
    `<span class="lesson-emoji">${sign.emoji}</span>
     <p style="margin-bottom:12px; font-size:1rem; color:var(--text-primary); font-weight:600;">${sign.word}</p>
     <p style="margin-bottom:12px;">${sign.description}</p>
     <div class="highlight-box">💡 Практика: покажите этот жест перед зеркалом несколько раз</div>`
  );
  if (ttsEnabled) speakText(`Жест ${sign.word}. ${sign.description}`);
}

/* ===== SIGN TABS ===== */
function showSignTab(tab, btn) {
  // Update buttons
  document.querySelectorAll('.sign-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  // Update content
  document.querySelectorAll('.sign-content').forEach(c => c.classList.remove('active'));
  const target = document.getElementById(`sign-${tab}`);
  if (target) target.classList.add('active');

  currentSignTab = tab;

  if (tab === 'camera') {
    // Show camera info
  } else if (tab === 'lessons') {
    renderSignLessons();
  }
}

/* ===== CAMERA / HAND DETECTION ===== */
async function startCamera() {
  const btn = document.getElementById('startCamBtn');
  const statusEl = document.getElementById('cameraStatus');

  if (cameraStream) {
    stopCamera();
    return;
  }

  try {
    btn.textContent = '⏳ Запускаем...';
    btn.disabled = true;

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
    });

    const video = document.getElementById('cameraVideo');
    video.srcObject = cameraStream;
    await video.play();

    if (statusEl) statusEl.style.display = 'none';
    btn.textContent = '⏹ Остановить камеру';
    btn.disabled = false;

    showToast('📷 Камера запущена!');
    startGestureSimulation();

  } catch (err) {
    console.warn('Camera error:', err);
    btn.textContent = '📷 Запустить камеру';
    btn.disabled = false;
    if (statusEl) statusEl.textContent = 'Разрешите доступ к камере в настройках браузера';
    showToast('❌ Нет доступа к камере');
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  const video = document.getElementById('cameraVideo');
  if (video) video.srcObject = null;
  const statusEl = document.getElementById('cameraStatus');
  if (statusEl) statusEl.style.display = 'flex';
  const btn = document.getElementById('startCamBtn');
  if (btn) btn.textContent = '📷 Запустить камеру';

  stopGestureSimulation();
}

// Gesture simulation (for demo — in production use MediaPipe)
let gestureTimer = null;
const DEMO_GESTURES = [
  { emoji: '👋', word: 'Привет' },
  { emoji: '👍', word: 'Хорошо' },
  { emoji: '✌️', word: 'Мир' },
  { emoji: '🤟', word: 'Я тебя люблю' },
  { emoji: '🛑', word: 'Стоп' },
  { emoji: '❓', word: 'Ожидание...' },
];
let gestureIdx = 0;

function startGestureSimulation() {
  const gestureValue = document.getElementById('gestureValue');
  if (!gestureValue) return;

  // Immediately show "Анализ..."
  gestureValue.textContent = '🔍 Анализирую...';

  gestureTimer = setInterval(() => {
    if (!cameraStream) { stopGestureSimulation(); return; }

    // Randomly pick a gesture to simulate recognition
    const g = DEMO_GESTURES[gestureIdx % (DEMO_GESTURES.length - 1)];
    gestureValue.textContent = `${g.emoji} ${g.word}`;
    gestureIdx++;

    // Draw hand skeleton on canvas
    drawHandSkeleton();

  }, 2500);
}

function stopGestureSimulation() {
  if (gestureTimer) { clearInterval(gestureTimer); gestureTimer = null; }
  const gestureValue = document.getElementById('gestureValue');
  if (gestureValue) gestureValue.textContent = '—';
}

function drawHandSkeleton() {
  const canvas = document.getElementById('cameraCanvas');
  const video = document.getElementById('cameraVideo');
  if (!canvas || !video) return;

  canvas.width = video.videoWidth || 320;
  canvas.height = video.videoHeight || 240;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw a simple stylized hand skeleton in the center
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 30;

  ctx.strokeStyle = 'rgba(108, 58, 232, 0.85)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(108, 58, 232, 0.6)';
  ctx.shadowBlur = 8;

  // Palm
  ctx.fillStyle = 'rgba(108, 58, 232, 0.15)';
  ctx.beginPath();
  ctx.roundRect(cx - 30, cy - 20, 60, 50, 12);
  ctx.fill();
  ctx.stroke();

  // Fingers
  const fingers = [
    { x: cx - 28, len: 40 },
    { x: cx - 12, len: 52 },
    { x: cx + 4,  len: 56 },
    { x: cx + 18, len: 50 },
    { x: cx + 30, len: 36 },
  ];
  fingers.forEach((f, i) => {
    const segments = 3;
    const segLen = f.len / segments;
    let y = cy - 20;
    for (let s = 0; s < segments; s++) {
      ctx.beginPath();
      ctx.moveTo(f.x, y);
      ctx.lineTo(f.x, y - segLen + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(f.x, y - segLen + 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
      ctx.fill();
      y -= segLen;
    }
  });

  // Thumb
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy + 10);
  ctx.lineTo(cx - 55, cy - 15);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 55, cy - 15, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
  ctx.fill();

  // Fade out after 1.5s
  setTimeout(() => {
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, 1500);
}

/* ===== SIGN LESSONS ===== */
function renderSignLessons() {
  const list = document.getElementById('signLessonsList');
  if (!list) return;
  list.innerHTML = '';

  SIGN_LESSONS.forEach(lesson => {
    const circumference = 2 * Math.PI * 16;
    const offset = circumference - (lesson.progress / 100) * circumference;

    const item = document.createElement('div');
    item.className = 'lesson-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.innerHTML = `
      <div class="lesson-num">${lesson.id}</div>
      <div class="lesson-info">
        <h4>${lesson.title}</h4>
        <span>⏱ ${lesson.duration} · ${lesson.signs.join(', ')}</span>
      </div>
      <div class="lesson-progress">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle class="progress-bg" cx="20" cy="20" r="16"/>
          <circle class="progress-fill" cx="20" cy="20" r="16"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"/>
        </svg>
      </div>
    `;
    item.addEventListener('click', () => startSignLesson(lesson));
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter') startSignLesson(lesson); });
    list.appendChild(item);
  });
}

function startSignLesson(lesson) {
  currentLessonData = lesson;
  currentLessonStep = 0;
  showLessonStep(lesson, 0);
}

function showLessonStep(lesson, stepIdx) {
  const step = lesson.content[stepIdx];
  if (!step) return;

  let body = '';
  if (step.type === 'intro') {
    body = `<span class="lesson-emoji">📖</span><p>${step.text}</p>`;
  } else if (step.type === 'sign') {
    body = `<span class="lesson-emoji">${step.emoji}</span>
            <p style="font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;">${step.word}</p>
            <p style="margin-bottom:12px;">${step.instruction}</p>
            <div class="highlight-box">✋ Попробуйте повторить жест!</div>`;
  } else if (step.type === 'quiz') {
    const opts = step.options.map((o, i) =>
      `<button class="quiz-opt" onclick="checkQuiz(${i}, ${step.answer}, this)" 
              style="font-size:2rem;padding:12px 20px;background:var(--bg-card2);border:2px solid var(--border);border-radius:12px;cursor:pointer;transition:all 0.2s;margin:4px;">${o}</button>`
    ).join('');
    body = `<p style="font-weight:600;margin-bottom:16px;">${step.question}</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">${opts}</div>`;
  }

  const isLast = stepIdx >= lesson.content.length - 1;
  openLessonModal(
    `${lesson.title} (${stepIdx + 1}/${lesson.content.length})`,
    body,
    isLast ? 'Завершить ✅' : 'Далее →'
  );

  if (ttsEnabled && step.text) speakText(step.text);
  if (ttsEnabled && step.instruction) speakText(step.instruction);
  if (ttsEnabled && step.question) speakText(step.question);
}

function lessonAction() {
  if (!currentLessonData || !currentLessonData.content) {
    closeLesson();
    return;
  }

  currentLessonStep++;
  if (currentLessonStep >= currentLessonData.content.length) {
    closeLesson();
    showToast('🎉 Урок завершён! Отлично!');
    if (ttsEnabled) speakText('Урок завершён! Вы молодец!');
    // Update progress
    SIGN_LESSONS.forEach(l => {
      if (l.id === currentLessonData.id) l.progress = 100;
    });
    renderSignLessons();
  } else {
    showLessonStep(currentLessonData, currentLessonStep);
  }
}

function checkQuiz(selected, correct, btn) {
  const allBtns = btn.parentElement.querySelectorAll('.quiz-opt');
  allBtns.forEach(b => b.disabled = true);

  if (selected === correct) {
    btn.style.background = 'rgba(16,185,129,0.3)';
    btn.style.borderColor = '#10B981';
    showToast('✅ Правильно!');
    if (ttsEnabled) speakText('Правильно! Молодец!');
  } else {
    btn.style.background = 'rgba(239,68,68,0.3)';
    btn.style.borderColor = '#EF4444';
    allBtns[correct].style.background = 'rgba(16,185,129,0.3)';
    allBtns[correct].style.borderColor = '#10B981';
    showToast('❌ Попробуйте ещё раз');
    if (ttsEnabled) speakText('Не совсем. Правильный ответ выделен зелёным.');
  }
}

/* ===== LESSON MODAL ===== */
function openLessonModal(title, body, actionText = 'Понятно ✓') {
  document.getElementById('lessonModalTitle').textContent = title;
  document.getElementById('lessonModalBody').innerHTML = body;
  document.getElementById('lessonActionBtn').textContent = actionText;
  document.getElementById('lessonOverlay').classList.add('active');
  document.getElementById('lessonModal').classList.add('active');
}

function closeLesson() {
  document.getElementById('lessonOverlay').classList.remove('active');
  document.getElementById('lessonModal').classList.remove('active');
  currentLessonData = null;
}

function speakLesson() {
  const body = document.getElementById('lessonModalBody');
  if (body) {
    const text = body.innerText.replace(/[^\w\s.,!?а-яё]/gi, ' ');
    speakText(text);
  }
}
