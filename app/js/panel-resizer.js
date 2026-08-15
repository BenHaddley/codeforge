// Draggable Win95-style gutters for two-column screens. The LessonWorkspace
// stores its left-column width as a percentage so it can default to a true
// 50/50 split and scale with the window.
const PanelResizer = (() => {
  function attach(resizerId, panelId, storageKey, { min = 280, max = 900, side = 'after' } = {}) {
    const resizer = document.getElementById(resizerId);
    const panel = document.getElementById(panelId);
    if (!resizer || !panel) return;
    // 'after' = panel sits to the right of the resizer (dragging right shrinks
    // it); 'before' = panel sits to the left (dragging right grows it).
    const sign = side === 'after' ? -1 : 1;

    const saved = parseInt(localStorage.getItem(storageKey) || '', 10);
    if (!Number.isNaN(saved)) panel.style.width = `${Math.max(min, Math.min(max, saved))}px`;

    let startX = 0;
    let startWidth = 0;

    function onMove(e) {
      const dx = e.clientX - startX;
      const newWidth = Math.max(min, Math.min(max, startWidth + sign * dx));
      panel.style.width = `${newWidth}px`;
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      resizer.classList.remove('dragging');
      localStorage.setItem(storageKey, parseInt(panel.style.width, 10));
    }
    resizer.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startWidth = panel.getBoundingClientRect().width;
      resizer.classList.add('dragging');
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      e.preventDefault();
    });
  }

  function attachPercent(resizerId, panelId, storageKey, { minPct = 35, maxPct = 70, defaultPct = 50 } = {}) {
    const resizer = document.getElementById(resizerId);
    const panel = document.getElementById(panelId);
    if (!resizer || !panel || !resizer.parentElement) return;

    const clamp = (pct) => Math.max(minPct, Math.min(maxPct, pct));
    const apply = (pct) => {
      const value = clamp(pct);
      panel.style.flexBasis = `${value}%`;
      panel.style.width = `${value}%`;
      return value;
    };

    const saved = parseFloat(localStorage.getItem(storageKey) || '');
    apply(Number.isFinite(saved) && saved >= minPct && saved <= maxPct ? saved : defaultPct);

    let bounds = null;
    let currentPct = defaultPct;

    function onMove(e) {
      if (!bounds || bounds.width <= 0) return;
      currentPct = apply(((e.clientX - bounds.left) / bounds.width) * 100);
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      resizer.classList.remove('dragging');
      localStorage.setItem(storageKey, String(Math.round(currentPct * 10) / 10));
    }

    resizer.addEventListener('pointerdown', (e) => {
      bounds = resizer.parentElement.getBoundingClientRect();
      currentPct = parseFloat(panel.style.flexBasis) || defaultPct;
      resizer.classList.add('dragging');
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      e.preventDefault();
    });
    resizer.addEventListener('dblclick', () => {
      currentPct = apply(defaultPct);
      localStorage.setItem(storageKey, String(defaultPct));
    });
  }

  attachPercent('lessonColResizer', 'lessonLeft', 'codeforge:panelWidth:lesson', { minPct: 35, maxPct: 70, defaultPct: 50 });

  return { attach, attachPercent };
})();
