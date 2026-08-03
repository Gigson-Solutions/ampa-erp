import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // La mayoría de tests de integración comparten UN único Postgres real (no
    // mockeado). Ejecutar los ficheros en paralelo (default de Vitest) agota el
    // pool de conexiones a medida que crece la suite y provoca timeouts
    // intermitentes en los `beforeAll` — máxime en esta máquina, donde suele haber
    // varios servidores de desarrollo de otros proyectos corriendo a la vez.
    // Ejecutarlos en serie es más lento pero fiable.
    fileParallelism: false,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
