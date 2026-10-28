import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // One preference is shared by Admin, TA, Instructor, and Learner portals.
  // This prevents a user seeing different colour themes after changing portal.
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('thinkz-theme') === 'dark');

  // Sync with HTML root class for Tailwind `dark:` classes
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('thinkz-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
