import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listFamilies, listFeeSchemas } from "@/lib/board-directory";
import { CreateMembershipForm } from "./CreateMembershipForm";

interface PageProps {
  searchParams: Promise<{ familyId?: string }>;
}

// Gate de autorización ANTES de renderizar nada — si el usuario no tiene sesión o
// no tiene rol de gestión de socios para esta AMPA concreta, ni siquiera se llega a
// pintar el formulario (ver src/lib/require-ampa-session.ts).
export default async function MembershipsPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");
  const { familyId } = await searchParams;

  const [families, feeSchemas] = await Promise.all([listFamilies(ampaId), listFeeSchemas(ampaId)]);

  return (
    <MembershipsPageContent families={families} feeSchemas={feeSchemas} preselectedFamilyId={familyId} />
  );
}

function MembershipsPageContent({
  families,
  feeSchemas,
  preselectedFamilyId,
}: {
  families: Awaited<ReturnType<typeof listFamilies>>;
  feeSchemas: Awaited<ReturnType<typeof listFeeSchemas>>;
  preselectedFamilyId?: string;
}): React.ReactElement {
  const t = useTranslations("board.memberships");
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <div className="mt-6">
        <CreateMembershipForm
          families={families}
          feeSchemas={feeSchemas}
          preselectedFamilyId={preselectedFamilyId}
        />
      </div>
    </main>
  );
}
