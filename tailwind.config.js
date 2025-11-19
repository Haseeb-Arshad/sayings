/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./component/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F3F4F6', // Light grey background
        surface: '#FFFFFF', // White card background
        primary: '#111827', // Dark text
        secondary: '#6B7280', // Grey text
        accent: '#2563EB', // Blue accent
        border: '#E5E7EB', // Light border
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

