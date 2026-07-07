/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme')
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 2048游戏方块颜色 - 保持不变
        'tile-2': '#EEE4DA',
        'tile-4': '#EDE0C8',
        'tile-8': '#F2B179',
        'tile-16': '#F59563',
        'tile-32': '#F67C5F',
        'tile-64': '#F65E3B',
        'tile-128': '#EDCF72',
        'tile-256': '#EDCC61',
        'tile-512': '#EDC850',
        'tile-1024': '#EDC53F',
        'tile-2048': '#EDC22E',
        'tile-dark': '#3C3A32',
        'tile-text-dark': '#776E65',
        'tile-text-light': '#F9F6F2',
        
        // 工具台主题色彩体系
        'warm': {
          50: '#f7fbfa',
          100: '#eef7f5',
          200: '#dbeae7',
          300: '#b9d8d2',
          400: '#7fb9b0',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
          800: '#134e4a',
          900: '#0f2f2b',
        },
        'orange': {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        'amber': {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        }
      }
    },
    screens: {
      // 自定义响应式尺寸
      'c-xs': {'max': '768px'},
      'c-sm': {'min': '768px'}, //相当远默认的md
      'c-md': {'min': '992px'},
      'c-lg': {'min': '1200px'},
      ...defaultTheme.screens,
    },
    animation: {
      fold: 'fold 1s infinite'
    },
    keyframes: {
      fold: {
        '0%, 100%': { 
          opacity: 0
        },  
        '50%': { 
          opacity: 1
        }  
      }
    }
  },
  plugins: [],
}

