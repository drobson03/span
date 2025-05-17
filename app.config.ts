import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vite: {
    // @ts-ignore
    plugins: [tailwindcss(), tsConfigPaths({ projects: ["./tsconfig.json"] })],
  },
  tsr: {
    appDirectory: "./src",
  },
  react: {
    babel: {
      plugins: [["babel-plugin-react-compiler", {}]],
    },
  },
});
