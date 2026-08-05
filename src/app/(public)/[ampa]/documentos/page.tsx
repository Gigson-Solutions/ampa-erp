import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { listDocuments } from "@/lib/documents";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

interface PageProps {
  params: Promise<{ ampa: string }>;
}

// Repositorio de documentos público — igual criterio que el tablón: son
// documentos publicados a propósito para toda la AMPA, no hace falta sesión.
export default async function DocumentosPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampa: subdomain } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  const documents = await listDocuments(ampa.id);

  return <DocumentosContent documents={documents} />;
}

function DocumentosContent({
  documents,
}: {
  documents: Awaited<ReturnType<typeof listDocuments>>;
}): React.ReactElement {
  const t = useTranslations("documentos");

  return (
    <div>
      <PageHeader title={t("title")} />

      {documents.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">{t("empty")}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <li key={document.id}>
              <a
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm hover:bg-page"
              >
                <FileText size={18} className="shrink-0 text-ink-400" />
                <span className="font-medium text-brand-500">{document.title}</span>
                {document.category && <span className="text-ink-700">— {document.category}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
