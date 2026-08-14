// App controller for the single continuous LessonWorkspace: concept,
// example, video, assignment, and the Paperclip tutor scroll together in
// the left column while the IDE (editor, Run/Submit/Hint/Solution, Output
// and Tests tabs) stays put on the right. Quiz and Results remain internal
// routes; passing the assignment opens the completion dialog instead of
// navigating away. Content is fetched from content/*.json; nothing here
// hardcodes lesson text.
const CONTENT_BASE = '../content/python-fundamentals/';
const DEFAULT_LESSON_ID = 'py-ch01-what-is-python';

const params = new URLSearchParams(location.search);
window.CF_LESSON_ID = params.get('lesson') || DEFAULT_LESSON_ID;

let track = null;
let chapter = null;
let lesson = null;
let hintIndex = 0;
let quizIndex = 0;
let quizAnswered = false;
let lastSubmitResult = null;
let lastQuizCorrect = true;

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

const SCREEN_LABELS = { lesson: null, quiz: 'Knowledge Check', results: 'Results' };

function renderBreadcrumb(screenName) {
  const parts = [track.title, chapter.title, lesson.title];
  const extra = SCREEN_LABELS[screenName];
  if (extra) parts.push(extra);
  document.getElementById('breadcrumb').innerHTML = parts
    .map((p, i) => (i === parts.length - 1 ? `<span class="current">${escapeHtml(p)}</span>` : `<span>${escapeHtml(p)}</span>`))
    .join('<span class="sep">&gt;</span>');
}

function showScreen(name) {
  if (TTS.getState() !== 'idle') {
    TTS.stop();
    resetTtsUi();
  }
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  renderBreadcrumb(name);
  location.hash = name;
  if (name === 'lesson') refreshEditor();
  if (name === 'quiz') renderQuizScreen();
  if (name === 'results') renderResultsScreen();
}

// ---------- Lesson workspace screen ----------

