// Homepage dashboard rendering from real course content and local progress.
// No placeholder lessons or fake stats: the panels reflect track.json plus
// ProgressStore/localStorage state written by the lesson workspace.
//
// Multi-track: no server-side track discovery on a static site, so the
// list of tracks to check is just declared here — add a line when a new
// track.json lands (matches the list in app/js/course-drawer.js). The
// dashboard features whichever track has the learner's most recent
// activity, so progress in a second track doesn't get stranded behind the
// first one forever; with no activity anywhere yet it defaults to the
// first entry.
const AVAILABLE_TRACKS = [
  { id: 'python-fundamentals', contentBase: 'content/python-fundamentals/' },
  { id: 'javascript-fundamentals', contentBase: 'content/javascript-fundamentals/' },
];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function setHomeStatus(text) {
  const el = document.getElementById('homeStatusText');
  if (el) el.textContent = text;
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function lessonRoute(trackId, lessonId, hash = '') {
  return `app/lesson.html?track=${encodeURIComponent(trackId)}&lesson=${encodeURIComponent(lessonId)}${hash}`;
}

function flattenLessons(trackId, track) {
  const rows = [];
  track.chapters.forEach((chapter, chapterIndex) => {
    (chapter.lessons || []).forEach((lesson, lessonIndex) => {
      rows.push({
        ...lesson,
        chapter,
        chapterIndex,
        lessonIndex,
        route: lessonRoute(trackId, lesson.id),
      });
    });
  });
  return rows;
}

function progressFor(lesson) {
  return {
    complete: ProgressStore.isComplete(lesson.id),
    completedAt: ProgressStore.getCompletedAt(lesson.id),
    openedAt: ProgressStore.getLastOpened(lesson.id),
    attempts: ProgressStore.getAttempts(lesson.id),
    hasDraft: ProgressStore.hasDraft(lesson.id),
  };
}

function annotateLessons(lessons) {
  return lessons.map((lesson) => ({ ...lesson, progress: progressFor(lesson) }));
}

function lastActivityTime(lessons) {
  return lessons.reduce((latest, lesson) => Math.max(latest, lesson.progress.openedAt || 0, lesson.progress.completedAt || 0), 0);
}

function chooseActiveLesson(lessons) {
  const lastId = ProgressStore.getLastLessonId();
  const last = lessons.find((lesson) => lesson.id === lastId);
  const firstIncomplete = lessons.find((lesson) => !lesson.progress.complete);

  if (last && !last.progress.complete) return last;
  if (last && last.progress.complete) {
    const next = lessons.slice(lessons.indexOf(last) + 1).find((lesson) => !lesson.progress.complete);
    if (next) return next;
  }

  const latestActive = [...lessons]
    .filter((lesson) => lesson.progress.openedAt || lesson.progress.hasDraft || lesson.progress.attempts || lesson.progress.complete)
    .sort((a, b) => Math.max(b.progress.openedAt, b.progress.completedAt) - Math.max(a.progress.openedAt, a.progress.completedAt))[0];
  return latestActive && !latestActive.progress.complete ? latestActive : firstIncomplete || last || lessons[0];
}

function countCompleted(lessons) {
  return lessons.filter((lesson) => lesson.progress.complete).length;
}

function chapterProgress(activeLesson, lessons) {
  const chapterLessons = lessons.filter((lesson) => lesson.chapter.id === activeLesson.chapter.id);
  return {
    title: `Chapter ${activeLesson.chapter.number}: ${activeLesson.chapter.title}`,
    current: countCompleted(chapterLessons),
    goal: chapterLessons.length,
    description: activeLesson.progress.complete
      ? 'This chapter is complete. Move on when you are ready.'
      : `Up next: ${activeLesson.number} ${activeLesson.title}`,
  };
}

function trimCode(code) {
  const lines = String(code || '').trimEnd().split('\n');
  return lines.slice(0, 6).join('\n') || '# Open the lesson to start coding';
}

async function loadLessonDetails(contentBase, lesson) {
  try {
    return await loadJSON(contentBase + lesson.path);
  } catch (err) {
    return null;
  }
}

function renderWelcome(track, activeLesson, completed, total) {
  const title = document.getElementById('welcomeTitle');
  const msg = document.getElementById('welcomeMessage');
  if (completed === total && total > 0) {
    title.textContent = 'Course complete';
    msg.textContent = `You have completed every published ${track.title} lesson. Review any chapter, switch courses from the drawer, or keep your streak alive when new lessons land.`;
    return;
  }
  title.textContent = completed ? 'Welcome back to Code Forge' : `Start forging ${track.title.replace(/ Fundamentals$/, '')}`;
  msg.textContent = completed
    ? `You have completed ${completed} of ${total} lessons in ${track.title}. Continue with ${activeLesson.number} ${activeLesson.title}.`
    : `Begin with ${activeLesson.number} ${activeLesson.title}, then your dashboard will track drafts, attempts, XP, and chapter progress here.`;
}

// A streak only extends when ProgressStore.touchStreak() runs, which only
// happens on the lesson workspace — visiting the dashboard must NOT count
// as a touch, or this banner could never legitimately fire.
function renderStreakBanner() {
  const banner = document.getElementById('streakRiskBanner');
  if (!banner) return;
  const streak = ProgressStore.getStreak();
  const lastTouch = localStorage.getItem('codeforge:streak:last');
  const today = new Date().toISOString().slice(0, 10);
  if (streak > 0 && lastTouch !== today) {
    banner.textContent = `🔥 Your ${streak}-day streak is still alive — open a lesson today to keep it going.`;
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

function renderFeaturedCourse(track, trackId, completed, total, activeLesson) {
  document.getElementById('featuredIcon').textContent = track.language === 'javascript' ? 'JS' : 'Py';
  document.getElementById('featuredTitle').textContent = track.title;
  document.getElementById('featuredDesc').textContent = `${track.description} Published progress: ${completed} of ${total} lessons complete.`;
  document.getElementById('featuredLaunchBtn').href = activeLesson.route;
  document.getElementById('featuredLaunchBtn').textContent = completed ? 'Continue Course' : 'Start Course';
  document.getElementById('featuredSyllabusBtn').href = 'quests.html';

  const certBtn = document.getElementById('featuredCertBtn');
  if (certBtn) {
    const earned = total > 0 && completed === total;
    certBtn.hidden = !earned;
    if (earned) certBtn.href = `certificate.html?track=${encodeURIComponent(trackId)}`;
  }
}

function renderContinueLearning(activeLesson, details, total, completed) {
  const draft = ProgressStore.getDraft(activeLesson.id, details && details.assignment ? details.assignment.starterCode : '');
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const state = activeLesson.progress.complete ? 'Completed' : activeLesson.progress.hasDraft ? 'Draft saved' : activeLesson.progress.attempts ? 'Attempted' : 'Not started';

  document.getElementById('continuePreview').textContent = trimCode(draft);
  document.getElementById('continueTitle').textContent = `${activeLesson.number} ${activeLesson.title}`;
  document.getElementById('continueMeta').textContent = `${activeLesson.chapter.title} - ${state}`;
  document.getElementById('continueProgressFill').style.width = `${percent}%`;
  document.getElementById('continueProgressPct').textContent = `${percent}%`;
  document.getElementById('resumeLessonBtn').href = activeLesson.route;
  document.getElementById('resumeLessonBtn').textContent = state === 'Not started' ? 'Start Lesson' : 'Resume Lesson';
  document.getElementById('viewLessonBtn').href = activeLesson.route;
}

function recentLessons(lessons, activeLesson) {
  const active = lessons
    .filter((lesson) => lesson.progress.openedAt || lesson.progress.completedAt || lesson.progress.hasDraft || lesson.progress.attempts || lesson.progress.complete)
    .sort((a, b) => Math.max(b.progress.openedAt, b.progress.completedAt) - Math.max(a.progress.openedAt, a.progress.completedAt));
  const rows = active.length ? active : lessons.slice(0, 5);
  if (!rows.some((lesson) => lesson.id === activeLesson.id)) rows.unshift(activeLesson);
  return rows.slice(0, 5);
}

function lessonAction(lesson) {
  if (lesson.progress.complete) return 'Review';
  if (lesson.progress.hasDraft || lesson.progress.attempts || lesson.progress.openedAt) return 'Resume';
  return 'Start';
}

function renderRecentLessons(lessons, activeLesson) {
  const list = document.getElementById('recentLessonsList');
  list.innerHTML = recentLessons(lessons, activeLesson)
    .map((lesson) => {
      const state = lesson.progress.complete ? 'Complete' : lesson.progress.hasDraft ? 'Draft saved' : lesson.progress.attempts ? `${lesson.progress.attempts} attempts` : 'Not started';
      return `<a class="win95-list-row" href="${escapeHtml(lesson.route)}">
        <span class="win95-list-icon">${lesson.progress.complete ? '✓' : '>'}</span>
        <span class="win95-list-title">${escapeHtml(lesson.number)} ${escapeHtml(lesson.title)} <span class="win95-list-state">${escapeHtml(state)}</span></span>
        <span class="win95-list-action">${escapeHtml(lessonAction(lesson))}</span>
      </a>`;
    })
    .join('');
}

function renderForgeStatus(lessons, activeLesson, chapterQuest) {
  const completed = countCompleted(lessons);
  document.getElementById('statusXp').textContent = `${ProgressStore.getTotalXp().toLocaleString()} XP`;
  document.getElementById('statusStreak').textContent = `${ProgressStore.getStreak()} days`;
  document.getElementById('statusLessonsCompleted').textContent = `${completed} / ${lessons.length}`;
  document.getElementById('questTitle').textContent = chapterQuest.title;
  document.getElementById('questDesc').textContent = chapterQuest.description;
  document.getElementById('questFraction').textContent = `${chapterQuest.current} / ${chapterQuest.goal}`;
  document.getElementById('questProgressFill').style.width = `${chapterQuest.goal ? Math.round((chapterQuest.current / chapterQuest.goal) * 100) : 0}%`;
}

function renderQuickLaunch(activeLesson, lessons, details) {
  const firstIncomplete = lessons.find((lesson) => !lesson.progress.complete) || activeLesson;
  const items = [
    { icon: '>', label: activeLesson.progress.complete ? 'Review Current' : 'Resume Workspace', route: activeLesson.route },
    { icon: '?', label: details && details.checks && details.checks.length ? 'Knowledge Check' : 'Lesson Check', route: lessonRoute(activeLesson.trackId, activeLesson.id, '#quiz') },
    { icon: '!', label: firstIncomplete.id === activeLesson.id ? 'Current Assignment' : 'Next Assignment', route: firstIncomplete.route },
    { icon: '#', label: 'Course Map', route: 'quests.html' },
  ];

  document.getElementById('quickLaunchGrid').innerHTML = items
    .map((q) => `<a class="quicklaunch-btn" href="${escapeHtml(q.route)}">
      <span class="ql-icon">${escapeHtml(q.icon)}</span>
      <span>${escapeHtml(q.label)}</span>
    </a>`)
    .join('');
}

// One row per entry in AVAILABLE_TRACKS — add a track there and it shows up
// here automatically, no other change needed.
function renderAllCourses(states) {
  const list = document.getElementById('allCoursesList');
  if (!list) return;
  list.innerHTML = states
    .map(({ trackMeta, track, lessons }) => {
      const completed = countCompleted(lessons);
      const total = lessons.length;
      const icon = track.language === 'javascript' ? 'JS' : track.language === 'python' ? 'Py' : '#';
      const target = completed === total && total > 0 ? lessons[0] : lessons.find((l) => !l.progress.complete) || lessons[0];
      const label = completed === 0 ? 'Start' : completed === total ? 'Review' : 'Continue';
      return `<a class="win95-list-row" href="${escapeHtml(target.route)}">
        <span class="win95-list-icon">${escapeHtml(icon)}</span>
        <span class="win95-list-title">${escapeHtml(track.title)} <span class="win95-list-state">${completed} / ${total} lessons</span></span>
        <span class="win95-list-action">${escapeHtml(label)}</span>
      </a>`;
    })
    .join('');
}

async function renderAchievements() {
  const grid = document.getElementById('achievementsGrid');
  if (!grid) return;
  const badges = await Achievements.getAll();
  const earnedCount = badges.filter((b) => b.earned).length;
  document.getElementById('achievementsCount').textContent = `${earnedCount} / ${badges.length}`;
  grid.innerHTML = badges
    .map((b) => `<div class="badge ${b.earned ? 'badge-earned' : 'badge-locked'}" title="${escapeHtml(b.desc)}">
      <span class="badge-icon">${b.earned ? b.icon : '🔒'}</span>
      <span class="badge-title">${escapeHtml(b.title)}</span>
    </div>`)
    .join('');
}

async function loadTrackState(trackMeta) {
  const track = await loadJSON(trackMeta.contentBase + 'track.json');
  const lessons = annotateLessons(flattenLessons(trackMeta.id, track)).map((l) => ({ ...l, trackId: trackMeta.id }));
  return { trackMeta, track, lessons, lastActivity: lastActivityTime(lessons) };
}

async function renderHome() {
  try {
    const states = await Promise.all(AVAILABLE_TRACKS.map(loadTrackState));
    // Feature whichever track the learner most recently touched; with no
    // activity anywhere yet, default to the first declared track.
    const active = states.reduce((best, s) => (s.lastActivity > best.lastActivity ? s : best), states[0]);

    const { trackMeta, track, lessons } = active;
    const activeLesson = chooseActiveLesson(lessons);
    const details = await loadLessonDetails(trackMeta.contentBase, activeLesson);
    const completed = countCompleted(lessons);
    const chapterQuest = chapterProgress(activeLesson, lessons);

    renderWelcome(track, activeLesson, completed, lessons.length);
    renderStreakBanner();
    renderAllCourses(states);
    renderFeaturedCourse(track, trackMeta.id, completed, lessons.length, activeLesson);
    renderContinueLearning(activeLesson, details, lessons.length, completed);
    renderRecentLessons(lessons, activeLesson);
    renderForgeStatus(lessons, activeLesson, chapterQuest);
    renderQuickLaunch(activeLesson, lessons, details);
    renderAchievements();
    setHomeStatus(`Ready - ${completed}/${lessons.length} lessons complete in ${track.title}`);
  } catch (err) {
    setHomeStatus('Could not load course data');
    document.getElementById('welcomeMessage').textContent = 'The course dashboard could not load. Start the lesson workspace directly.';
    document.getElementById('resumeLessonBtn').href = 'app/lesson.html';
    document.getElementById('viewLessonBtn').href = 'app/lesson.html';
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

renderHome();
