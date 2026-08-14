// Loads track.json + a lesson.json and renders the lesson workspace. This
// is the boundary the blueprint calls out: content is data, this file is
// the only thing that knows how to turn that data into the lesson pane,
// video pane, quiz, editor and IDE wiring.
const CONTENT_BASE = '../content/python-fundamentals/';
const DEFAULT_LESSON_ID = 'py-ch07-while-loops';

const params = new URLSearchParams(location.search);
window.CF_LESSON_ID = params.get('lesson') || DEFAULT_LESSON_ID;

let hintIndex = 0;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function findLessonRef(track, lessonId) {
  for (const chapter of track.chapters) {
    const lesson = (chapter.lessons || []).find((l) => l.id === lessonId);
    if (lesson) return { chapter, lesson };
  }
  return null;
}

function renderTree(track, currentChapterId, currentLessonId) {
  const el = document.getElementById('lessonTree');
  el.innerHTML = track.chapters
    .map((ch) => {
      const isCurrentChapter = ch.id === currentChapterId;
      const hasContent = (ch.lessons || []).length > 0;
      const folderRow = `<div class="tree-row${isCurrentChapter ? ' selected' : ''}${hasContent ? '' : ' clickable'}" data-chapter="${ch.id}">
        ${isCurrentChapter ? '⊟' : '⊞'} 📁 <span>${ch.number}. ${escapeHtml(ch.title)}</span>
      </div>`;
      if (!isCurrentChapter) return folderRow;
      const children = (ch.lessons || [])
        .map((l) => `<div class="tree-row clickable${l.id === currentLessonId ? ' current' : ''}" data-lesson="${l.id}">📄 <span>${l.number} ${escapeHtml(l.title)}</span></div>`)
        .join('');
      return folderRow + `<div class="tree-children">${children}</div>`;
    })
    .join('');

  el.querySelectorAll('[data-lesson]').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-lesson');
      if (id !== currentLessonId) location.search = `?lesson=${encodeURIComponent(id)}`;
    });
  });
  el.querySelectorAll('.tree-row.clickable:not([data-lesson])').forEach((row) => {
    row.addEventListener('click', () => setStatus('That chapter has no published lessons yet.'));
  });
}

function renderProgress(track, currentChapter) {
  const el = document.getElementById('progressSegbar');
  const total = track.chapters.length;
  const currentIndex = track.chapters.findIndex((c) => c.id === currentChapter.id);
  el.innerHTML = track.chapters
    .map((_, i) => `<i class="${i < currentIndex ? 'filled' : i === currentIndex ? 'active' : ''}"></i>`)
    .join('');
  document.getElementById('progressChapter').textContent = `Chapter ${currentChapter.number}`;
  document.getElementById('progressPercent').textContent = `${Math.round(((currentIndex + 1) / total) * 100)}%`;
}

function renderLesson(lesson) {
  document.title = `Code Forge — ${lesson.title}`;
  document.getElementById('lessonPaneTitle').textContent = `${lesson.number} Lesson: ${lesson.title}`;

  const src = lesson.sourceAlignment;
  const sourceNote = src
    ? `<p class="source-note">Companion concept: <em>${escapeHtml(src.title)}</em>, Ch. ${escapeHtml(src.chapter)}. Code Forge text below is original.</p>`
    : '';

  const paragraphs = lesson.explanation.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
  const rule = lesson.explanation.rule
    ? `<div class="classic-callout"><b>Rule of thumb:</b> ${escapeHtml(lesson.explanation.rule)}</div>`
    : '';

  const example = lesson.examples[0];
  const exampleHtml = example
    ? `<h2>Example</h2>
       <pre><code>${escapeHtml(example.code)}</code></pre>
       ${example.note ? `<p>${escapeHtml(example.note)}</p>` : ''}
       <button class="classic-button" id="loadExampleBtn">Load Example into IDE</button>`
    : '';

  const a = lesson.assignment;
  const assignmentHtml = `
    <h2>Assignment</h2>
    <div class="assignment-box">
      <b>${escapeHtml(a.title)}</b>
      <p>${escapeHtml(a.brief)}</p>
      <ul>${a.requirements.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
    </div>`;

  document.getElementById('lessonText').innerHTML = sourceNote + `<h1>${escapeHtml(lesson.title)}</h1>` + paragraphs + rule + exampleHtml + assignmentHtml;

  const loadBtn = document.getElementById('loadExampleBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const editor = document.getElementById('editor');
      if (editor.value.trim() && editor.value !== a.starterCode && !confirm('Replace your current editor contents with the example?')) return;
      editor.value = example.code + '\n';
      editor.dispatchEvent(new Event('input'));
      setStatus('Example loaded');
    });
  }
}

