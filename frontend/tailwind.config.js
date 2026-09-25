/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', "Times New Roman", "serif"],
        body: ['"Lora"', "Georgia", "serif"],
        sans: ['"Inter"', "Helvetica Neue", "sans-serif"],
        mono: ['"JetBrains Mono"', "Courier New", "monospace"],
      },
      colors: {
        newsprint: {
          bg: "#F9F9F7",
          ink: "#111111",
          muted: "#E5E5E0",
          red: "#CC0000",
          100: "#F5F5F5",
          200: "#E5E5E5",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
        },
      },
    },
  },
  plugins: [],
};
