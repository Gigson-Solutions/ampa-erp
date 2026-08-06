import { describe, expect, it } from "vitest";
import { extractSubdomainFromHost, extractSubdomainFromPath, resolveAmpaSubdomain } from "./proxy";

// ROOT_DOMAIN por defecto en test es "ampas.org" (sin ROOT_DOMAIN en el entorno).

describe("extractSubdomainFromHost", () => {
  it("extrae el subdominio de un host de producción real", () => {
    expect(extractSubdomainFromHost("campanar.ampas.org")).toBe("campanar");
  });

  it("ignora el puerto", () => {
    expect(extractSubdomainFromHost("campanar.ampas.org:3000")).toBe("campanar");
  });

  it("devuelve null si el host no es de ROOT_DOMAIN (p.ej. localhost)", () => {
    expect(extractSubdomainFromHost("localhost:3000")).toBeNull();
  });

  it("devuelve null para subdominios reservados (www, app, api, admin, login)", () => {
    expect(extractSubdomainFromHost("www.ampas.org")).toBeNull();
    expect(extractSubdomainFromHost("login.ampas.org")).toBeNull();
  });

  it("devuelve null para el dominio raíz sin subdominio", () => {
    expect(extractSubdomainFromHost("ampas.org")).toBeNull();
  });
});

describe("extractSubdomainFromPath (fallback local sin subdominios reales)", () => {
  it("extrae el primer segmento de la ruta", () => {
    expect(extractSubdomainFromPath("/campanar/families")).toBe("campanar");
    expect(extractSubdomainFromPath("/campanar")).toBe("campanar");
  });

  it("devuelve null para rutas reservadas (login, api) para no confundirlas con una AMPA", () => {
    expect(extractSubdomainFromPath("/login")).toBeNull();
    expect(extractSubdomainFromPath("/api/auth/session")).toBeNull();
  });

  it("devuelve null para assets internos de Next", () => {
    expect(extractSubdomainFromPath("/_next/static/chunk.js")).toBeNull();
  });

  it("devuelve null para la raíz", () => {
    expect(extractSubdomainFromPath("/")).toBeNull();
  });
});

describe("resolveAmpaSubdomain", () => {
  it("prioriza el host real sobre el fallback de ruta", () => {
    expect(resolveAmpaSubdomain("campanar.ampas.org", "/families")).toBe("campanar");
  });

  it("usa el fallback de ruta cuando el host no resuelve (localhost)", () => {
    expect(resolveAmpaSubdomain("localhost:3000", "/campanar/families")).toBe("campanar");
  });

  it("no confunde /login con una AMPA ni en local", () => {
    expect(resolveAmpaSubdomain("localhost:3000", "/login")).toBeNull();
  });
});
