// Client-side search across every lesson's title, objective, explanation
// text, and assignment brief. No server involved: the index is built by
// fetching the same content/*.json files the homepage and lesson workspace
// already use, once, the first time the learner types into the search box.
const LessonSearch = (() => {
  const TRACKS = [
    { id: 'python-fundamentals', contentBase: 'content/python-fundamentals/' },
    { id: 'javascript-fundamentals', contentBase: 'content/javascript-fundamentals/' },
  ];
  const MAX_RESULTS = 15;
  let indexPromise = null;

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  async function loadTrackEntries(track) {
    const data = await loadJSON(`${track.contentBase}track.json`);
    const entries = [];
    data.chapters.forEach((chapter) => {
      (chapter.lessons || []).forEach((lesson) => {
        entries.push({
          trackId: track.id,
          trackTitle: data.title,
          chapterTitle: chapter.title,
          lessonId: lesson.id,
          number: lesson.number,
          title: lesson.title,
          path: `${track.contentBase}${lesson.path}`,
        });
      });
    });
    return entries;
  }

  async function withBodyText(entry) {
    try {
      const lesson = await loadJSON(entry.path);
      const bodyParts = [
        lesson.objective,
        ...((lesson.explanation && lesson.explanation.paragraphs) || []),
        lesson.assignment && lesson.assignment.brief,
      ].filter(Boolean);
      entry.searchText = `${entry.title} ${entry.chapterTitle} ${entry.trackTitle} ${bodyParts.join(' ')}`.toLowerCase();
    } catch {
      entry.searchText = `${entry.title} ${entry.chapterTitle} ${entry.trackTitle}`.toLowerCase();
    }
    return entry;
  }

  function buildIndex() {
    if (!indexPromise) {
      indexPromise = Promise.all(TRACKS.map(loadTrackEntries))
        .then((perTrack) => perTrack.flat())
        .then((entries) => Promise.all(entries.map(withBodyText)));
    }
    return indexPromise;
  }

  async function search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const index = await buildIndex();
    return index.filter((entry) => entry.searchText.includes(q)).slice(0, MAX_RESULTS);
  }

  function lessonRoute(entry) {
    return `app/lesson.html?track=${encodeURIComponent(entry.trackId)}&lesson=${encodeURIComponent(entry.lessonId)}`;
  }

  return { search, lessonRoute, buildIndex };
})();

(function wireLessonSearch() {
  const input = document.getElementById('lessonSearchInput');
  const results = document.getElementById('lessonSearchResults');
  if (!input || !results) return;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderResults(entries, query) {
    if (!query.trim()) {
      results.innerHTML = '';
      results.hidden = true;
      return;
    }
    results.hidden = false;
    if (!entries.length) {
      results.innerHTML = `<div class="win95-list-row"><span class="win95-list-title">No lessons match "${escapeHtml(query)}".</span></div>`;
      return;
    }
    results.innerHTML = entries.map((entry) => `
      <a class="win95-list-row" href="${LessonSearch.lessonRoute(entry)}">
        <span class="win95-list-icon">📖</span>
        <span class="win95-list-title">${escapeHtml(entry.title)}</span>
        <span class="win95-list-state">${escapeHtml(entry.trackTitle)} · ${escapeHtml(entry.number)}</span>
      </a>
    `).join('');
  }

  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = input.value;
    debounceTimer = setTimeout(async () => {
      const entries = await LessonSearch.search(query);
      if (input.value === query) renderResults(entries, query);
    }, 150);
  });

  input.addEventListener('focus', () => LessonSearch.buildIndex());
  document.addEventListener('click', (e) => {
    if (!results.contains(e.target) && e.target !== input) results.hidden = true;
  });
})();
