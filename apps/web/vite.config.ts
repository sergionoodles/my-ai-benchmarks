import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative base so the static build works from any path (file:// preview,
  // plain static hosting) and `results/index.json` resolves relatively.
  base: "./",
});
