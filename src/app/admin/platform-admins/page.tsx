import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { listPlatformAdmins } from "@/lib/platform-admin";
import { PlatformAdminsSection } from "./PlatformAdminsSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function PlatformAdminsPage(): Promise<React.ReactElement> {
  await requirePlatformAdmin();
  const admins = await listPlatformAdmins();

  return (
    <>
      <PageHeader title="Superadmins de plataforma" />
      <Card>
        <PlatformAdminsSection admins={admins} />
      </Card>
    </>
  );
}
