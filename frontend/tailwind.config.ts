import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d12",
        panel: "#141822",
        border: "#222837",
        accent: "#7c9cff",
        muted: "#8a93a6",
      },
    },
  },
  plugins: [],
};

export default config;
