/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff7ff',
          100: '#dbeefe',
          200: '#bee0fd',
          300: '#90ccfb',
          400: '#5cb0f6',
          500: '#3891f0',
          600: '#2274e7',
          700: '#1a5fd5',
          800: '#1c4faf',
          900: '#1c4489',
          950: '#152b54'
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
