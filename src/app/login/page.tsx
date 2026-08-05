import { useTranslations } from "next-intl";
import { LoginForm } from "./LoginForm";
import { Card } from "@/components/ui/Card";

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  const { callbackUrl } = await searchParams;
  return <LoginPageContent callbackUrl={callbackUrl} />;
}

function LoginPageContent({ callbackUrl }: { callbackUrl?: string }): React.ReactElement {
  const t = useTranslations("common");
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-6">
      <div className="w-full max-w-sm">
        <Card>
          <h1 className="text-xl font-bold text-ink-900">{t("login")}</h1>
          <p className="mt-2 text-sm text-ink-700">{t("loginHint")}</p>
          <div className="mt-6">
            <LoginForm callbackUrl={callbackUrl} />
          </div>
        </Card>
      </div>
    </main>
  );
}
