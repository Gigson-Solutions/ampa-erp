import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ ampa: string }>;
}

// Ruta pública por AMPA (resuelta por subdominio en producción; el segmento
// `[ampa]` de la URL solo es el fallback local sin subdominios reales, p.ej.
// `localhost:3000/riberadeltajo`). Fase 0: solo confirma que el AMPA existe.
export default async function AmpaPublicPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampa: subdomain } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  return <AmpaWelcome name={ampa.name} />;
}

function AmpaWelcome({ name }: { name: string }): React.ReactElement {
  const t = useTranslations("common");
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">{t("welcome")}</h1>
      <p className="mt-2 text-ink-700">{name}</p>
    </div>
  );
}
