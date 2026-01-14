/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}', './services/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
      colors: {
        brand: {
          accent: '#0164B4', // Azul principal
          // Azul profundo derivado (sidebar/fundos escuros)
          deep: '#0B2447',
          // Off-white quente (fundo premium)
          background: '#F7F9F8',
        },
        lucrai: {
          // Remapeado para o azul do Lucraí (mantém classes existentes: bg-lucrai-500 etc)
          50: '#E8F2FB',
          100: '#D0E6F8',
          200: '#A1CEF1',
          300: '#72B5EA',
          400: '#439DE3',
          500: '#0164B4', // accent
          600: '#01579E',
          700: '#014A88',
          800: '#013D72',
          900: '#00294D',
        },
      },
      boxShadow: {
        premium: '0 10px 40px -10px rgba(11, 36, 71, 0.12)',
        float: '0 20px 40px -5px rgba(11, 36, 71, 0.16)',
        glow: '0 0 20px rgba(1, 100, 180, 0.25)',
      },
    },
  },
  plugins: [],
};


