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
        white: "#FAF7EE",
        newsprint: {
          bg: "#F2ECE1",
          paper: "#FAF7EE",
          inset: "#EAE2D2",
          muted: "#D8D0BF",
          ink: "#111111",
          red: "#C41212",
          100: "#EAE2D2",
          200: "#DED6C4",
          400: "#8C867A",
          500: "#6B655A",
          600: "#4D483F",
          700: "#332F28",
        },
      },
    },
  },
  plugins: [],
};
