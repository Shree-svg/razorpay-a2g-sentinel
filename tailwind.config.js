/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'rzp-navy': '#0C2451',
        'rzp-blue': '#3395FF',
        'rzp-blue-dark': '#305EFF',
        'rzp-text': '#0F0F0F',
        'rzp-bg': '#F7F9FC',
        'rzp-success': '#12B76A',
        'rzp-error': '#E03137',
        'rzp-warning': '#F2994A',
      },
    },
  },
  plugins: [],
}

