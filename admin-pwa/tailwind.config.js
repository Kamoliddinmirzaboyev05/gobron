/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#17A548',
          dark: '#0B5D2C',
          light: '#E8F5EE',
        },
        scaffold: '#F6F8F6',
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        input: '12px',
      },
    },
  },
  plugins: [],
}
