/* =========================================
   QABILET — Learning Platform Module
   ========================================= */

let currentCourseFilter = 'all';
let currentCourse = null;
let currentCourseStep = 0;

function initLearn() {
  renderCourses('all');
}

function filterCourses(category, btn) {
  currentCourseFilter = category;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCourses(category);
}

function renderCourses(category) {
  const list = document.getElementById('coursesList');
  if (!list) return;

  const filtered = category === 'all'
    ? COURSES_DATA
    : COURSES_DATA.filter(c => c.category === category);

  list.innerHTML = '';

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">
      <span style="font-size:3rem">📭</span>
      <p style="margin-top:12px;">Курсы не найдены</p>
    </div>`;
    return;
  }

  filtered.forEach((course, idx) => {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Курс: ${course.title}`);
    card.style.animationDelay = `${idx * 0.08}s`;

    card.innerHTML = `
      <div class="course-stripe"></div>
      <div class="course-header">
        <div class="course-icon" style="background:${course.iconBg}">${course.icon}</div>
        <div class="course-meta">
          <h3>${course.title}</h3>
          <span class="course-tag">${course.tag}</span>
        </div>
      </div>
      <p class="course-desc">${course.desc}</p>
      <div class="course-progress-bar">
        <div class="course-progress-fill" style="width:0%;" data-target="${course.progress}"></div>
      </div>
      <div class="course-footer">
        <span>📖 ${course.completed}/${course.lessons} уроков</span>
        <span>${course.progress}% завершено</span>
      </div>
    `;

    card.addEventListener('click', () => openCourse(course));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openCourse(course); });
    list.appendChild(card);

    // Animate progress bar after render
    requestAnimationFrame(() => {
      setTimeout(() => {
        const fill = card.querySelector('.course-progress-fill');
        if (fill) fill.style.width = `${course.progress}%`;
      }, 200 + idx * 80);
    });
  });
}

function openCourse(course) {
  currentCourse = course;
  currentCourseStep = 0;

  if (!course.lessons_data || course.lessons_data.length === 0) {
    openLessonModal(
      course.title,
      `<span class="lesson-emoji">${course.icon}</span>
       <p>Этот курс скоро будет доступен! Следите за обновлениями.</p>`
    );
    return;
  }

  showCourseLesson(course, 0);
  if (ttsEnabled) speakText(`Открываем курс: ${course.title}`);
}

function showCourseLesson(course, stepIdx) {
  const lesson = course.lessons_data[stepIdx];
  if (!lesson) return;

  const isLast = stepIdx >= course.lessons_data.length - 1;
  const progress = Math.round(((stepIdx + 1) / course.lessons_data.length) * 100);

  const body = `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:0.8rem;color:var(--text-muted);">Прогресс урока</span>
        <span style="font-size:0.8rem;color:var(--primary-light);font-weight:600;">${progress}%</span>
      </div>
      <div class="course-progress-bar">
        <div class="course-progress-fill" style="width:${progress}%"></div>
      </div>
    </div>
    <span class="lesson-emoji">${lesson.emoji}</span>
    <h4 style="font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:12px;">${lesson.title}</h4>
    <p style="white-space:pre-line;margin-bottom:14px;line-height:1.7;">${lesson.content}</p>
    <div class="highlight-box">${lesson.highlight}</div>
  `;

  openLessonModal(
    `${course.title} · Урок ${stepIdx + 1}`,
    body,
    isLast ? '✅ Завершить курс' : 'Следующий урок →'
  );

  // Override lessonAction for course context
  window._lessonActionOverride = () => {
    currentCourseStep++;
    if (currentCourseStep >= course.lessons_data.length) {
      closeLesson();

      // Update course progress
      course.progress = Math.min(100, course.progress + Math.round(100 / course.lessons));
      course.completed = Math.min(course.lessons, course.completed + 1);

      renderCourses(currentCourseFilter);
      showToast(`🎉 Курс "${course.title}" — урок завершён!`);
      if (ttsEnabled) speakText(`Урок завершён! Вы молодец!`);
    } else {
      showCourseLesson(course, currentCourseStep);
    }
  };

  if (ttsEnabled && lesson.content) {
    speakText(`${lesson.title}. ${lesson.content.substring(0, 200)}`);
  }
}