function renderLessonScreen() {
  document.title = `Code Forge — ${lesson.title}`;
  const src = lesson.sourceAlignment;
  // Book-companion/original(-synthesis) lessons carry a book chapter number;
  // video-companion lessons (no book coverage for the topic) carry a video
  // creator instead — render whichever attribution the lesson actually has.
  let sourceNote = '';
  if (src && src.chapter) {
    sourceNote = `<p class="source-note">Companion concept: <em>${escapeHtml(src.title)}</em>, Ch. ${escapeHtml(src.chapter)}. Code Forge text below is original.</p>`;
  } else if (src && src.creator) {
    sourceNote = `<p class="source-note">Companion concept: <em>${escapeHtml(src.title)}</em> by ${escapeHtml(src.creator)}. Code Forge text below is original.</p>`;
  }
  const paragraphs = lesson.explanation.paragraphs
    .map((p, i) => `<p class="tts-para" data-tts-index="${i}">${escapeHtml(p)}</p>`)
    .join('\n');
  const rule = lesson.explanation.rule
    ? `<div class="classic-callout tts-para" data-tts-index="${lesson.explanation.paragraphs.length}"><b>Rule of thumb:</b> ${escapeHtml(lesson.explanation.rule)}</div>`
    : '';

  // Render every example, not just the first — several lessons walk through
  // two or three distinct snippets and all of them matter.
  const exampleHtml = (lesson.examples || [])
    .map(
      (example, i) => `<div class="example-block">
         <div class="example-bar"><span>Example — ${escapeHtml(example.title)}</span>
           <button class="classic-button example-copy-btn" data-example-index="${i}">Copy</button>
         </div>
         <pre class="example-code"><code>${escapeHtml(example.code)}</code></pre>
         ${example.note ? `<p class="example-note">${escapeHtml(example.note)}</p>` : ''}
       </div>`
    )
    .join('');

  const video = lesson.videos && lesson.videos[0];
  const videoHtml = video
    ? `<div class="video-section" id="videoSection">
         <div class="video-section-bar">
           <span>Lesson Video</span>
           <button class="classic-button" id="videoToggleBtn">Hide video</button>
         </div>
         <div id="videoContainer"></div>
       </div>`
    : '';

  const a = lesson.assignment;
  const assignmentHtml = `<div class="assignment-box">
    <h2>Assignment</h2>
    <b>${escapeHtml(a.title)}</b>
    <p>${escapeHtml(a.brief)}</p>
    <ul>${a.requirements.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
  </div>`;

  document.getElementById('lessonText').innerHTML =
    sourceNote +
    `<h1>${escapeHtml(lesson.title)}</h1>` +
    paragraphs +
    rule +
    exampleHtml +
    videoHtml +
    assignmentHtml;

  if (video) CFVideoPlayer.mount(document.getElementById('videoContainer'), video);

  document.querySelectorAll('.example-copy-btn').forEach((copyBtn) => {
    copyBtn.addEventListener('click', () => {
      const code = lesson.examples[Number(copyBtn.dataset.exampleIndex)].code;
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      }).catch(() => setStatus('Could not copy — select the code manually.'));
    });
  });

  const videoToggle = document.getElementById('videoToggleBtn');
  if (videoToggle) {
    const applyVideoHidden = () => {
      const hidden = sessionStorage.getItem('codeforge:videoHidden') === '1';
      document.getElementById('videoContainer').style.display = hidden ? 'none' : '';
      videoToggle.textContent = hidden ? 'Show video' : 'Hide video';
    };
    applyVideoHidden();
    videoToggle.addEventListener('click', () => {
      const hidden = sessionStorage.getItem('codeforge:videoHidden') === '1';
      sessionStorage.setItem('codeforge:videoHidden', hidden ? '0' : '1');
      applyVideoHidden();
    });
  }

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
  toggleBtn.disabled = false; // only the brief "waiting for first audio" window disables it
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

  toggleBtn.addEventListener('click', () => {
    const state = TTS.getState();
    if (state === 'idle') {
      // The first click has to wait for the voice model (an ~90MB one-time
      // download) before any audio exists at all — TTS.getState() reports
      // 'speaking' immediately, so showing the normal pause icon here would
      // look identical to real playback with nothing audible yet. Show an
      // explicit loading state until onParagraphStart actually fires, i.e.
      // audio genuinely starts.
      toggleBtn.textContent = '⏳';
      toggleBtn.title = 'Loading voice model...';
      toggleBtn.disabled = true;
      stopBtn.hidden = false;
      setStatus('Loading voice model...');
      TTS.speak(buildTtsParagraphs(), {
        onParagraphStart: (i) => {
          toggleBtn.disabled = false;
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
          toggleBtn.disabled = false;
          resetTtsUi();
          setStatus('Narration finished');
        },
        onFailure: (message) => {
          toggleBtn.disabled = false;
          resetTtsUi();
          setStatus(message || 'Narration failed.');
        },
      });
      return;
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

// Text wrap is on in the editor (see .editor-shell textarea in editor.css),
// so a long logical line can span several visual rows — a plain 1-number-
// per-newline gutter would drift out of alignment the moment that happens.
// This hidden mirror renders each line with the textarea's exact font/
// width/padding to measure how tall it actually wraps to, so the gutter can
// give that line's number a matching-height row instead of a fixed one.
let lineMirrorEl = null;
function getLineMirror(textarea) {
  if (!lineMirrorEl) {
    lineMirrorEl = document.createElement('div');
    Object.assign(lineMirrorEl.style, {
      position: 'absolute',
      visibility: 'hidden',
      left: '-9999px',
      top: '0',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      paddingTop: '0',
      paddingBottom: '0',
      border: '0',
    });
    document.body.appendChild(lineMirrorEl);
  }
  const cs = getComputedStyle(textarea);
  Object.assign(lineMirrorEl.style, {
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight,
    letterSpacing: cs.letterSpacing,
    paddingLeft: cs.paddingLeft,
    paddingRight: cs.paddingRight,
    boxSizing: cs.boxSizing,
    tabSize: cs.tabSize,
    width: textarea.clientWidth + 'px',
  });
  return lineMirrorEl;
}

function updateLines(textarea, lineNumbersEl) {
  const mirror = getLineMirror(textarea);
  const rows = textarea.value.split('\n').map((lineText, i) => {
    mirror.textContent = lineText === '' ? ' ' : lineText;
    const height = mirror.getBoundingClientRect().height;
    return `<span style="height:${height}px">${i + 1}</span>`;
  });
  lineNumbersEl.innerHTML = rows.join('');
  lineNumbersEl.scrollTop = textarea.scrollTop;
}

function refreshEditor() {
  const editor = document.getElementById('previewEditor');
  editor.value = ProgressStore.getDraft(lesson.id, lesson.assignment.starterCode);
  updateLines(editor, document.getElementById('previewLineNumbers'));
}

// ---------- Output / Tests / Hints tabs ----------

function activateTab(name) {
  const holder = document.querySelector('.workspace-output .tabs');
  holder.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.getElementById('workspaceConsole').hidden = name !== 'output';
  document.getElementById('workspaceTests').hidden = name !== 'tests';
  document.getElementById('workspaceHints').hidden = name !== 'hints';
}

function setConsole(text) {
  const el = document.getElementById('workspaceConsole');
  el.textContent = text;
  el.scrollTop = el.scrollHeight;
  activateTab('output');
}

function renderTests(result) {
  const rows = [];
  result.requirementResults.forEach((r, i) => rows.push({ n: i + 1, pass: r.passed, label: r.label }));
  rows.push({ n: rows.length + 1, pass: result.outputCheck.passed, label: result.outputCheck.label });
  rows.push({ n: rows.length + 1, pass: result.executed, label: 'Program executes without an exception' });
  const testsEl = document.getElementById('workspaceTests');
  testsEl.innerHTML = rows
    .map((r) => `<div class="test-row ${r.pass ? 'pass' : 'fail'}"><span class="test-badge">${r.pass ? 'PASS' : 'FAIL'}</span><span>Test ${r.n} — ${escapeHtml(r.label)}</span></div>`)
    .join('');
  activateTab('tests');
}

function renderHints() {
  const hints = lesson.hints || [];
  const seen = hints.slice(0, hintIndex + 1);
  const el = document.getElementById('workspaceHints');
  el.innerHTML = seen.map((h, i) => `<div class="hint-row"><b>Hint ${i + 1}:</b> ${escapeHtml(h)}</div>`).join('') ||
    '<div class="hint-row">No hints for this lesson.</div>';
  if (hintIndex < hints.length) hintIndex += 1;
  activateTab('hints');
}

// ---------- Program input popup ----------

// Floating Win98 window (see js/win98-window.js) that collects every value
// a Run will need from input(), since the calls themselves can't be
// answered interactively mid-run. Resolves to an array of lines, or null if
// the learner cancelled (via Cancel or the window's [x]).
function promptForStdin() {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const win = Win98Window.create({
      title: 'Program Input',
      width: 360,
      bodyHtml: `
        <p>This program uses <code>input()</code>. Enter each value it will ask for, one per line, in the order your program will request them.</p>
        <textarea id="stdinPromptText" rows="4" placeholder="e.g.&#10;Ada&#10;7" aria-label="Input values, one per line"></textarea>
        <div class="win98-float-actions">
          <button type="button" class="classic-button" id="stdinPromptCancel">Cancel</button>
          <button type="button" class="classic-button" id="stdinPromptRun">Run</button>
        </div>`,
      onClose: () => finish(null),
    });

    const textarea = win.el.querySelector('#stdinPromptText');
    textarea.focus();
    win.el.querySelector('#stdinPromptCancel').addEventListener('click', () => win.close());
    win.el.querySelector('#stdinPromptRun').addEventListener('click', () => {
      finish(textarea.value.split('\n'));
      win.close();
    });
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') win.el.querySelector('#stdinPromptRun').click();
    });
  });
}

