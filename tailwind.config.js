/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        barber: {
          dark: '#260E01',   // Fundo principal
          accent: '#61210F', // Botões e bordas
          light: '#FFF3DB',  // Textos e destaques
        }
      },
      fontFamily: {
        serif: ['Georgia', 'serif'], // Fonte clássica para o título
      }
    },
  },
  plugins: [],
}
