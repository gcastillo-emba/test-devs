import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api-horas": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (ruta) => ruta.replace(/^\/api-horas/, ""),
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
