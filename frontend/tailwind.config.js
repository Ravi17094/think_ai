/** @type {import('tailwindcss').Config} */
const thinkzPurple = {
  50: '#faf5ff',
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7',
  600: '#7c3aed',
  700: '#6d28d9',
  800: '#5b21b6',
  900: '#4c1d95',
  950: '#2e1065',
};

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Historical pages used several primary colour families. Keep their
        // existing class names, but render each one with the Thinkz purple scale.
        blue: thinkzPurple,
        cyan: thinkzPurple,
        indigo: thinkzPurple,
        purple: thinkzPurple,
        violet: thinkzPurple,
        fuchsia: thinkzPurple,
        sky: thinkzPurple,
        brand: {
          ...thinkzPurple,
        },
        accent: {
          500: '#a855f7',
          600: '#7c3aed'
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
