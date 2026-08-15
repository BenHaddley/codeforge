// Opt-in higher-contrast/larger-text mode. Applies a data attribute on
// <html> that css/accessibility.css keys off of — default look is
// untouched, this never changes the Win95 aesthetic unless the learner
// turns it on themselves.
const Accessibility = (() => {
  const KEY = 'codeforge:a11y:highContrast';

  function isEnabled() {
    return localStorage.getItem(KEY) === '1';
  }

  function apply(enabled) {
    document.documentElement.setAttribute('data-a11y', enabled ? '1' : '0');
  }

  function setEnabled(enabled) {
    localStorage.setItem(KEY, enabled ? '1' : '0');
    apply(enabled);
  }

  function toggle() {
    const next = !isEnabled();
    setEnabled(next);
    return next;
  }

  apply(isEnabled());

  return { isEnabled, setEnabled, toggle };
})();
