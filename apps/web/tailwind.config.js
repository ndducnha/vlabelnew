/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'accent-2': 'var(--accent-2)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        card: 'var(--card)',
        surface: 'var(--surface)',
        line: 'var(--border)',
      },
      borderRadius: { xl: '18px', '2xl': '22px' },
    },
  },
  plugins: [],
};
