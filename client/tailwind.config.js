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
          800: '#232d3f',
          900: '#16202e',
          950: '#0c141f',
        },
        gold: {
          50: '#faf7f0',
          100: '#f3ecdc',
          200: '#e8d9b8',
          300: '#dcc392',
          400: '#d0ad6f',
          500: '#c09a53',
          600: '#a87f41',
          700: '#8a6736',
          800: '#6f522d',
          900: '#5a4327',
        },
        ivory: {
          50: '#fafaf6',
          100: '#f4f3ec',
          200: '#e9e7dc',
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
        'card': '0 1px 2px 0 rgb(12 20 31 / 0.04), 0 1px 2px -1px rgb(12 20 31 / 0.04)',
        'card-hover': '0 4px 12px -2px rgb(12 20 31 / 0.09), 0 2px 4px -2px rgb(12 20 31 / 0.04)',
        'elevated': '0 10px 28px -6px rgb(12 20 31 / 0.10), 0 4px 10px -6px rgb(12 20 31 / 0.06)',
        'glow-brand': '0 0 20px -4px rgb(44 68 97 / 0.30)',
        'glow-gold': '0 0 22px -6px rgb(192 154 83 / 0.45)',
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
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
