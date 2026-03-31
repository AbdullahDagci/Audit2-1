import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          950: "#0D3B13",
          900: "#1B5E20",
          800: "#2E7D32",
          700: "#388E3C",
          600: "#4CAF50",
          500: "#56C45A",
          400: "#66BB6A",
          300: "#81C784",
          200: "#A5D6A7",
          100: "#C8E6C9",
          50: "#E8F5E9",
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0,0,0,0.06), 0 10px 20px -2px rgba(0,0,0,0.04)',
        'soft-lg': '0 4px 25px -5px rgba(0,0,0,0.08), 0 15px 30px -5px rgba(0,0,0,0.05)',
        'glass': '0 8px 32px 0 rgba(31,38,135,0.07)',
        'float': '0 20px 60px -15px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      transitionTimingFunction: {
        'ios': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-ios',
        'slide-up': 'slideUp 0.3s ease-ios',
        'scale-in': 'scaleIn 0.2s ease-ios',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
