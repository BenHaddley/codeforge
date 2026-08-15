// Reveals a "View Certificate" link on each quests.html track card once
// every lesson in that track is complete. Mirrors the same completion
// check used by certificate.html and the homepage's Featured Course pane.
(function wireQuestCertificates() {
  const links = document.querySelectorAll('.track-cert-link[data-track]');
  if (!links.length) return;

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  links.forEach(async (link) => {
    const trackId = link.dataset.track;
    try {
      const data = await loadJSON(`content/${trackId}/track.json`);
      const lessons = [];
      data.chapters.forEach((chapter) => (chapter.lessons || []).forEach((l) => lessons.push(l)));
      const complete = lessons.length > 0 && lessons.every((l) => ProgressStore.isComplete(l.id));
      link.hidden = !complete;
    } catch {
      link.hidden = true;
    }
  });
})();
