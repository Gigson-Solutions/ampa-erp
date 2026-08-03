import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { ExportButton } from "./ExportButton";

export default async function ExportPage(): Promise<React.ReactElement> {
  await requireAmpaRole("MANAGE_AMPA_SETTINGS");
  return <ExportPageContent />;
}

function ExportPageContent(): React.ReactElement {
  const t = useTranslations("board.export");
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-gray-600">{t("description")}</p>
      <div className="mt-6">
        <ExportButton />
      </div>
    </main>
  );
}
