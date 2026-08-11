import { notFound } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { getFamilyDetail, listFeeSchemas } from "@/lib/board-directory";
import { AddStudentForm } from "./AddStudentForm";
import { AddContactForm } from "./AddContactForm";
import { InvitePortalButton } from "./InvitePortalButton";
import { CreateMembershipForm } from "../../memberships/CreateMembershipForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

interface PageProps {
  params: Promise<{ ampa: string; familyId: string }>;
}

// Ficha de familia (feedback de usuario, 2026-08-11): punto único para ver
// tutores, gestionar alumnos/as y dar de alta una membresía SIN tener que
// volver a elegir la familia (ya se llegó aquí desde una familia concreta).
export default async function FamilyDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");
  const { ampa: ampaSubdomain, familyId } = await params;

  const family = await getFamilyDetail(ampaId, familyId);
  if (!family) notFound();

  const feeSchemas = await listFeeSchemas(ampaId);

  return <FamilyDetailContent family={family} feeSchemas={feeSchemas} ampaSubdomain={ampaSubdomain} />;
}

function FamilyDetailContent({
  family,
  feeSchemas,
  ampaSubdomain,
}: {
  family: NonNullable<Awaited<ReturnType<typeof getFamilyDetail>>>;
  feeSchemas: Awaited<ReturnType<typeof listFeeSchemas>>;
  ampaSubdomain: string;
}): React.ReactElement {
  const t = useTranslations("board.familyDetail");
  const tFamilies = useTranslations("board.families");

  const membershipFamilyOption = [
    {
      id: family.id,
      referenceCode: family.referenceCode,
      guardianNames: family.guardians.map((guardian) => guardian.name),
      studentCount: family.students.length,
    },
  ];

  return (
    <>
      <PageHeader
        title={`${t("title")} — ${family.referenceCode}`}
        actions={
          <Link href="../../families" className="text-sm text-brand-500 hover:underline">
            {t("backToFamilies")}
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("guardiansTitle")}</h2>
          {family.guardians.length === 0 ? (
            <p className="text-sm text-ink-700">{t("noGuardians")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {family.guardians.map((guardian) => (
                <li key={guardian.id} className="text-sm">
                  <div className="flex items-center gap-2 font-medium text-ink-900">
                    {guardian.name}
                    {guardian.isLegalMember && <Badge variant="info">{t("legalMember")}</Badge>}
                  </div>
                  <div className="text-ink-700">{guardian.email}</div>
                  {guardian.phone && <div className="text-ink-700">{guardian.phone}</div>}
                  <div className="mt-1">
                    {guardian.hasPortalAccess ? (
                      <span className="text-xs text-ink-400">{t("portalAccessGranted")}</span>
                    ) : (
                      <InvitePortalButton guardianId={guardian.id} ampaSubdomain={ampaSubdomain} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{tFamilies("createMembership")}</h2>
          <CreateMembershipForm
            families={membershipFamilyOption}
            feeSchemas={feeSchemas}
            preselectedFamilyId={family.id}
            hideFamilySelector
          />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("studentsTitle")}</h2>
          {family.students.length === 0 ? (
            <p className="text-sm text-ink-700">{t("noStudents")}</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>{t("studentName")}</TH>
                  <TH>{t("studentBirthDate")}</TH>
                </TR>
              </THead>
              <TBody>
                {family.students.map((student) => (
                  <TR key={student.id}>
                    <TD>{student.name}</TD>
                    <TD>{student.birthDate ? new Date(student.birthDate).toLocaleDateString("es-ES") : "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("addStudent")}</h2>
          <AddStudentForm familyId={family.id} />
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("addContact")}</h2>
          <p className="mb-4 text-sm text-ink-700">{t("addContactHint")}</p>
          <AddContactForm familyId={family.id} />
        </Card>
      </div>
    </>
  );
}
