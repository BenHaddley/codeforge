// App controller for the multi-screen lesson experience:
// Lesson -> Practice -> Quiz -> Results, one job per screen (see
// wiki/04-LessonPlayer.md). Content is fetched from content/*.json;
// nothing here hardcodes lesson text.
const CONTENT_BASE = '../content/python-fundamentals/';
const DEFAULT_LESSON_ID = 'py-ch07-while-loops';

const params = new URLSearchParams(location.search);
window.CF_LESSON_ID = params.get('lesson') || DEFAULT_LESSON_ID;

let track = null;
let chapter = null;
let lesson = null;
let hintIndex = 0;
let quizIndex = 0;
let quizAnswered = false;
let pendingPracticeAction = null; // 'run' | 'submit' | null — auto-fires once practice screen shows
let lastSubmitResult = null;
let lastQuizCorrect = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}
function setStatus(text) {
  document.getElementById('statusText').textContent = text;
}
function updateXpDisplay() {
  document.getElementById('xp').textContent = ProgressStore.getTotalXp();
}
function updateStreakDisplay() {
  document.getElementById('streak').textContent = ProgressStore.getStreak();
}

// ---------- Screen switching ----------

const SCREEN_LABELS = { lesson: null, practice: 'Practice', quiz: 'Knowledge Check', results: 'Results' };

function renderBreadcrumb(screenName) {
  const parts = [track.title, chapter.title, lesson.title];
  const extra = SCREEN_LABELS[screenName];
  if (extra) parts.push(extra);
  document.getElementById('breadcrumb').innerHTML = parts
    .map((p, i) => (i === parts.length - 1 ? `<span class="current">${escapeHtml(p)}</span>` : `<span>${escapeHtml(p)}</span>`))
    .join('<span class="sep">&gt;</span>');
}

function showScreen(name) {
  if (TTS.available() && TTS.getState() !== 'idle') {
    TTS.stop();
    resetTtsUi();
  }
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  renderBreadcrumb(name);
  location.hash = name;
  if (name === 'practice') refreshPracticeEditor();
  if (name === 'lesson') refreshPreviewEditor();
  if (name === 'quiz') renderQuizScreen();
  if (name === 'results') renderResultsScreen();
}

// ---------- Lesson screen ----------

function renderLessonScreen() {
  document.title = `Code Forge — ${lesson.title}`;
  const src = lesson.sourceAlignment;
  const sourceNote = src
    ? `<p class="source-note">Companion concept: <em>${escapeHtml(src.title)}</em>, Ch. ${escapeHtml(src.chapter)}. Code Forge text below is original.</p>`
    : '';
  const paragraphs = lesson.explanation.paragraphs
    .map((p, i) => `<p class="tts-para" data-tts-index="${i}">${escapeHtml(p)}</p>`)
    .join('\n');
  const rule = lesson.explanation.rule
    ? `<div class="classic-callout tts-para" data-tts-index="${lesson.explanation.paragraphs.length}"><b>Rule of thumb:</b> ${escapeHtml(lesson.explanation.rule)}</div>`
    : '';
  const example = lesson.examples[0];
  const exampleHtml = example
    ? `<h2>Example</h2><pre><code>${escapeHtml(example.code)}</code></pre>${example.note ? `<p>${escapeHtml(example.note)}</p>` : ''}`
    : '';

  document.getElementById('lessonText').innerHTML =
    sourceNote +
    `<h1>${escapeHtml(lesson.title)}</h1>` +
    paragraphs +
    rule +
    exampleHtml +
    `<div class="video-section">
       <div class="video-section-title">Lesson Video</div>
       <div id="videoContainer"></div>
     </div>
     <div class="practice-cta">
       <button class="classic-button" id="openPracticeBtn">Open Practice Workspace →</button>
     </div>`;

  CFVideoPlayer.mount(document.getElementById('videoContainer'), lesson.videos && lesson.videos[0]);

  document.getElementById('openPracticeBtn').addEventListener('click', () => {
    pendingPracticeAction = null;
    showScreen('practice');
  });

  wireTts();
}

function buildTtsParagraphs() {
  const items = [...lesson.explanation.paragraphs];
  if (lesson.explanation.rule) items.push(`Rule of thumb: ${lesson.explanation.rule}`);
  return items;
}

function clearTtsHighlight() {
  document.querySelectorAll('#lessonText .tts-para.tts-active').forEach((el) => el.classList.remove('tts-active'));
}

