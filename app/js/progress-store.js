// Thin localStorage wrapper keyed by lesson id. Keeps drafts, notes, XP and
// completion state separate from lesson content and UI rendering.
const ProgressStore = (() => {
  const key = (lessonId, field) => `codeforge:lesson:${lessonId}:${field}`;

  function getDraft(lessonId, fallback) {
    return localStorage.getItem(key(lessonId, 'draft')) ?? fallback;
  }
  function setDraft(lessonId, code) {
    localStorage.setItem(key(lessonId, 'draft'), code);
  }
  function getNotes(lessonId) {
    return localStorage.getItem(key(lessonId, 'notes')) || '';
  }
  function setNotes(lessonId, text) {
    localStorage.setItem(key(lessonId, 'notes'), text);
  }
  function isComplete(lessonId) {
    return localStorage.getItem(key(lessonId, 'complete')) === '1';
  }
  function incrementAttempts(lessonId) {
    const n = parseInt(localStorage.getItem(key(lessonId, 'attempts')) || '0', 10) + 1;
    localStorage.setItem(key(lessonId, 'attempts'), String(n));
    return n;
  }
  function getTotalXp() {
    return parseInt(localStorage.getItem('codeforge:xp') || '0', 10);
  }
  function markComplete(lessonId, xp) {
    const alreadyComplete = isComplete(lessonId);
    if (!alreadyComplete) {
      localStorage.setItem(key(lessonId, 'complete'), '1');
      localStorage.setItem('codeforge:xp', String(getTotalXp() + xp));
    }
    return { newlyCompleted: !alreadyComplete, totalXp: getTotalXp() };
  }

  function dateKey(d) {
    return d.toISOString().slice(0, 10);
  }
  // Call once per app load. Increments the streak the first time a day is
  // touched, carries it forward on consecutive days, resets on a gap.
  function touchStreak() {
    const today = dateKey(new Date());
    const last = localStorage.getItem('codeforge:streak:last');
    let count = parseInt(localStorage.getItem('codeforge:streak:count') || '0', 10);
    if (last === today) return count;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    count = last === dateKey(yesterday) ? count + 1 : 1;
    localStorage.setItem('codeforge:streak:last', today);
    localStorage.setItem('codeforge:streak:count', String(count));
    return count;
  }
  function getStreak() {
    return parseInt(localStorage.getItem('codeforge:streak:count') || '0', 10);
  }

  return {
    getDraft, setDraft, getNotes, setNotes, isComplete, incrementAttempts,
    getTotalXp, markComplete, touchStreak, getStreak,
  };
})();
