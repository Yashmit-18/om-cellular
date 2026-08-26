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
          50: '#eef2ff',
          100: '#dce4ff',
          200: '#b9c9ff',
          300: '#8ba8ff',
          400: '#5b7cff',
          500: '#3b5bdb',
          600: '#2b44b0',
          700: '#1e3287',
          800: '#142260',
          900: '#0c1540',
          950: '#060a20',
        },
      },
    },
  },
  plugins: [],
}
