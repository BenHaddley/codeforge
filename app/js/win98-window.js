// A floating, draggable Win98-style window for one-off GUI popups (like the
// stdin prompt). Deliberately minimal chrome: a titlebar the learner can
// drag by, and exactly one control — the [x] close button. No minimize, no
// maximize, matching the classic single-purpose Win98 dialog rather than a
// full app-window (see .app-window / .titlebar in win98.css for the
// docked-window equivalent with the fuller control set).
const Win98Window = (() => {
  let openCount = 0;

  function create({ title, bodyHtml, onClose, width = 380 } = {}) {
    const win = document.createElement('div');
    win.className = 'win98-float-window';
    win.style.width = width + 'px';
    // Cascade each new window slightly so stacked popups stay visible instead
    // of hiding directly on top of one another.
    const cascade = (openCount++ % 6) * 24;
    win.style.left = `calc(50% - ${width / 2}px + ${cascade}px)`;
    win.style.top = `${96 + cascade}px`;

    win.innerHTML =
      '<div class="win98-float-titlebar">' +
      `<span class="win98-float-title"></span>` +
      '<button type="button" class="win98-float-close" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="win98-float-body"></div>';
    win.querySelector('.win98-float-title').textContent = title || '';
    win.querySelector('.win98-float-body').innerHTML = bodyHtml || '';

    document.body.appendChild(win);

    const titlebar = win.querySelector('.win98-float-titlebar');
    const closeBtn = win.querySelector('.win98-float-close');
    let closed = false;

    function close() {
      if (closed) return;
      closed = true;
      win.remove();
      if (onClose) onClose();
    }

    closeBtn.addEventListener('click', close);

    titlebar.addEventListener('mousedown', (e) => {
      if (e.target === closeBtn) return;
      const rect = win.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      win.style.left = rect.left + 'px';
      win.style.top = rect.top + 'px';
      win.classList.add('dragging');

      function onMove(moveEvent) {
        const maxX = window.innerWidth - win.offsetWidth;
        const maxY = window.innerHeight - win.offsetHeight;
        const nx = Math.max(0, Math.min(maxX, moveEvent.clientX - offsetX));
        const ny = Math.max(0, Math.min(maxY, moveEvent.clientY - offsetY));
        win.style.left = nx + 'px';
        win.style.top = ny + 'px';
      }
      function onUp() {
        win.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.preventDefault();
    });

    return { el: win, close };
  }

  return { create };
})();
