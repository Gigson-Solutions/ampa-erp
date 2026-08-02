import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// Multiidioma desde el primer commit (decisión no postponible — ver plan de
// visión). No se usa enrutado por prefijo de idioma (`/es/...`) porque el tenant ya
// se resuelve por subdominio (ver proxy.ts); el idioma por defecto de cada AMPA
// vive en `Ampa.locale` y el usuario puede sobreescribirlo con esta cookie.
export const locales = ["es", "ca", "eu", "gl", "va"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: Locale = locales.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>,
  };
});
