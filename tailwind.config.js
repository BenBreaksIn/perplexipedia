/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        perplexity: {
          primary: 'var(--perplexity-primary)',
          secondary: 'var(--perplexity-secondary)',
        },
        wiki: {
          bg: 'var(--wiki-background)',
          border: 'var(--wiki-border)',
        }
      },
      fontFamily: {
        'linux-libertine': ['Linux Libertine', 'Georgia', 'Times', 'serif'],
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

