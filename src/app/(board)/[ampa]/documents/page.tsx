import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listDocuments } from "@/lib/documents";
import { DocumentForm } from "./DocumentForm";

export default async function DocumentsPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_COMMUNICATIONS");
  const documents = await listDocuments(ampaId);

  return <DocumentsPageContent documents={documents} />;
}

function DocumentsPageContent({
  documents,
}: {
  documents: Awaited<ReturnType<typeof listDocuments>>;
}): React.ReactElement {
  const t = useTranslations("board.documents");

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <div className="mt-6">
        <DocumentForm />
      </div>
      <ul className="mt-8 flex flex-col gap-2">
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