function setupWorkspace() {
  const editor = document.getElementById('previewEditor');
  const lineNumbers = document.getElementById('previewLineNumbers');
  refreshEditor();
  editor.addEventListener('input', () => {
    updateLines(editor, lineNumbers);
    ProgressStore.setDraft(lesson.id, editor.value);
  });
  // Wrapped lines can make the editor taller than its viewport; the gutter
  // has no scrollbar of its own (see .line-numbers overflow:hidden in
  // editor.css) and just follows the textarea's scroll position instead.
  editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
  });
  // Anything that changes the editor's width changes where wrapped lines
  // break, which changes their measured height — window resizes, but also
  // dragging lessonColResizer (panel-resizer.js), which a plain window
  // 'resize' listener wouldn't catch since the browser window itself never
  // resizes in that case.
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => updateLines(editor, lineNumbers)).observe(editor);
  }

  const run = async () => {
    ProgressStore.setDraft(lesson.id, editor.value);

    // input() can't block a Worker mid-run (see pyodide-worker.js), so when
    // the learner's own code calls it, collect every line it'll need up
    // front via a popup before running — otherwise skip the popup entirely,
    // so lessons that don't touch input() never see it.
    let stdinLines;
    if (/\binput\s*\(/.test(editor.value)) {
      const lines = await promptForStdin();
      if (lines === null) {
        setStatus('Run cancelled');
        return;
      }
      stdinLines = lines;
    }

    setStatus('Running code...');
    setConsole('> Running code...\n');
    const result = await RunnerClient.run(editor.value, { timeoutMs: 8000, stdinLines });
    Paperclip.recordRun({ ...result, output: result.output, timedOut: result.timedOut, source: 'run' });
    setConsole(`> Running code...\n\n${result.output || '(no output)'}\n> ${result.timedOut ? 'Execution timed out.' : result.ok ? 'Program finished.' : 'Program stopped with an error.'}`);
    setStatus(result.timedOut ? 'Run timed out' : result.ok ? 'Run complete' : 'Run failed');
  };

  const submit = async () => {
    ProgressStore.setDraft(lesson.id, editor.value);
    setStatus('Testing assignment...');
    setConsole('> Running assignment tests...\n');
    ProgressStore.incrementAttempts(lesson.id);
    const result = await Grading.submit(editor.value, lesson.assignment);
    lastSubmitResult = result;
    Paperclip.recordRun({ ...result, output: result.rawOutput, source: 'submit' });

    const lines = ['> Test Results', ''];
    for (const r of result.requirementResults) lines.push(`${r.passed ? '[PASS]' : '[FAIL]'} ${r.label}`);
    lines.push(`${result.outputCheck.passed ? '[PASS]' : '[FAIL]'} ${result.outputCheck.label}`);
    lines.push(`${result.executed ? '[PASS]' : '[FAIL]'} Program executes without an exception`);
    if (!result.passed) lines.push('', result.timedOut ? result.rawOutput : 'Fix the failed requirement and submit again.');
    setConsole(lines.join('\n'));
    renderTests(result);

    if (result.passed) {
      const { newlyCompleted, totalXp } = ProgressStore.markComplete(lesson.id, lesson.xp);
      updateXpDisplay();
      setStatus('Assignment passed');
      showCompletionDialog(newlyCompleted, totalXp);
    } else {
      setStatus('Tests failed');
    }
  };

  document.getElementById('previewRunBtn').addEventListener('click', run);
  document.getElementById('previewSubmitBtn').addEventListener('click', submit);
  document.getElementById('previewHintBtn').addEventListener('click', renderHints);
  document.getElementById('previewSolutionBtn').addEventListener('click', () => {
    if (!confirm('Load the full solution? You can still practice it afterward.')) return;
    editor.value = lesson.assignment.solutionCode;
    updateLines(editor, lineNumbers);
    ProgressStore.setDraft(lesson.id, editor.value);
    setStatus('Solution loaded');
  });

  document.querySelector('.workspace-output .tabs').addEventListener('click', (e) => {
    if (e.target.matches('button[data-tab]')) activateTab(e.target.dataset.tab);
  });
  document.getElementById('outputCollapseBtn').addEventListener('click', () => {
    const output = document.querySelector('.workspace-output');
    const collapsed = output.classList.toggle('collapsed');
    document.getElementById('outputCollapseBtn').textContent = collapsed ? 'Show' : 'Hide';
  });

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('screen-lesson').classList.contains('active')) return;
    if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  });

  // Narrow screens: Lesson | Code switcher keeps both columns alive so the
  // editor never loses state.
  const switchEl = document.getElementById('workspaceSwitch');
  if (switchEl) {
    let currentPane = 'lesson';
    const lessonLeft = document.getElementById('lessonLeft');
    const lessonRight = document.getElementById('lessonRight');
    const resizer = document.getElementById('lessonColResizer');
    const setPane = (name) => {
      currentPane = name;
      const narrow = typeof window.matchMedia === 'function' && window.matchMedia('(max-width:1050px)').matches;
      lessonLeft.style.display = !narrow || name === 'lesson' ? '' : 'none';
      lessonRight.style.display = !narrow || name === 'code' ? '' : 'none';
      if (resizer) resizer.style.display = narrow ? 'none' : '';
      switchEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.id === (name === 'lesson' ? 'wsTabLesson' : 'wsTabCode')));
    };
    document.getElementById('wsTabLesson').addEventListener('click', () => setPane('lesson'));
    document.getElementById('wsTabCode').addEventListener('click', () => setPane('code'));
    window.addEventListener('resize', () => setPane(currentPane));
    setPane(currentPane);
  }
}

