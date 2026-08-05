import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { RegisterFamilyForm } from "./RegisterFamilyForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

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
    <div>
      <PageHeader title={t("title")} />
      <Card>
        <RegisterFamilyForm ampaSubdomain={subdomain} />
      </Card>
    </div>
  );
}
