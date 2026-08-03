import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listPendingCharges } from "@/lib/board-directory";
import { ChargeRow } from "./ChargeRow";

export default async function ChargesPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_TREASURY");
  const charges = await listPendingCharges(ampaId);

  return <ChargesPageContent charges={charges} />;
}

function ChargesPageContent({
  charges,
}: {
  charges: Awaited<ReturnType<typeof listPendingCharges>>;
}): React.ReactElement {
  const t = useTranslations("board.charges");

  if (charges.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-4">{t("empty")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <table className="mt-6 w-full text-left">
        <thead>
          <tr>
            <th>{t("family")}</th>
            <th>{t("concept")}</th>
            <th>{t("amount")}</th>
            <th>{t("dueDate")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => (
            <ChargeRow key={charge.id} charge={charge} />
          ))}
        </tbody>
      </table>
    </main>
  );
}
