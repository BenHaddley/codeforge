// The "Course" button in the top bar opens this as a temporary slide-in
// panel rather than a permanently-docked sidebar — see wiki/04-LessonPlayer.md.
const CourseDrawer = (() => {
  // No server-side track discovery on a static site, so the switcher's
  // options are just listed here — add a line when a new track.json lands.
  const AVAILABLE_TRACKS = [
    { id: 'python-fundamentals', title: 'Python Fundamentals' },
    { id: 'javascript-fundamentals', title: 'JavaScript Fundamentals' },
  ];

  let track = null;
  let currentLessonId = null;
  // Which chapter folder is open. Independent of currentLessonId so the
  // learner can expand and browse any chapter, not just the one they're
  // currently in — previously only the current chapter's folder was ever
  // wired to click at all, so every other chapter (all 15, now that the
  // full course exists) was inert and unreachable from the drawer.
  let expandedChapterId = null;
  let onSelect = null;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderTrackSelect() {
    const select = document.getElementById('drawerTrackSelect');
    if (!select) return;
    select.innerHTML = AVAILABLE_TRACKS
      .map((t) => `<option value="${escapeHtml(t.id)}"${t.id === track.id ? ' selected' : ''}>${escapeHtml(t.title)}</option>`)
      .join('');
  }

  function render() {
    const el = document.getElementById('drawerTree');
    el.innerHTML = track.chapters
      .map((ch) => {
        const hasContent = (ch.lessons || []).length > 0;
        const isExpanded = ch.id === expandedChapterId;
        const folderRow = `<div class="tree-row clickable${isExpanded ? ' selected' : ''}" data-chapter="${ch.id}">
          ${isExpanded ? '⊟' : '⊞'} 📁 <span>${ch.number}. ${escapeHtml(ch.title)}</span>
        </div>`;
        if (!isExpanded) return folderRow;
        const children = hasContent
          ? (ch.lessons || [])
              .map((l) => `<div class="tree-row clickable${l.id === currentLessonId ? ' current' : ''}" data-lesson="${l.id}">📄 <span>${l.number} ${escapeHtml(l.title)}</span></div>`)
              .join('')
          : '<div class="tree-row">No published lessons yet.</div>';
        return folderRow + `<div class="tree-children">${children}</div>`;
      })
      .join('');

    el.querySelectorAll('[data-lesson]').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-lesson');
        close();
        if (id !== currentLessonId && onSelect) onSelect(id);
      });
    });
    el.querySelectorAll('[data-chapter]').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-chapter');
        expandedChapterId = expandedChapterId === id ? null : id;
        render();
      });
    });
  }

  function open() {
    document.getElementById('courseDrawer').classList.add('open');
    document.getElementById('drawerBackdrop').classList.add('open');
  }
  function close() {
    document.getElementById('courseDrawer').classList.remove('open');
    document.getElementById('drawerBackdrop').classList.remove('open');
  }

  function init(trackData, lessonId, selectHandler) {
    track = trackData;
    currentLessonId = lessonId;
    const currentChapter = track.chapters.find((ch) => (ch.lessons || []).some((l) => l.id === lessonId));
    expandedChapterId = currentChapter ? currentChapter.id : null;
    onSelect = selectHandler;
    renderTrackSelect();
    render();
    const trackSelect = document.getElementById('drawerTrackSelect');
    if (trackSelect) {
      trackSelect.addEventListener('change', () => {
        if (trackSelect.value === track.id) return;
        close();
        location.search = `?track=${encodeURIComponent(trackSelect.value)}`;
      });
    }
    document.getElementById('courseBtn').addEventListener('click', open);
    document.getElementById('drawerCloseBtn').addEventListener('click', close);
    document.getElementById('drawerBackdrop').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  return { init, open, close };
})();
