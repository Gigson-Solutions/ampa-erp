import { useTranslations } from "next-intl";

// Fase 0: página de login mínima (el formulario de envío de magic link se conecta
// a `signIn("nodemailer", { email })` en Fase 1, junto con el resto del flujo de
// alta de familia).
export default function LoginPage(): React.ReactElement {
  const t = useTranslations("common");
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-xl font-semibold">{t("login")}</h1>
      <p className="mt-2 text-sm text-gray-600">{t("loginHint")}</p>
    </main>
  );
}
