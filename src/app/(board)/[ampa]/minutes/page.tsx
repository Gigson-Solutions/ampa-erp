import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listMinutesEntries } from "@/lib/minutes";
import { MinutesForm } from "./MinutesForm";
import { VerifyChainButton } from "./VerifyChainButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function MinutesPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");
  const entries = await listMinutesEntries(ampaId);

  return <MinutesPageContent entries={entries} />;
}

function MinutesPageContent({
  entries,
}: {
  entries: Awaited<ReturnType<typeof listMinutesEntries>>;
}): React.ReactElement {
  const t = useTranslations("board.minutes");

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("title")} actions={<VerifyChainButton />} />

      <Card>
        <MinutesForm />
      </Card>

      <ul className="mt-6 flex flex-col gap-4">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Card>
              <p className="text-xs font-medium text-ink-400">
                {t("entryNumber")} {entry.sequenceNumber} — {new Date(entry.signedAt).toLocaleString("es-ES")}
              </p>
              <h2 className="mt-1 font-semibold text-ink-900">{entry.title}</h2>
              <p className="mt-1 text-sm text-ink-700">{entry.body}</p>
              <p className="mt-2 text-xs text-ink-400">
                {t("signedBy")}: {entry.signedByName}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
