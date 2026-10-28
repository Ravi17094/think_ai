/** @type {import('tailwindcss').Config} */
const thinkzBlue = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
  950: '#172554',
};

export default {
   darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Historical pages used several primary colour families. Keep their
        // existing class names, but render each one with the Thinkz blue scale.
        blue: thinkzBlue,
        cyan: thinkzBlue,
        indigo: thinkzBlue,
        purple: thinkzBlue,
        violet: thinkzBlue,
        fuchsia: thinkzBlue,
        brand: {
          ...thinkzBlue,
        },
        accent: {
          500: '#14b8a6',
          600: '#0d9488'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        elevated: '0 10px 30px -10px rgba(15,23,42,0.25)'
      }
    }
  },
  plugins: []
};
