import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listPendingCharges } from "@/lib/board-directory";
import { getCashFlowForecast, listExpenseForecasts } from "@/lib/treasury";
import { formatCurrency } from "@/lib/format";
import { ChargeRow } from "./ChargeRow";
import { CreateExpenseForecastForm } from "./CreateExpenseForecastForm";
import { MarkExpensePaidButton } from "./MarkExpensePaidButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default async function ChargesPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_TREASURY");
  const charges = await listPendingCharges(ampaId);
  const cashFlow = await getCashFlowForecast(ampaId);
  const expenseForecasts = await listExpenseForecasts(ampaId);

  return <ChargesPageContent charges={charges} cashFlow={cashFlow} expenseForecasts={expenseForecasts} />;
}

function ChargesPageContent({
  charges,
  cashFlow,
  expenseForecasts,
}: {
  charges: Awaited<ReturnType<typeof listPendingCharges>>;
  cashFlow: Awaited<ReturnType<typeof getCashFlowForecast>>;
  expenseForecasts: Awaited<ReturnType<typeof listExpenseForecasts>>;
}): React.ReactElement {
  const t = useTranslations("board.charges");
  const tTreasury = useTranslations("board.treasury");

  // Feedback de usuario (2026-08-11): dashboard resumen arriba, tabla abajo.
  // "Atrasado" es el mismo cálculo derivado que usa la previsión de
  // tesorería (Charge.status nunca pasa a OVERDUE en la base de datos — se
  // calcula al vuelo comparando con la fecha de hoy).
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

      {/* Impagos y previsión de tesorería (Fase 2) — visible solo para
          MANAGE_TREASURY, mismo permiso/página que el resto de /charges. */}
      <div className="mb-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{tTreasury("forecastTitle")}</h2>
          <Table>
            <THead>
              <TR>
                <TH>{tTreasury("month")}</TH>
                <TH>{tTreasury("income")}</TH>
                <TH>{tTreasury("expenses")}</TH>
                <TH>{tTreasury("net")}</TH>
              </TR>
            </THead>
            <TBody>
              {cashFlow.map((row) => (
                <TR key={row.month}>
                  <TD className="font-medium">{row.month}</TD>
                  <TD>{formatCurrency(row.income)}</TD>
                  <TD>{formatCurrency(row.expenses)}</TD>
                  <TD className={row.net < 0 ? "text-danger-fg" : "text-success-fg"}>{formatCurrency(row.net)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{tTreasury("expenseForecastsTitle")}</h2>
          {expenseForecasts.length === 0 ? (
            <p className="text-sm text-ink-700">{tTreasury("noExpenseForecasts")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {expenseForecasts.map((expense) => (
                <li key={expense.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-ink-900">{expense.description}</div>
                    <div className="text-ink-700">
                      {formatCurrency(expense.amount)} — {new Date(expense.expectedDate).toLocaleDateString("es-ES")}
                    </div>
                  </div>
                  {expense.status === "PAID" ? (
                    <Badge variant="success">{tTreasury("expensePaid")}</Badge>
                  ) : (
                    <MarkExpensePaidButton expenseForecastId={expense.id} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{tTreasury("addExpense")}</h2>
          <CreateExpenseForecastForm />
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
