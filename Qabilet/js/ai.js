/* =========================================
   QABILET — AI Tutor Module
   ========================================= */

let aiTypingTimer = null;
let aiMessageCount = 0;

function initAI() {
  const input = document.getElementById('aiInput');
  if (input) {
    input.addEventListener('keydown', handleAIKey);
  }
}

function handleAIKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAIMessage();
  }
}

function sendAIMessage() {
  const input = document.getElementById('aiInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addAIMessage(text, true);
}

function sendQuick(text) {
  addAIMessage(text, true);
}

function addAIMessage(text, isUser = false) {
  const chat = document.getElementById('aiChat');
  if (!chat) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `ai-message ${isUser ? 'user' : 'bot'}`;

  const avatar = isUser ? '👤' : '🤖';
  msgDiv.innerHTML = `
    <div class="ai-avatar">${avatar}</div>
    <div class="ai-bubble">${escapeHTML(text)}</div>
  `;
  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;
  aiMessageCount++;

  if (isUser) {
    showTypingIndicator();
    const delay = 800 + Math.min(text.length * 15, 1500);
    aiTypingTimer = setTimeout(() => {
      removeTypingIndicator();
      const response = generateAIResponse(text);
      addBotMessage(response);
    }, delay);
  }
}

function addBotMessage(text) {
  const chat = document.getElementById('aiChat');
  if (!chat) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'ai-message bot';
  msgDiv.innerHTML = `
    <div class="ai-avatar">🤖</div>
    <div class="ai-bubble">${formatAIText(text)}</div>
  `;
  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;

  if (ttsEnabled) {
    const plainText = text.replace(/\*\*/g, '').replace(/\n/g, ' ').substring(0, 300);
    speakText(plainText);
  }
}

function showTypingIndicator() {
  const chat = document.getElementById('aiChat');
  if (!chat) return;

  const indicator = document.createElement('div');
  indicator.className = 'ai-message bot ai-thinking';
  indicator.id = 'typingIndicator';
  indicator.innerHTML = `
    <div class="ai-avatar">🤖</div>
    <div class="ai-bubble">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  chat.appendChild(indicator);
  chat.scrollTop = chat.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

function generateAIResponse(text) {
  const lower = text.toLowerCase();

  // Check keyword matches
  for (const [key, response] of Object.entries(AI_RESPONSES)) {
    if (key !== 'default' && lower.includes(key)) {
      return response;
    }
  }

  // Context-aware responses
  if (lower.includes('привет') || lower.includes('здравствуй') || lower.includes('салем')) {
    return `Привет! 👋 Рад вас видеть! Я ИИ-тьютор Qabilet. Чем могу помочь сегодня?\n\nМожете спросить меня о:\n• Математике и числах\n• Буквах и языке\n• Природе и животных\n• Казахском языке`;
  }

  if (lower.includes('спасибо') || lower.includes('рахмет')) {
    return `Пожалуйста! 😊 Всегда рад помочь!\nЕсли есть ещё вопросы — спрашивайте. Я здесь для вас! 💙`;
  }

  if (lower.includes('молодец') || lower.includes('отлично') || lower.includes('супер')) {
    return `Спасибо! 🌟 Вы тоже молодец, что учитесь и задаёте вопросы!\nПродолжайте — у вас всё получится!`;
  }

  if (lower.includes('кто ты') || lower.includes('что ты') || lower.includes('ты кто')) {
    return `Я — Qabilet ИИ 🤖\n\nМеня создали чтобы помогать людям с обучением. Я умею:\n• Объяснять сложные темы просто\n• Рассказывать сказки\n• Отвечать на любые вопросы\n• Поддерживать и мотивировать\n\nЯ всегда рядом! 💙`;
  }

  if (lower.includes('казахстан') || lower.includes('қазақстан')) {
    return `Казахстан 🇰🇿 — прекрасная страна в центре Евразии!\n\n🏙️ Столица: Астана\n🗣️ Языки: Казахский, Русский\n👥 Население: ~19 миллионов\n🏔️ Горы Алатау, степи, озеро Балхаш\n\nМы гордимся нашей историей и культурой! 🌟`;
  }

  if (lower.includes('цифр') || lower.includes('числ') || lower.includes('счит')) {
    return `Давай посчитаем! 🔢\n\n1️⃣ Один\n2️⃣ Два\n3️⃣ Три\n4️⃣ Четыре\n5️⃣ Пять\n\nПопробуй сам: пять плюс три = ? 🤔`;
  }

  if (lower.includes('цвет') || lower.includes('цвета')) {
    return `Цвета радуги 🌈\n\n🔴 Красный — как помидор\n🟠 Оранжевый — как апельсин\n🟡 Жёлтый — как солнце\n🟢 Зелёный — как трава\n🔵 Синий — как небо\n🟣 Фиолетовый — как сирень\n\nКакой твой любимый цвет?`;
  }

  if (lower.includes('животн') || lower.includes('звер') || lower.includes('зоопарк')) {
    return `Животные — это удивительно! 🦁\n\n🐘 Слон — самое большое сухопутное животное\n🦒 Жираф — самое высокое\n🐋 Синий кит — самое большое вообще!\n🐜 Муравей — поднимает в 50 раз больше своего веса\n\nКакое животное тебе нравится? 🐾`;
  }

  if (lower.includes('как дела') || lower.includes('как ты')) {
    const moods = [
      'Отлично! 😊 Я всегда готов помогать вам учиться!',
      'Прекрасно! 🌟 Рад снова вас видеть!',
      'Великолепно! 💪 Готов к новым знаниям!'
    ];
    return moods[Math.floor(Math.random() * moods.length)];
  }

  // Default with suggestions
  return AI_RESPONSES['default'];
}

function formatAIText(text) {
  // Bold
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  // Emojis stay as-is
  return html;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
