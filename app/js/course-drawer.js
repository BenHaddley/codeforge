// The "Course" button in the top bar opens this as a temporary slide-in
// panel rather than a permanently-docked sidebar — see wiki/04-LessonPlayer.md.
const CourseDrawer = (() => {
  let track = null;
  let currentLessonId = null;
  let onSelect = null;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    const el = document.getElementById('drawerTree');
    el.innerHTML = track.chapters
      .map((ch) => {
        const hasContent = (ch.lessons || []).length > 0;
        const isCurrentChapter = (ch.lessons || []).some((l) => l.id === currentLessonId);
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
        close();
        if (id !== currentLessonId && onSelect) onSelect(id);
      });
    });
    el.querySelectorAll('.tree-row.clickable:not([data-lesson])').forEach((row) => {
      row.addEventListener('click', () => {
        const status = document.getElementById('statusText');
        if (status) status.textContent = 'That chapter has no published lessons yet.';
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
    onSelect = selectHandler;
    render();
    document.getElementById('courseBtn').addEventListener('click', open);
    document.getElementById('drawerCloseBtn').addEventListener('click', close);
    document.getElementById('drawerBackdrop').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  return { init, open, close };
})();
