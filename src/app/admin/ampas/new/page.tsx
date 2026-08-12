import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { listCenters } from "@/lib/platform-admin";
import { CreateAmpaForm } from "./CreateAmpaForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function NewAmpaPage(): Promise<React.ReactElement> {
  await requirePlatformAdmin();
  const centers = await listCenters();

  return (
    <>
      <PageHeader title="Nueva AMPA" />
      <Card>
        <CreateAmpaForm centers={centers} />
      </Card>
    </>
  );
}
