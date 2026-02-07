import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F4F6F4',
          100: '#E8EDE7',
          200: '#D4E6D2',
          300: '#A3C4A0',
          400: '#6B8568',
          500: '#5A7A56',
          600: '#4A6347',
          700: '#344532',
          800: '#2A3828',
          900: '#1F2C1E',
          950: '#151F14',
        },
        success: {
          50: '#E8F8ED',
          100: '#D1F1DB',
          200: '#A3E3B7',
          300: '#75D593',
          400: '#4EC96F',
          500: '#34C759',
          600: '#2BA148',
          700: '#1B7A34',
          800: '#145727',
          900: '#0D3A1A',
        },
        warning: {
          50: '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#FF9500',
          600: '#E68600',
          700: '#CC7700',
          800: '#995A00',
          900: '#663D00',
        },
        error: {
          50: '#FFEBEE',
          100: '#FFCDD2',
          200: '#EF9A9A',
          300: '#E57373',
          400: '#EF5350',
          500: '#FF3B30',
          600: '#E53935',
          700: '#CC2F26',
          800: '#B71C1C',
          900: '#7F1D1D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
