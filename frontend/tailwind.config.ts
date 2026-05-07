import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        border: "var(--border)",
        accent: "var(--accent)",
        muted: "var(--muted)",
        fg: "var(--text)",
      },
    },
  },
  plugins: [],
};

export default config;
