import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import FormsPlugin from "@tailwindcss/forms";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["InterVariable", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [FormsPlugin],
} satisfies Config;
