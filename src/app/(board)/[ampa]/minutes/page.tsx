import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listMinutesEntries } from "@/lib/minutes";
import { MinutesForm } from "./MinutesForm";
import { VerifyChainButton } from "./VerifyChainButton";

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
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <section className="mt-6">
        <MinutesForm />
      </section>

      <section className="mt-8">
        <VerifyChainButton />
      </section>

      <ul className="mt-8 flex flex-col gap-4">
        {entries.map((entry) => (
          <li key={entry.id}>
            <p className="text-sm text-gray-500">
              {t("entryNumber")} {entry.sequenceNumber} — {new Date(entry.signedAt).toLocaleString("es-ES")}
            </p>
            <h2 className="font-semibold">{entry.title}</h2>
            <p>{entry.body}</p>
            <p className="text-sm text-gray-500">
              {t("signedBy")}: {entry.signedByName}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
