/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        panel: {
          950: '#0d1117',
          900: '#111827',
          850: '#172033',
          800: '#1f2937',
          700: '#334155'
        },
        status: {
          ok: '#16a34a',
          warn: '#d97706',
          danger: '#dc2626',
          info: '#0284c7'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