// ---------- Completion dialog ----------

function showCompletionDialog(newlyCompleted, totalXp) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="completion-dialog pane" role="dialog" aria-modal="true" aria-labelledby="completionTitle">
      <div class="pane-title">Quest Complete</div>
      <div class="pane-body">
        <p id="completionTitle" class="completion-title">${escapeHtml(lesson.title)} - complete!</p>
        ${newlyCompleted ? `<p class="completion-xp">+${lesson.xp} XP earned <span class="completion-total">(${totalXp} total)</span></p>` : '<p class="completion-xp">Already completed — no additional XP.</p>'}
        <div class="completion-actions">
          ${lesson.checks && lesson.checks.length ? '<button class="classic-button" id="completionQuizBtn">Knowledge Check →</button>' : ''}
          <button class="classic-button" id="completionReviewBtn">Review</button>
          <button class="classic-button" id="completionNextBtn">Next Lesson →</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('completionReviewBtn').addEventListener('click', close);
  const quizBtn = document.getElementById('completionQuizBtn');
  if (quizBtn) quizBtn.addEventListener('click', () => { close(); showScreen('quiz'); });
  const nextBtn = document.getElementById('completionNextBtn');
  nextBtn.addEventListener('click', () => {
    if (lesson.nextLessonId) {
      location.search = `?lesson=${encodeURIComponent(lesson.nextLessonId)}`;
    } else {
      close();
      setStatus('This is the newest lesson — more chapters are on the way.');
    }
  });
  nextBtn.focus();
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
    : '<li>Nothing yet — try Submit in the workspace.</li>';
  document.getElementById('resultsNeedsWork').innerHTML = needsWork.length
    ? needsWork.map((t) => `<li>${escapeHtml(t)}</li>`).join('')
    : '<li>Nothing — great work!</li>';
}

