/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'primary': {
          50: '#f5f7ff',
          100: '#ebf0fe',
          200: '#d6e0fd',
          300: '#b3c6fb',
          400: '#849ef7',
          500: '#5b76f2',
          600: '#3a4de8',
          700: '#2e3dd2',
          800: '#2834ab',
          900: '#283385',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
