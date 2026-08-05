import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listDocuments } from "@/lib/documents";
import { DocumentForm } from "./DocumentForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

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
    <div className="max-w-2xl">
      <PageHeader title={t("title")} />
      <Card>
        <DocumentForm />
      </Card>
      <ul className="mt-6 flex flex-col gap-2">
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
    </div>
  );
}
