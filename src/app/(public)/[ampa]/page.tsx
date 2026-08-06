import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getUserRolesForAmpa } from "@/lib/authz";
import { Button } from "@/components/ui/Button";

interface PageProps {
  params: Promise<{ ampa: string }>;
}

// Ruta pública por AMPA (resuelta por subdominio en producción; el segmento
// `[ampa]` de la URL solo es el fallback local sin subdominios reales, p.ej.
// `localhost:3000/campanar`).
//
// Importante: esta es la ÚNICA puerta de entrada visible para llegar al panel de
// junta — antes no había ningún enlace entre la web pública y `/[ampa]/families`
// etc., así que alguien que iniciaba sesión no tenía forma de encontrar el panel.
// Aquí se comprueba (sin exigir sesión) si el visitante ya tiene un rol en esta
// AMPA para enlazar directamente al panel, o a `/login` con el `callbackUrl`
// correcto en caso contrario.
export default async function AmpaPublicPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampa: subdomain } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  const session = await auth();
  const hasBoardAccess = session?.user?.id
    ? (await getUserRolesForAmpa(session.user.id, ampa.id)).length > 0
    : false;

  return <AmpaWelcome name={ampa.name} subdomain={subdomain} hasBoardAccess={hasBoardAccess} />;
}

function AmpaWelcome({
  name,
  subdomain,
  hasBoardAccess,
}: {
  name: string;
  subdomain: string;
  hasBoardAccess: boolean;
}): React.ReactElement {
  const t = useTranslations("common");
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">{t("welcome")}</h1>
      <p className="mt-2 text-ink-700">{name}</p>

      <div className="mt-6">
        {hasBoardAccess ? (
          <Link href={`/${subdomain}/families`}>
            <Button variant="primary">{t("goToBoard")}</Button>
          </Link>
        ) : (
          <Link href={`/login?callbackUrl=${encodeURIComponent(`/${subdomain}/families`)}`}>
            <Button variant="secondary">{t("boardLogin")}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
