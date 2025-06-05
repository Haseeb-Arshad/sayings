import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  isDarkTheme: true
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  // Only run on client side
  useEffect(() => {
    setMounted(true);
    // Check if user has a theme preference stored
    try {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'light') {
        setTheme('light');
        document.documentElement.classList.add('light-theme');
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    if (typeof window !== 'undefined') {
      if (newTheme === 'light') {
        // Switch to light theme
        document.documentElement.classList.add('light-theme');
        try {
          localStorage.setItem('theme', 'light');
        } catch (error) {
          console.error('Error saving theme to localStorage:', error);
        }
      } else {
        // Switch to dark theme
        document.documentElement.classList.remove('light-theme');
        try {
          localStorage.setItem('theme', 'dark');
        } catch (error) {
          console.error('Error saving theme to localStorage:', error);
        }
      }
    }
  };

  // Only render the themed content after the component has mounted on the client
  // This prevents hydration mismatches
  if (!mounted) {
    // You can return a minimal version without theme specific elements
    return <ThemeContext.Provider value={{ theme, toggleTheme, isDarkTheme: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>;
  }
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDarkTheme: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
