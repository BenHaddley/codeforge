// Generic desktop-shell chrome shared by every page: clock, menu bar and
// window-control placeholders. Lesson-specific behavior lives in
// lesson-loader.js, which sets window.CF_LESSON_ID before this runs.
function tick() {
  const clock = document.getElementById('clock');
  if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
tick();
setInterval(tick, 30000);

// #courseBtn, #helpMenuBtn and .profile-btn have their own real handlers
// (course-drawer.js / lesson-loader.js) — only decorative File-style menu
// buttons land here.
document.querySelectorAll('.menubar button:not(#courseBtn):not(#helpMenuBtn):not(.profile-btn)').forEach((btn) => {
  btn.addEventListener('click', () => {
    const status = document.getElementById('statusText');
    if (status) status.textContent = `${btn.textContent} menu — not implemented in this build`;
  });
});

document.querySelectorAll('.window-controls button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const status = document.getElementById('statusText');
    if (status) status.textContent = 'Window controls are decorative in this build.';
  });
});

// Registered from every page, root-relative to wherever the page itself
// lives (app/lesson.html sits one level deeper) — both resolve to the same
// sw.js at the site root, so scope covers the whole site either way. Caches
// the Kokoro TTS download permanently and the app shell for offline use;
// see sw.js for the caching strategy.
if ('serviceWorker' in navigator) {
  const swPath = location.pathname.includes('/app/') ? '../sw.js' : 'sw.js';
  navigator.serviceWorker.register(swPath).catch(() => {});
}
