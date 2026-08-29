/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bitBg: "#090D16",
        bitPrimary: "#3B82F6",
        bitSuccess: "#10B981",
        bitError: "#EF4444",
        bitWarning: "#F59E0B",
      },
    },
  },
  plugins: [],
}

