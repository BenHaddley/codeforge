// Standalone completion certificate. Reads ?track=<id>, checks every lesson
// in that track against ProgressStore, and — only once every lesson is
// complete — renders a printable certificate sheet (app/css/certificate.css
// supplies the @media print rules that hide the app chrome).
(function certificatePage() {
  const TRACKS = {
    'python-fundamentals': { contentBase: 'content/python-fundamentals/' },
    'javascript-fundamentals': { contentBase: 'content/javascript-fundamentals/' },
  };
  const NAME_KEY = 'codeforge:learnerName';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  function setStatus(html) {
    document.getElementById('certificateStatus').innerHTML = html;
  }

  async function init() {
    const params = new URLSearchParams(location.search);
    const trackId = params.get('track');
    const track = TRACKS[trackId];

    if (!track) {
      setStatus(`
        <h1>Completion Certificate</h1>
        <p>Choose a track to check your certificate eligibility:</p>
        <ul>
          <li><a href="certificate.html?track=python-fundamentals">Python Fundamentals</a></li>
          <li><a href="certificate.html?track=javascript-fundamentals">JavaScript Fundamentals</a></li>
        </ul>
      `);
      return;
    }

    let data;
    try {
      data = await loadJSON(`${track.contentBase}track.json`);
    } catch {
      setStatus('<h1>Completion Certificate</h1><p>Could not load that track.</p>');
      return;
    }

    const lessons = [];
    data.chapters.forEach((chapter) => (chapter.lessons || []).forEach((l) => lessons.push(l)));
    const completed = lessons.filter((l) => ProgressStore.isComplete(l.id));

    if (!lessons.length || completed.length < lessons.length) {
      setStatus(`
        <h1>Completion Certificate</h1>
        <p><b>${escapeHtml(data.title)}</b>: ${completed.length} of ${lessons.length} lessons complete.</p>
        <p>Finish every lesson in this track to unlock a printable certificate.</p>
        <p><a href="quests.html">View the course map</a></p>
      `);
      return;
    }

    const completedAt = Math.max(0, ...lessons.map((l) => ProgressStore.getCompletedAt(l.id)));
    const lessonDetails = await Promise.all(
      lessons.map((l) => loadJSON(`${track.contentBase}${l.path}`).catch(() => null))
    );
    const trackXp = lessonDetails.reduce((sum, l) => sum + (l && l.xp ? l.xp : 0), 0);

    document.querySelector('.desktop').hidden = true;
    const sheet = document.getElementById('certificateSheet');
    const controls = document.getElementById('certificateControls');
    sheet.hidden = false;
    controls.hidden = false;

    document.getElementById('certTrack').textContent = data.title;
    document.getElementById('certLessonCount').textContent = `${lessons.length} lessons completed`;
    document.getElementById('certXp').textContent = `${trackXp.toLocaleString()} XP earned`;
    document.getElementById('certDate').textContent = completedAt
      ? new Date(completedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    const nameInput = document.getElementById('learnerNameInput');
    const certName = document.getElementById('certName');
    const savedName = localStorage.getItem(NAME_KEY) || '';
    nameInput.value = savedName;
    certName.textContent = savedName || 'Your Name Here';
    nameInput.addEventListener('input', () => {
      localStorage.setItem(NAME_KEY, nameInput.value);
      certName.textContent = nameInput.value.trim() || 'Your Name Here';
    });

    document.getElementById('printCertBtn').addEventListener('click', () => window.print());
  }

  init();
})();
