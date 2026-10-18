import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        deep: { DEFAULT: "#13335E", 50: "#EEF3F9", 100: "#D9E3F0", 200: "#B3C6E0", 600: "#1B4479", 700: "#13335E", 800: "#0E2748", 900: "#0A1C35" },
        paper: "#F4F6F8",
        steel: { DEFAULT: "#25303B", 400: "#8793A0", 500: "#5E6B78", 600: "#46525E" },
        line: { DEFAULT: "#D6DDE3", strong: "#B9C3CC" },
        tag: { DEFAULT: "#F2C230", dark: "#D9A800", soft: "#FCF3D2" },
        ok: { DEFAULT: "#1F7A55", soft: "#E3F2EA" },
        warn: { DEFAULT: "#9A5B00", soft: "#FBEFD9" },
        bad: { DEFAULT: "#B3261E", soft: "#F9E3E1" },
        info: { DEFAULT: "#1B4479", soft: "#E6EDF7" },
      },
      fontFamily: { sans: ['"Archivo Variable"', '"Heebo Variable"', "system-ui", "sans-serif"] },
      maxWidth: { page: "78rem" },
      borderRadius: { DEFAULT: "4px" },
    },
  },
  plugins: [],
} satisfies Config;
