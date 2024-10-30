import path from "path";
import { fileURLToPath } from "url"; // ייבוא כדי לעבוד עם url
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// הגדרה ידנית של __dirname
const __filename = fileURLToPath(import.meta.url); // הנתיב המלא של הקובץ הנוכחי
const __dirname = path.dirname(__filename); // התיקייה שבה הקובץ נמצא

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
