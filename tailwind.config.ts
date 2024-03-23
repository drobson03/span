import type { Config } from "tailwindcss";
import FormsPlugin from "@tailwindcss/forms";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [FormsPlugin],
} satisfies Config;
