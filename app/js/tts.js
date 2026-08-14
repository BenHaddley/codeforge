// Reads Code Forge's own lesson text aloud. Never fed book/video transcript
// text — see docs/12-copyright-source-boundaries.md.
const TTS = (() => {
  function toggle(text, onEnd) {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not available in this browser.');
      return 'unavailable';
    }
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      return 'stopped';
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    if (onEnd) utterance.onend = onEnd;
    speechSynthesis.speak(utterance);
    return 'speaking';
  }
  return { toggle };
})();
