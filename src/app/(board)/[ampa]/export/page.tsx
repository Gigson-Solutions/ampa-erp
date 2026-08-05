import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { ExportButton } from "./ExportButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function ExportPage(): Promise<React.ReactElement> {
  await requireAmpaRole("MANAGE_AMPA_SETTINGS");
  return <ExportPageContent />;
}

function ExportPageContent(): React.ReactElement {
  const t = useTranslations("board.export");
  return (
    <div className="max-w-xl">
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <ExportButton />
      </Card>
    </div>
  );
}
