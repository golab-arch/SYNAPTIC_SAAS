import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        synaptic: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          400: '#748ffc',
          500: '#4c6ef5',
          600: '#3b5bdb',
          700: '#364fc7',
          900: '#1b2559',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
