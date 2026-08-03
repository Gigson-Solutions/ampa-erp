import Link from "next/link";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listFamilies } from "@/lib/board-directory";

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

  if (families.length === 0) {
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
            <th>{t("referenceCode")}</th>
            <th>{t("guardians")}</th>
            <th>{t("students")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {families.map((family) => (
            <tr key={family.id}>
              <td>{family.referenceCode}</td>
              <td>{family.guardianNames.join(", ") || "—"}</td>
              <td>{family.studentCount}</td>
              <td>
                <Link href={`memberships?familyId=${family.id}`}>{t("createMembership")}</Link>
                {" · "}
                <Link href={`families/${family.id}/carnet`}>{t("viewCard")}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
