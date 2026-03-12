/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        warm: {
          50:  '#fefcf8',
          100: '#f7f3ec',
          200: '#ede5d8',
          300: '#ddd0bc',
          400: '#c4ad92',
          500: '#a08868',
          600: '#7d6650',
          700: '#5c4c3c',
          800: '#3a3028',
          900: '#211d18',
        },
      },
    },
  },
  plugins: [],
}
