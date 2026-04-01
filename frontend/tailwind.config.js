/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2B8FD4",       // azul destaque
          "blue-dark": "#0D3F8F", // azul médio Propeq
          green: "#10B981",
          navy: "#071A40",        // fundo principal (dark navy)
          card: "#0D2A60",        // cards (azul Propeq)
          "card-light": "#112E6B",
          border: "#1A4A8C",
          white: "#F0F6FF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
