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
        'lifted': '0 10px 40px rgba(0, 0, 0, 0.15), 0 6px 12px rgba(0, 0, 0, 0.1)',
        'card': '0 2px 4px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'fadeIn': 'fadeIn 0.2s ease-in',
        'slideUp': 'slideUp 0.3s ease-out',
        'slideDown': 'slideDown 0.3s ease-out',
        'scaleIn': 'scaleIn 0.2s ease-out',
        'slideInFromBottom': 'slideInFromBottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
        'wiggle': 'wiggle 0.3s ease-in-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideInFromBottom: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-2deg)' },
          '75%': { transform: 'rotate(2deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
