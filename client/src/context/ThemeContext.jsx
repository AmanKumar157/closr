import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

const ThemeContext = createContext();

export const applyThemeToDOM = (themeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  if (themeMode === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    if (body) {
      body.classList.add('dark');
      body.classList.remove('light');
    }
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    if (body) {
      body.classList.remove('dark');
      body.classList.add('light');
    }
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
  try {
    localStorage.setItem('closr-theme', themeMode);
  } catch (_) {}
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // 1. Read stored preference from localStorage safely
    try {
      const saved = localStorage.getItem('closr-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (_) {}

    // Default to 'light' theme on clean state, unless user specifically switched or saved
    return 'light';
  });

  useLayoutEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Listen to system OS theme changes only if user hasn't explicitly set a preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      try {
        const saved = localStorage.getItem('closr-theme');
        if (!saved) {
          const nextTheme = e.matches ? 'dark' : 'light';
          applyThemeToDOM(nextTheme);
          setTheme(nextTheme);
        }
      } catch (_) {}
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = (forcedMode) => {
    setTheme((prev) => {
      const next = forcedMode !== undefined ? forcedMode : (prev === 'dark' ? 'light' : 'dark');
      applyThemeToDOM(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

