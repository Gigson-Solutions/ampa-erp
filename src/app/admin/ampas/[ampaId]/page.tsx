import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { getAmpaDetail } from "@/lib/platform-admin";
import { EditAmpaForm } from "./EditAmpaForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

interface PageProps {
  params: Promise<{ ampaId: string }>;
}

export default async function AmpaDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  await requirePlatformAdmin();
  const { ampaId } = await params;

  const ampa = await getAmpaDetail(ampaId);
  if (!ampa) notFound();

  return (
    <>
      <PageHeader title={`${ampa.name} — ${ampa.centerName}`} description={`/${ampa.subdomain}`} />
      <Card>
        <EditAmpaForm ampa={ampa} />
      </Card>
    </>
  );
}
