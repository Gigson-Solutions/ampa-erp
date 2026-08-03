import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { listDocuments } from "@/lib/documents";

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

  if (documents.length === 0) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-4">{t("empty")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <ul className="mt-6 flex flex-col gap-2">
        {documents.map((document) => (
          <li key={document.id}>
            <a href={document.url} target="_blank" rel="noreferrer">
              {document.title}
            </a>
            {document.category && <span> — {document.category}</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
