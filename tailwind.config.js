/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        leather: {
          DEFAULT: '#16130F',
          200: '#221D17',
          300: '#2C251C',
        },
        brass: {
          DEFAULT: '#C9A24B',
          bright: '#E4C066',
          line: 'rgba(201,162,75,0.22)',
        },
        copper: {
          DEFAULT: '#A85C2E',
          bright: '#C97A44',
        },
        paper: {
          DEFAULT: '#EFE6D8',
          dim: '#C9BEA9', 
        },
        ink: '#16130F',
      },
      fontFamily: {
        sans: ['"Work Sans"', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        mono: ['"Space Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