function updateTtsButtons() {
  const state = TTS.getState();
  const toggleBtn = document.getElementById('ttsToggleBtn');
  const stopBtn = document.getElementById('ttsStopBtn');
  toggleBtn.textContent = state === 'speaking' ? '⏸' : state === 'paused' ? '▶' : '🔊';
  toggleBtn.title = state === 'speaking' ? 'Pause narration' : state === 'paused' ? 'Resume narration (Ctrl+L)' : 'Listen (Ctrl+L)';
  stopBtn.hidden = state === 'idle';
}

function resetTtsUi() {
  clearTtsHighlight();
  updateTtsButtons();
}

function wireTts() {
  const toggleBtn = document.getElementById('ttsToggleBtn');
  const stopBtn = document.getElementById('ttsStopBtn');

  if (!TTS.available()) {
    toggleBtn.disabled = true;
    toggleBtn.title = 'Text-to-speech is not available in this browser.';
    return;
  }

  toggleBtn.addEventListener('click', () => {
    const state = TTS.getState();
    if (state === 'idle') {
      TTS.speak(buildTtsParagraphs(), {
        onParagraphStart: (i) => {
          clearTtsHighlight();
          const el = document.querySelector(`#lessonText [data-tts-index="${i}"]`);
          if (el) {
            el.classList.add('tts-active');
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          updateTtsButtons();
          setStatus('Reading lesson aloud...');
        },
        onEnd: () => {
          resetTtsUi();
          setStatus('Narration finished');
        },
        onFailure: () => {
          resetTtsUi();
          setStatus("Text-to-speech didn't produce audio in this browser.");
        },
      });
    } else if (state === 'speaking') {
      TTS.pause();
      setStatus('Narration paused');
    } else {
      TTS.resume();
      setStatus('Reading lesson aloud...');
    }
    updateTtsButtons();
  });

  stopBtn.addEventListener('click', () => {
    TTS.stop();
    resetTtsUi();
    setStatus('Narration stopped');
  });

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('screen-lesson').classList.contains('active')) return;
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      toggleBtn.click();
    }
  });
}

function updateLines(textarea, lineNumbersEl) {
  const count = textarea.value.split('\n').length;
  lineNumbersEl.textContent = Array.from({ length: count }, (_, i) => i + 1).join('\n');
}

function refreshPreviewEditor() {
  const editor = document.getElementById('previewEditor');
  editor.value = ProgressStore.getDraft(lesson.id, lesson.assignment.starterCode);
  updateLines(editor, document.getElementById('previewLineNumbers'));
}

function setupPreviewEditor() {
  const editor = document.getElementById('previewEditor');
  const lineNumbers = document.getElementById('previewLineNumbers');
  refreshPreviewEditor();
  editor.addEventListener('input', () => {
    updateLines(editor, lineNumbers);
    ProgressStore.setDraft(lesson.id, editor.value);
  });

  document.getElementById('previewRunBtn').addEventListener('click', () => {
    ProgressStore.setDraft(lesson.id, editor.value);
    pendingPracticeAction = 'run';
    showScreen('practice');
  });
  document.getElementById('previewSubmitBtn').addEventListener('click', () => {
    ProgressStore.setDraft(lesson.id, editor.value);
    pendingPracticeAction = 'submit';
    showScreen('practice');
  });
  document.getElementById('previewSolutionBtn').addEventListener('click', () => {
    if (!confirm('Load the full solution? You can still practice it afterward.')) return;
    editor.value = lesson.assignment.solutionCode;
    updateLines(editor, lineNumbers);
    ProgressStore.setDraft(lesson.id, editor.value);
    setStatus('Solution loaded');
  });
}

// ---------- Practice screen ----------

function renderPracticeScreen() {
  const a = lesson.assignment;
  document.getElementById('practiceTitle').textContent = lesson.title;
  document.getElementById('practiceAssignment').innerHTML = `
    <b>${escapeHtml(a.title)}</b>
    <p>${escapeHtml(a.brief)}</p>
    <ul>${a.requirements.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`;

  document.querySelectorAll('.practice-output-pane .tabs button').forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
  document.getElementById('backToLessonBtn').addEventListener('click', () => showScreen('lesson'));
  document.getElementById('practiceRunBtn').addEventListener('click', () => runPractice());
  document.getElementById('practiceSubmitBtn').addEventListener('click', () => submitPractice());
  document.getElementById('continueToQuizBtn').addEventListener('click', () => showScreen('quiz'));
  document.getElementById('practiceHintBtn').addEventListener('click', () => {
    const hints = lesson.hints;
    setPracticeConsole(hints[Math.min(hintIndex, hints.length - 1)]);
    hintIndex = Math.min(hintIndex + 1, hints.length - 1);
    activateTab('hints');
  });

  const editor = document.getElementById('practiceEditor');
  const lineNumbers = document.getElementById('practiceLineNumbers');
  editor.addEventListener('input', () => {
    updateLines(editor, lineNumbers);
    ProgressStore.setDraft(lesson.id, editor.value);
  });

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('screen-practice').classList.contains('active')) return;
    if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      submitPractice();
    } else if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      runPractice();
    }
  });
}

