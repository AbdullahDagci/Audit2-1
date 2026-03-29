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
          900: "#1B5E20",
          800: "#2E7D32",
          600: "#4CAF50",
          400: "#66BB6A",
          300: "#81C784",
          100: "#C8E6C9",
          50: "#E8F5E9",
        },
      },
    },
  },
  plugins: [],
};

export default config;
