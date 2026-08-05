import Link from "next/link";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listFamilies } from "@/lib/board-directory";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

export default async function FamiliesPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");
  const families = await listFamilies(ampaId);

  return <FamiliesPageContent families={families} />;
}

function FamiliesPageContent({
  families,
}: {
  families: Awaited<ReturnType<typeof listFamilies>>;
}): React.ReactElement {
  const t = useTranslations("board.families");

  return (
    <>
      <PageHeader title={t("title")} />

      {families.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">{t("empty")}</p>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("referenceCode")}</TH>
              <TH>{t("guardians")}</TH>
              <TH>{t("students")}</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {families.map((family) => (
              <TR key={family.id}>
                <TD className="font-medium">{family.referenceCode}</TD>
                <TD>{family.guardianNames.join(", ") || "—"}</TD>
                <TD>{family.studentCount}</TD>
                <TD>
                  <div className="flex gap-4 text-sm">
                    <Link href={`memberships?familyId=${family.id}`} className="text-brand-500 hover:underline">
                      {t("createMembership")}
                    </Link>
                    <Link href={`families/${family.id}/carnet`} className="text-brand-500 hover:underline">
                      {t("viewCard")}
                    </Link>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
