/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b"
        },
        background: "hsl(var(--background) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)"
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"]
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(16 20 46 / 0.04), 0 1px 3px 0 rgb(16 20 46 / 0.06)",
        card: "0 8px 30px -12px rgb(16 20 46 / 0.15)",
        glow: "0 0 0 1px hsl(var(--border)), 0 20px 40px -20px rgb(79 70 229 / 0.28)"
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #4f46e5 0%, #4338ca 55%, #312e81 100%)",
        "hero-grid":
          "radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.18) 1px, transparent 0)"
      }
    }
  },
  plugins: []
};
