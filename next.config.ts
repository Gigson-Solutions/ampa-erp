import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Necesario para el build multi-stage de `Dockerfile` (copia solo
  // `.next/standalone` + `.next/static`, sin `node_modules` completo).
  output: "standalone",
};

export default withNextIntl(nextConfig);
