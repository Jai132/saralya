/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0B1B34', 800: '#132a4d', 700: '#1c3a66', 600: '#2b4d80' },
        teal: { DEFAULT: '#0F766E', dark: '#0b5e58', light: '#14b8a6', tint: '#EEF8F6' },
        ember: { DEFAULT: '#C2410C', dark: '#9a3412', tint: '#FFF6EC' },
        danger: { DEFAULT: '#B91C1C', tint: '#FEF2F2' },
        amber: { DEFAULT: '#B45309', tint: '#FFFBEB' },
        ink: { DEFAULT: '#0f172a', soft: '#475569', faint: '#94a3b8' },
        line: '#e2e8f0',
        paper: '#F7F8FA',
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,27,52,0.06), 0 4px 16px rgba(11,27,52,0.06)',
      },
      keyframes: {
        fadeUp: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.3' } },
      },
      animation: {
        fadeUp: 'fadeUp .35s ease-out both',
        pulseDot: 'pulseDot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
