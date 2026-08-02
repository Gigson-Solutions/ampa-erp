import { readFileSync } from "node:fs";
import { join } from "node:path";
import { locales } from "../src/i18n/request";

// Verificación 7 del plan de visión: falla el build si faltan claves de traducción
// en alguno de los 5 locales. Se ejecuta en CI (ver .github/workflows/ci.yml).

function flatten(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const nested of flatten(value as Record<string, unknown>, fullKey)) {
        keys.add(nested);
      }
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

function main(): void {
  const messagesDir = join(import.meta.dirname, "..", "messages");
  const keysByLocale = new Map<string, Set<string>>();

  for (const locale of locales) {
    const raw = readFileSync(join(messagesDir, `${locale}.json`), "utf-8");
    keysByLocale.set(locale, flatten(JSON.parse(raw) as Record<string, unknown>));
  }

  const referenceLocale = locales[0];
  const referenceKeys = keysByLocale.get(referenceLocale);
  if (!referenceKeys) {
    throw new Error(`No se pudieron leer las claves del locale de referencia "${referenceLocale}"`);
  }

  let hasErrors = false;

  for (const locale of locales) {
    const keys = keysByLocale.get(locale);
    if (!keys) continue;

    const missing = [...referenceKeys].filter((key) => !keys.has(key));
    const extra = [...keys].filter((key) => !referenceKeys.has(key));

    if (missing.length > 0) {
      hasErrors = true;
      console.error(`[i18n] Faltan claves en "${locale}": ${missing.join(", ")}`);
    }
    if (extra.length > 0) {
      hasErrors = true;
      console.error(`[i18n] Claves sobrantes en "${locale}" (no existen en "${referenceLocale}"): ${extra.join(", ")}`);
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  } else {
    console.log(`[i18n] OK — ${locales.length} locales con las mismas claves.`);
  }
}

main();
