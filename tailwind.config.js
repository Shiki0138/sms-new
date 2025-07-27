/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        sm: '640px', // スマートフォン (縦)
        md: '768px', // タブレット (縦)
        lg: '1024px', // タブレット (横) / 小型PC
        xl: '1280px', // デスクトップ
      },
    },
  },
  plugins: [],
};
