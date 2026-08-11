import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listPendingCharges } from "@/lib/board-directory";
import { formatCurrency } from "@/lib/format";
import { ChargeRow } from "./ChargeRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH } from "@/components/ui/Table";

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

  // Feedback de usuario (2026-08-11): dashboard resumen arriba, tabla abajo.
  // "Atrasado" es el mismo cálculo derivado que usará la pieza de impagos y
  // previsión de tesorería (Charge.status nunca pasa a OVERDUE en la base de
  // datos — se calcula al vuelo comparando con la fecha de hoy).
  const now = new Date();
  const overdue = charges.filter((charge) => new Date(charge.dueDate) < now);
  const notOverdue = charges.filter((charge) => new Date(charge.dueDate) >= now);
  const sum = (list: typeof charges): number => list.reduce((total, charge) => total + charge.amount, 0);

  return (
    <>
      <PageHeader title={t("title")} />

      <div className="mb-6 grid grid-cols-2 gap-6">
        <Card>
          <p className="text-sm text-ink-700">{t("summaryPending")}</p>
          <p className="mt-1 text-2xl font-semibold text-ink-900">{formatCurrency(sum(notOverdue))}</p>
          <p className="mt-1 text-xs text-ink-400">
            {notOverdue.length} {t("summaryChargesCount")}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-ink-700">{t("summaryOverdue")}</p>
          <p className="mt-1 text-2xl font-semibold text-danger-fg">{formatCurrency(sum(overdue))}</p>
          <p className="mt-1 text-xs text-ink-400">
            {overdue.length} {t("summaryChargesCount")}
          </p>
        </Card>
      </div>

      {charges.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">{t("empty")}</p>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("family")}</TH>
              <TH>{t("concept")}</TH>
              <TH>{t("amount")}</TH>
              <TH>{t("dueDate")}</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {charges.map((charge) => (
              <ChargeRow key={charge.id} charge={charge} />
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
