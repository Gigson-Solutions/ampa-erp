import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { CreateMembershipForm } from "./CreateMembershipForm";

// Gate de autorización ANTES de renderizar nada — si el usuario no tiene sesión o
// no tiene rol de gestión de socios para esta AMPA concreta, ni siquiera se llega a
// pintar el formulario (ver src/lib/require-ampa-session.ts).
export default async function MembershipsPage(): Promise<React.ReactElement> {
  await requireAmpaRole("MANAGE_MEMBERS");

  return <MembershipsPageContent />;
}

function MembershipsPageContent(): React.ReactElement {
  const t = useTranslations("board.memberships");
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <div className="mt-6">
        <CreateMembershipForm />
      </div>
    </main>
  );
}
