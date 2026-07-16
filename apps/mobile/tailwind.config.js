/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        busan: {
          blue: '#1767FF',
          ink: '#07142F',
          muted: '#7A8798',
          surface: '#F6F8FC',
        },
      },
    },
  },
  plugins: [],
};
