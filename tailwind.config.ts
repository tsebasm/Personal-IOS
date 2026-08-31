import type { Config } from "tailwindcss";

/**
 * Color tokens are CSS custom properties (defined in app/globals.css) so
 * light/dark switching works the same way it did in the original War Room
 * artifact: a light :root default, overridden under
 * prefers-color-scheme:dark, overridden again by an explicit [data-theme]
 * for a future manual toggle. Tailwind classes just read the variables.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        "ink-dim": "var(--ink-dim)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        navy: "var(--navy)",
        "navy-ink": "var(--navy-ink)",
        good: "var(--good)",
        "good-bg": "var(--good-bg)",
        warn: "var(--warn)",
        "warn-bg": "var(--warn-bg)",
        bad: "var(--bad)",
        "bad-bg": "var(--bad-bg)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-public-sans)", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["var(--font-plex-mono)", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,16,20,0.04), 0 6px 16px rgba(16,16,20,0.04)",
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
