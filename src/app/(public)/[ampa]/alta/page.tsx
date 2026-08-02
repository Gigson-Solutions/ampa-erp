import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { RegisterFamilyForm } from "./RegisterFamilyForm";

interface PageProps {
  params: Promise<{ ampa: string }>;
}

export default async function AltaPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampa: subdomain } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  return <AltaFormSection subdomain={subdomain} />;
}

function AltaFormSection({ subdomain }: { subdomain: string }): React.ReactElement {
  const t = useTranslations("register");
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <div className="mt-6">
        <RegisterFamilyForm ampaSubdomain={subdomain} />
      </div>
    </main>
  );
}
