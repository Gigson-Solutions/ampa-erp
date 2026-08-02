import { useTranslations } from "next-intl";
import { LoginForm } from "./LoginForm";

export default function LoginPage(): React.ReactElement {
  const t = useTranslations("common");
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-xl font-semibold">{t("login")}</h1>
      <p className="mt-2 text-sm text-gray-600">{t("loginHint")}</p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </main>
  );
}
