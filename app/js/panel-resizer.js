// Draggable Win95-style gutters for the two-column screens. Each resizer
// controls the width of whichever panel is passed as `panel` — width is
// persisted per screen so a learner's preferred split survives reload.
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

  attach('lessonColResizer', 'lessonRight', 'codeforge:panelWidth:lesson', { min: 320, max: 900, side: 'after' });
  attach('practiceColResizer', 'practiceLeft', 'codeforge:panelWidth:practice', { min: 260, max: 720, side: 'before' });

  return { attach };
})();
