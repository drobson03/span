import FormsPlugin from "@tailwindcss/forms";
import type { Config } from "tailwindcss";
import AnimatePlugin from "tailwindcss-animate";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["InterVariable", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [AnimatePlugin, FormsPlugin],
} satisfies Config;