function refreshPracticeEditor() {
  const editor = document.getElementById('practiceEditor');
  editor.value = ProgressStore.getDraft(lesson.id, lesson.assignment.starterCode);
  updateLines(editor, document.getElementById('practiceLineNumbers'));
  document.getElementById('practicePassBanner').classList.remove('show');

  if (pendingPracticeAction === 'run') runPractice();
  else if (pendingPracticeAction === 'submit') submitPractice();
  pendingPracticeAction = null;
}

function activateTab(name) {
  document.querySelectorAll('.practice-output-pane .tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
}
function setPracticeConsole(text) {
  document.getElementById('practiceConsole').textContent = text;
  activateTab('output');
}

async function runPractice() {
  const editor = document.getElementById('practiceEditor');
  setStatus('Running code...');
  setPracticeConsole('> Running code...\n');
  const result = await RunnerClient.run(editor.value, { timeoutMs: 8000 });
  Paperclip.recordRun({ ...result, output: result.output, timedOut: result.timedOut, source: 'run' });
  setPracticeConsole(`> Running code...\n\n${result.output || '(no output)'}\n> ${result.timedOut ? 'Execution timed out.' : result.ok ? 'Program finished.' : 'Program stopped with an error.'}`);
  setStatus(result.timedOut ? 'Run timed out' : result.ok ? 'Run complete' : 'Run failed');
}

async function submitPractice() {
  const editor = document.getElementById('practiceEditor');
  setStatus('Testing assignment...');
  setPracticeConsole('> Running assignment tests...\n');
  ProgressStore.incrementAttempts(lesson.id);
  const result = await Grading.submit(editor.value, lesson.assignment);
  lastSubmitResult = result;
  Paperclip.recordRun({ ...result, output: result.rawOutput, source: 'submit' });

  const lines = ['> Test Results', ''];
  for (const r of result.requirementResults) lines.push(`${r.passed ? '[PASS]' : '[FAIL]'} ${r.label}`);
  lines.push(`${result.outputCheck.passed ? '[PASS]' : '[FAIL]'} ${result.outputCheck.label}`);
  lines.push(`${result.executed ? '[PASS]' : '[FAIL]'} Program executes without an exception`);
  setPracticeConsole(lines.join('\n'));

  if (result.passed) {
    ProgressStore.markComplete(lesson.id, lesson.xp);
    updateXpDisplay();
    setStatus('Assignment passed');
    const banner = document.getElementById('practicePassBanner');
    banner.classList.add('show');
  } else {
    lines.push('', result.timedOut ? result.rawOutput : 'Fix the failed requirement and submit again.');
    setPracticeConsole(lines.join('\n'));
    setStatus('Tests failed');
  }
}

// ---------- Quiz screen ----------

function renderQuizScreen() {
  quizIndex = 0;
  quizAnswered = false;
  lastQuizCorrect = true;
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const checks = lesson.checks;
  const check = checks[quizIndex];
  quizAnswered = false;
  document.getElementById('quizProgress').textContent = `Question ${quizIndex + 1} of ${checks.length}`;
  document.getElementById('quizQuestion').textContent = check.question;
  document.getElementById('quizOptions').innerHTML = check.options
    .map((opt, i) => `<label data-index="${i}"><input type="radio" name="quiz" value="${i}"> ${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}</label>`)
    .join('');
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('quizFeedback').className = 'quiz-feedback';
  const actionBtn = document.getElementById('quizActionBtn');
  actionBtn.textContent = 'Check Answer';
}

function wireQuizScreen() {
  document.getElementById('quizActionBtn').addEventListener('click', () => {
    const checks = lesson.checks;
    const check = checks[quizIndex];
    if (!quizAnswered) {
      const picked = document.querySelector('input[name=quiz]:checked');
      const feedback = document.getElementById('quizFeedback');
      if (!picked) {
        feedback.textContent = 'Choose an answer first.';
        feedback.className = 'quiz-feedback bad';
        return;
      }
      const idx = Number(picked.value);
      const good = idx === check.correctIndex;
      if (!good) lastQuizCorrect = false;
      document.querySelectorAll('#quizOptions label').forEach((label) => {
        const i = Number(label.dataset.index);
        if (i === check.correctIndex) label.classList.add('correct');
        else if (i === idx) label.classList.add('incorrect');
      });
      document.querySelectorAll('#quizOptions input').forEach((input) => (input.disabled = true));
      feedback.textContent = good ? check.feedback.correct : check.feedback.incorrect;
      feedback.className = 'quiz-feedback ' + (good ? 'good' : 'bad');
      quizAnswered = true;
      document.getElementById('quizActionBtn').textContent = quizIndex < checks.length - 1 ? 'Next Question' : 'See Results';
      return;
    }
    if (quizIndex < checks.length - 1) {
      quizIndex += 1;
      renderQuizQuestion();
    } else {
      showScreen('results');
    }
  });
}

// ---------- Results screen ----------

function renderResultsScreen() {
  const result = lastSubmitResult || { passed: true, requirementResults: [], outputCheck: { passed: true, label: '' }, executed: true };
  const banner = document.getElementById('resultsBanner');
  banner.textContent = result.passed ? 'Quest Complete' : 'Not Quite Yet';
  banner.className = 'results-banner ' + (result.passed ? 'pass' : 'fail');
  document.getElementById('resultsXp').textContent = result.passed ? `+${lesson.xp} XP earned` : 'No XP yet — pass the assignment to earn it.';

  const rows = [];
  result.requirementResults.forEach((r, i) => rows.push({ n: i + 1, pass: r.passed, label: r.label }));
  rows.push({ n: rows.length + 1, pass: result.outputCheck.passed, label: result.outputCheck.label });
  rows.push({ n: rows.length + 1, pass: result.executed, label: 'Program executes without an exception' });
  document.getElementById('resultsTable').innerHTML = rows
    .map((r) => `<tr><td>Test ${r.n}</td><td class="${r.pass ? 'pass' : 'fail'}">${r.pass ? 'PASS' : 'FAIL'}</td><td>${escapeHtml(r.label)}</td></tr>`)
    .join('');

  const didWell = rows.filter((r) => r.pass).map((r) => r.label);
  if (lastQuizCorrect) didWell.push('Answered the knowledge check correctly');
  const needsWork = rows.filter((r) => !r.pass).map((r) => r.label);
  if (!lastQuizCorrect) needsWork.push('Review the knowledge-check concept before moving on');

  document.getElementById('resultsWell').innerHTML = didWell.length
    ? didWell.map((t) => `<li>${escapeHtml(t)}</li>`).join('')
    : '<li>Nothing yet — try Submit on the Practice screen.</li>';
  document.getElementById('resultsNeedsWork').innerHTML = needsWork.length
    ? needsWork.map((t) => `<li>${escapeHtml(t)}</li>`).join('')
    : '<li>Nothing — great work!</li>';
}

function wireResultsScreen() {
  document.getElementById('retryBtn').addEventListener('click', () => showScreen('practice'));
  document.getElementById('nextLessonBtn').addEventListener('click', () => {
    setStatus('This is the newest lesson — more chapters are on the way.');
  });
  document.getElementById('backToCourseBtn').addEventListener('click', () => {
    showScreen('lesson');
    setTimeout(() => CourseDrawer.open(), 50);
  });
}

// ---------- Boot ----------

function findLessonRef(trackData, lessonId) {
  for (const ch of trackData.chapters) {
    const l = (ch.lessons || []).find((x) => x.id === lessonId);
    if (l) return { chapter: ch, lesson: l };
  }
  return null;
}

async function init() {
  setStatus('Loading lesson...');
  track = await loadJSON(CONTENT_BASE + 'track.json');
  const ref = findLessonRef(track, window.CF_LESSON_ID);
  if (!ref) {
    setStatus('Lesson not found');
    return;
  }
  chapter = ref.chapter;
  lesson = await loadJSON(CONTENT_BASE + ref.lesson.path);

  CourseDrawer.init(track, lesson.id, (newLessonId) => {
    location.search = `?lesson=${encodeURIComponent(newLessonId)}`;
  });

  renderLessonScreen();
  setupPreviewEditor();
  renderPracticeScreen();
  wireQuizScreen();
  wireResultsScreen();
  Paperclip.init(track, chapter, lesson);

  const startScreen = ['lesson', 'practice', 'quiz', 'results'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'lesson';
  showScreen(startScreen);

  document.getElementById('statusLesson').textContent = `${lesson.number} ${lesson.title}`;
  ProgressStore.touchStreak();
  updateXpDisplay();
  updateStreakDisplay();
  RunnerClient.warmup();
  setStatus('Ready');
}

init().catch((err) => {
  setStatus('Failed to load lesson');
  // eslint-disable-next-line no-console
  console.error(err);
});
