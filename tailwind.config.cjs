/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}', './services/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lucrai: {
          50: '#E9FBFB',
          100: '#D2F7F7',
          200: '#A6EFEF',
          300: '#6FE6E5',
          400: '#3CDEDD',
          500: '#15D2D0',
          600: '#10B9B7',
          700: '#0E9F9D',
          800: '#0C8584',
          900: '#0A5C5B',
        },
      },
    },
  },
  plugins: [],
};