function renderVideo(lesson) {
  const container = document.getElementById('videoContainer');
  const info = Video.render(container, lesson.videos);
  document.getElementById('videoPaneLabel').textContent = info ? info.label : 'No video';
}

function renderQuiz(lesson) {
  const check = lesson.checks[0];
  const el = document.getElementById('quizPane');
  if (!check) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <div class="quiz-title">📋 <strong>Test Your Understanding</strong></div>
    <p>${escapeHtml(check.question)}</p>
    ${check.options.map((opt, i) => `<label><input type="radio" name="quiz" value="${i}"> ${String.fromCharCode(65 + i)}. ${escapeHtml(opt)}</label>`).join('')}
    <button class="classic-button" id="quizBtn">Submit Answer</button>
    <span id="quizResult" class="quiz-result" role="status"></span>`;

  document.getElementById('quizBtn').addEventListener('click', () => {
    const picked = document.querySelector('input[name=quiz]:checked');
    const out = document.getElementById('quizResult');
    if (!picked) {
      out.textContent = 'Choose an answer first.';
      out.className = 'quiz-result bad';
      return;
    }
    const good = Number(picked.value) === check.correctIndex;
    out.textContent = good ? check.feedback.correct : check.feedback.incorrect;
    out.className = 'quiz-result ' + (good ? 'good' : 'bad');
  });
}

function setStatus(text) {
  document.getElementById('statusText').textContent = text;
}
function setConsole(text) {
  document.getElementById('console').textContent = text;
}

function setupEditor(lesson) {
  const editor = document.getElementById('editor');
  const lineNumbers = document.getElementById('lineNumbers');

  function updateLines() {
    const count = editor.value.split('\n').length;
    lineNumbers.textContent = Array.from({ length: count }, (_, i) => i + 1).join('\n');
  }

  editor.value = ProgressStore.getDraft(lesson.id, lesson.assignment.starterCode);
  updateLines();
  editor.addEventListener('input', () => {
    updateLines();
    ProgressStore.setDraft(lesson.id, editor.value);
  });

  return { editor, updateLines };
}

function wireHintsAndSolution(lesson) {
  document.getElementById('hintBtn').addEventListener('click', () => {
    const hints = lesson.hints;
    setConsole(hints[Math.min(hintIndex, hints.length - 1)] + '\n\nUse Submit when you want the tests to check your assignment.');
    hintIndex = Math.min(hintIndex + 1, hints.length - 1);
    setStatus('Hint shown');
  });
  document.getElementById('solutionBtn').addEventListener('click', () => {
    if (!confirm('Show the full solution? You can still complete the lesson afterward.')) return;
    const editor = document.getElementById('editor');
    editor.value = lesson.assignment.solutionCode;
    editor.dispatchEvent(new Event('input'));
    setStatus('Solution loaded');
  });
}

function wireListen(lesson) {
  document.getElementById('listenBtn').addEventListener('click', () => {
    const text = lesson.explanation.paragraphs.join(' ') + (lesson.explanation.rule ? ' ' + lesson.explanation.rule : '');
    const state = TTS.toggle(text, () => setStatus('Narration finished'));
    if (state === 'speaking') setStatus('Reading lesson aloud...');
    if (state === 'stopped') setStatus('Narration stopped');
  });
}

function wireNotes(lesson) {
  const dlg = document.getElementById('notesDialog');
  document.getElementById('notesBtn').addEventListener('click', () => {
    document.getElementById('notesArea').value = ProgressStore.getNotes(lesson.id);
    dlg.showModal();
  });
  document.getElementById('saveNotesBtn').addEventListener('click', () => {
    ProgressStore.setNotes(lesson.id, document.getElementById('notesArea').value);
    setStatus('Notes saved');
  });
}

function updateXpDisplay() {
  document.getElementById('xp').textContent = ProgressStore.getTotalXp();
}

async function runCode(editor) {
  setStatus('Running code...');
  setConsole('> Running code...\n');
  const result = await RunnerClient.run(editor.value, { timeoutMs: 8000 });
  setConsole(`> Running code...\n\n${result.output || '(no output)'}\n> ${result.timedOut ? 'Execution timed out.' : result.ok ? 'Program finished.' : 'Program stopped with an error.'}`);
  setStatus(result.timedOut ? 'Run timed out' : result.ok ? 'Run complete' : 'Run failed');
}

async function submitCode(lesson, editor) {
  setStatus('Testing assignment...');
  setConsole('> Running assignment tests...\n');
  ProgressStore.incrementAttempts(lesson.id);
  const result = await Grading.submit(editor.value, lesson.assignment);

  const lines = ['> Test Results', ''];
  for (const r of result.requirementResults) {
    lines.push(`${r.passed ? '[PASS]' : '[FAIL]'} ${r.label}`);
  }
  lines.push(`${result.outputCheck.passed ? '[PASS]' : '[FAIL]'} ${result.outputCheck.label}`);
  lines.push(`${result.executed ? '[PASS]' : '[FAIL]'} Program executes without an exception`);

  if (result.passed) {
    const { newlyCompleted, totalXp } = ProgressStore.markComplete(lesson.id, lesson.xp);
    lines.push('', `*** QUEST COMPLETE${newlyCompleted ? ` — +${lesson.xp} XP` : ''} ***`);
    updateXpDisplay();
    setStatus('Assignment passed');
  } else {
    lines.push('', result.timedOut ? result.rawOutput : 'Fix the failed requirement and submit again.');
    setStatus('Tests failed');
  }
  setConsole(lines.join('\n'));
}

async function init() {
  setStatus('Loading lesson...');
  const track = await loadJSON(CONTENT_BASE + 'track.json');
  const ref = findLessonRef(track, window.CF_LESSON_ID);
  if (!ref) {
    setStatus('Lesson not found');
    setConsole(`> No lesson with id "${window.CF_LESSON_ID}" was found in this track.`);
    return;
  }
  const lesson = await loadJSON(CONTENT_BASE + ref.lesson.path);

  renderTree(track, ref.chapter.id, lesson.id);
  renderProgress(track, ref.chapter);
  renderLesson(lesson);
  renderVideo(lesson);
  renderQuiz(lesson);
  updateXpDisplay();

  const { editor } = setupEditor(lesson);
  wireHintsAndSolution(lesson);
  wireListen(lesson);
  wireNotes(lesson);

  document.getElementById('runBtn').addEventListener('click', () => runCode(editor));
  document.getElementById('submitBtn').addEventListener('click', () => submitCode(lesson, editor));
  RunnerClient.warmup();

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      submitCode(lesson, editor);
    } else if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      runCode(editor);
    }
  });

  setConsole('> Code Forge Python runtime ready on first Run.\n\n> Tip: Ctrl+Enter runs your code. Ctrl+Shift+Enter submits.');
  setStatus(ProgressStore.isComplete(lesson.id) ? 'Ready — lesson already completed' : 'Ready');
}

init().catch((err) => {
  setStatus('Failed to load lesson');
  setConsole('> ' + err);
});
