import { useEffect, useState } from 'react';

// Light/dark toggle. Dark is the original Reclaim look and the default.
// Light mode lives entirely in theme-light.css as overrides, so styles.css is untouched.
const STORAGE_KEY = 'reclaim-theme';

function readSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readSavedTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage unavailable: theme still works for this visit */ }
  }, [theme]);

  const isLight = theme === 'light';
  const label = isLight ? 'Switch to dark mode' : 'Switch to light mode';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      aria-label={label}
      title={label}
    >
      {isLight ? (
        // Moon: click to go dark
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" />
        </svg>
      ) : (
        // Sun: click to go light
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="4.5" /><line x1="12" y1="19.5" x2="12" y2="22" />
            <line x1="2" y1="12" x2="4.5" y2="12" /><line x1="19.5" y1="12" x2="22" y2="12" />
            <line x1="4.9" y1="4.9" x2="6.7" y2="6.7" /><line x1="17.3" y1="17.3" x2="19.1" y2="19.1" />
            <line x1="4.9" y1="19.1" x2="6.7" y2="17.3" /><line x1="17.3" y1="6.7" x2="19.1" y2="4.9" />
          </g>
        </svg>
      )}
    </button>
  );
}
