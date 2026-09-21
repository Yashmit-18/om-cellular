/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2f7',
          100: '#d9e1ec',
          200: '#b3c2d8',
          300: '#879cba',
          400: '#5a7597',
          500: '#3b5779',
          600: '#2c4461',
          700: '#24354d',
          800: '#1c2940',
          900: '#141d2e',
          950: '#0b121f',
        },
        navy: {
          50: '#f3f5f8',
          100: '#e5e9ef',
          200: '#c8d0dc',
          300: '#a3afbf',
          400: '#7c8ba0',
          500: '#5b6c84',
          600: '#45536a',
          700: '#334056',
          800: '#17233a',
          900: '#111c2d',
          950: '#0b1220',
        },
        gold: {
          50: '#faf7f0',
          100: '#f3ecdc',
          200: '#e8d9b8',
          300: '#ddc694',
          400: '#d2b47c',
          500: '#c6a15b',
          600: '#a9894f',
          700: '#8a6a3a',
          800: '#6b5230',
          900: '#57452a',
        },
        ivory: {
          50: '#f7f5ef',
          100: '#f0ece2',
          200: '#e7e3da',
          300: '#dcd5c7',
        },
        warm: {
          DEFAULT: '#fffdf8',
          white: '#fffdf8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'display': ['clamp(2.1rem, 4.5vw, 3.4rem)', { lineHeight: '1.06', letterSpacing: '-0.02em' }],
        'hero-xl': ['clamp(1.5rem, 3vw, 2.1rem)', { lineHeight: '1.12', letterSpacing: '-0.01em' }],
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgb(11 18 32 / 0.05), 0 1px 2px -1px rgb(11 18 32 / 0.04)',
        'card-hover': '0 5px 14px -3px rgb(11 18 32 / 0.10), 0 2px 4px -2px rgb(11 18 32 / 0.05)',
        'elevated': '0 12px 30px -8px rgb(11 18 32 / 0.12), 0 4px 10px -6px rgb(11 18 32 / 0.06)',
        'glow-brand': '0 0 20px -4px rgb(17 28 45 / 0.30)',
        'glow-gold': '0 0 22px -6px rgb(198 161 91 / 0.45)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fab-in': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'fab-in': 'fab-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both',
      },
    },
  },
  plugins: [],
}
