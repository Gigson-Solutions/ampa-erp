import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listMembers } from "@/lib/members";
import { EndMembershipButton } from "./EndMembershipButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

// Libro de socios (LO 1/2002) — registro de asociados con alta y baja. Un
// socio/a es una persona por familia (el tutor legal, `Guardian.isLegalMember`),
// no la familia en sí. Ver src/lib/members.ts.
export default async function MembersPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");
  const members = await listMembers(ampaId);

  return <MembersPageContent members={members} />;
}

function MembersPageContent({
  members,
}: {
  members: Awaited<ReturnType<typeof listMembers>>;
}): React.ReactElement {
  const t = useTranslations("board.members");

  return (
    <>
      <PageHeader title={t("title")} />

      {members.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">{t("empty")}</p>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("name")}</TH>
              <TH>{t("family")}</TH>
              <TH>{t("dni")}</TH>
              <TH>{t("joinedAt")}</TH>
              <TH>{t("status")}</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {members.map((member) => (
              <TR key={member.guardianId}>
                <TD className="font-medium">{member.name}</TD>
                <TD>{member.familyReferenceCode}</TD>
                <TD>{member.dni ?? "—"}</TD>
                <TD>{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("es-ES") : "—"}</TD>
                <TD>
                  {member.active ? (
                    <Badge variant="success">{t("statusActive")}</Badge>
                  ) : (
                    <Badge variant="neutral">{t("statusInactive")}</Badge>
                  )}
                </TD>
                <TD>{member.active && <EndMembershipButton guardianId={member.guardianId} />}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
