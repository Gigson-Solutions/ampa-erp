import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listPendingCharges } from "@/lib/board-directory";
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

  return (
    <>
      <PageHeader title={t("title")} />

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