function wireResultsScreen() {
  document.getElementById('retryBtn').addEventListener('click', () => showScreen('lesson'));
  document.getElementById('nextLessonBtn').addEventListener('click', () => {
    if (lesson.nextLessonId) {
      location.search = `?lesson=${encodeURIComponent(lesson.nextLessonId)}`;
    } else {
      setStatus('This is the newest lesson — more chapters are on the way.');
    }
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
  // Fire first, before anything else: this is a large (~90MB), lesson-
  // independent download, so starting it before the (small, fast) lesson
  // JSON fetches lets it run the whole time the learner is reading rather
  // than only after page setup finishes.
  TTS.warmup((p) => {
    if (p && p.status === 'progress' && typeof p.progress === 'number') {
      setStatus(`Downloading voice model... ${Math.round(p.progress)}%`);
    }
  });
  track = await loadJSON(CONTENT_BASE + 'track.json');
  const ref = findLessonRef(track, window.CF_LESSON_ID);
  if (!ref) {
    setStatus('Lesson not found');
    return;
  }
  chapter = ref.chapter;
  lesson = await loadJSON(CONTENT_BASE + ref.lesson.path);
  ProgressStore.touchLesson(lesson.id);

  CourseDrawer.init(track, lesson.id, (newLessonId) => {
    location.search = `?lesson=${encodeURIComponent(newLessonId)}`;
  });

  renderLessonScreen();
  setupWorkspace();
  wireQuizScreen();
  wireResultsScreen();
  Paperclip.init(track, chapter, lesson);

  const startScreen = ['lesson', 'quiz', 'results'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'lesson';
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
