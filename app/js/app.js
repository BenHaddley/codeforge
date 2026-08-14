// Generic desktop-shell chrome shared by every page: clock, menu bar and
// window-control placeholders. Lesson-specific behavior lives in
// lesson-loader.js, which sets window.CF_LESSON_ID before this runs.
function tick() {
  const clock = document.getElementById('clock');
  if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
tick();
setInterval(tick, 30000);

document.querySelectorAll('.menubar button').forEach((btn) => {
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
