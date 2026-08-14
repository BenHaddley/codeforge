// Renders a lesson's optional reinforcement clip via the provider's own
// embed player. Never rehosts video — see docs/12-copyright-source-boundaries.md.
const Video = (() => {
  function render(container, videos) {
    const clip = videos && videos[0];
    if (!clip) {
      container.innerHTML = '<div class="video-empty">No video for this lesson.</div>';
      return;
    }
    const startMin = Math.floor(clip.startSeconds / 60);
    const startSec = String(clip.startSeconds % 60).padStart(2, '0');
    const endMin = Math.floor(clip.endSeconds / 60);
    const endSec = String(clip.endSeconds % 60).padStart(2, '0');
    container.innerHTML = `
      <div class="video-wrap">
        <iframe src="${clip.embedUrl}" title="${escapeHtml(clip.creator)} — ${escapeHtml(clip.title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen></iframe>
      </div>`;
    return { label: `${clip.creator} — ${startMin}:${startSec} → ${endMin}:${endSec}` };
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  return { render };
})();
