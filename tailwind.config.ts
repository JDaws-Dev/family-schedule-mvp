import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Soft sage green - Main brand color (calming, nurturing, organized)
        primary: {
          50: '#f5f9f7',
          100: '#e6f2ed',
          200: '#c7e4d8',
          300: '#a8d6c3',
          400: '#89c8ae',
          500: '#6bb899', // Soft sage
          600: '#5a9d82',
          700: '#4a826b',
          800: '#396754',
          900: '#294c3d',
        },
        // Warm blush/rose - Secondary color (caring, gentle, friendly)
        secondary: {
          50: '#fef5f7',
          100: '#fde8ec',
          200: '#fbc5d0',
          300: '#f8a2b4',
          400: '#f67f98',
          500: '#f45c7c', // Warm blush
          600: '#d94a67',
          700: '#b33952',
          800: '#8d293d',
          900: '#671828',
        },
        // Soft lavender - Accent color (calm, trustworthy, supportive)
        accent: {
          50: '#f7f5fb',
          100: '#ede8f6',
          200: '#d7cceb',
          300: '#c1b0df',
          400: '#ab94d4',
          500: '#9578c8', // Soft lavender
          600: '#7d63a6',
          700: '#664e84',
          800: '#4e3a63',
          900: '#362541',
        },
        // Warm neutrals for a cozy feel
        warm: {
          50: '#fdfcfb',
          100: '#faf8f5',
          200: '#f5f1ea',
          300: '#ede7dc',
          400: '#e4dcc8',
          500: '#d4c8b0',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'Quicksand', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Nunito', 'Quicksand', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'strong': '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
export default config;
