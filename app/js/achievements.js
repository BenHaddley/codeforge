// Badge/achievement system, computed entirely from ProgressStore state and
// content/*.json track data — no server, no separate progress model. Badges
// are re-derived on demand rather than stored, so there's nothing to keep
// in sync; only the "seen" set (for new-badge callouts) is persisted.
const Achievements = (() => {
  // Loaded from both the root (index.html) and app/lesson.html, which sit
  // at different depths relative to content/ — adjust the prefix so a
  // single script works from either.
  const ROOT_PREFIX = location.pathname.includes('/app/') ? '../' : '';
  const TRACKS = [
    { id: 'python-fundamentals', contentBase: `${ROOT_PREFIX}content/python-fundamentals/` },
    { id: 'javascript-fundamentals', contentBase: `${ROOT_PREFIX}content/javascript-fundamentals/` },
  ];
  const SEEN_KEY = 'codeforge:achievements:seen';

  const DEFS = [
    { id: 'first-light', icon: '🔥', title: 'First Light', desc: 'Complete your first lesson.', check: (s) => s.totalCompleted >= 1 },
    { id: 'warming-up', icon: '⚒', title: 'Getting Warmed Up', desc: 'Complete 5 lessons.', check: (s) => s.totalCompleted >= 5 },
    { id: 'halfway', icon: '🛠', title: 'Halfway to the Anvil', desc: 'Complete 25 lessons.', check: (s) => s.totalCompleted >= 25 },
    { id: 'chapter-complete', icon: '📖', title: 'Chapter Closer', desc: 'Finish every lesson in a chapter.', check: (s) => s.chapterComplete },
    { id: 'track-complete', icon: '🏆', title: 'Master Smith', desc: 'Complete every lesson in a track.', check: (s) => s.trackComplete },
    { id: 'two-language', icon: '🌐', title: 'Two-Language Forge', desc: 'Complete a lesson in both Python and JavaScript.', check: (s) => s.tracksTouched >= 2 },
    { id: 'streak-3', icon: '📅', title: '3-Day Streak', desc: 'Return 3 days in a row.', check: (s) => s.streak >= 3 },
    { id: 'streak-7', icon: '🗓', title: 'Week-Long Forge', desc: 'Return 7 days in a row.', check: (s) => s.streak >= 7 },
    { id: 'xp-500', icon: '⭐', title: 'XP: 500', desc: 'Earn 500 XP.', check: (s) => s.xp >= 500 },
    { id: 'xp-1500', icon: '🌟', title: 'XP: 1500', desc: 'Earn 1500 XP.', check: (s) => s.xp >= 1500 },
  ];

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  async function computeStats() {
    const xp = ProgressStore.getTotalXp();
    const streak = ProgressStore.getStreak();
    let totalCompleted = 0;
    let chapterComplete = false;
    let trackComplete = false;
    let tracksTouched = 0;

    const trackData = await Promise.all(TRACKS.map((t) => loadJSON(`${t.contentBase}track.json`)));
    trackData.forEach((data) => {
      let trackLessons = 0;
      let trackCompleted = 0;
      data.chapters.forEach((chapter) => {
        const chapterLessons = chapter.lessons || [];
        const chapterCompleted = chapterLessons.filter((l) => ProgressStore.isComplete(l.id)).length;
        trackLessons += chapterLessons.length;
        trackCompleted += chapterCompleted;
        totalCompleted += chapterCompleted;
        if (chapterLessons.length > 0 && chapterCompleted === chapterLessons.length) chapterComplete = true;
      });
      if (trackLessons > 0 && trackCompleted === trackLessons) trackComplete = true;
      if (trackCompleted > 0) tracksTouched += 1;
    });

    return { xp, streak, totalCompleted, chapterComplete, trackComplete, tracksTouched };
  }

  async function getAll() {
    const stats = await computeStats();
    return DEFS.map((d) => ({ ...d, earned: d.check(stats) }));
  }

  function getSeen() {
    try {
      return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
    } catch {
      return new Set();
    }
  }

  function markSeen(ids) {
    const seen = getSeen();
    ids.forEach((id) => seen.add(id));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  }

  // Returns badges earned but not yet marked seen, then marks them seen.
  // Call this right after a lesson completes to surface "new badge" callouts.
  async function checkForNew() {
    const all = await getAll();
    const seen = getSeen();
    const earned = all.filter((b) => b.earned);
    const fresh = earned.filter((b) => !seen.has(b.id));
    markSeen(earned.map((b) => b.id));
    return fresh;
  }

  return { getAll, checkForNew, DEFS };
})();
