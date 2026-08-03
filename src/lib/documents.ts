import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Fase 1 (ver roadmap): "Documentos: repositorio centralizado". Sin subida de
// ficheros propia todavía — no hay integración de almacenamiento (Cloudflare R2)
// implementada aún (ver plan de visión > Infra), así que esta primera versión solo
// guarda un enlace a un fichero alojado externamente (Google Drive, etc.). Cuando
// exista subida real de ficheros, `url` pasará a ser opcional/derivada en vez de
// obligatoria, sin cambiar la forma del resto de la API.

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  url: z.string().trim().url("Debe ser una URL válida"),
  category: z.string().trim().min(1).max(100).optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export interface DocumentSummary {
  id: string;
  title: string;
  url: string;
  category: string | null;
  createdAt: Date;
}

export async function createDocument(ampaId: string, input: CreateDocumentInput): Promise<{ id: string }> {
  const parsed = createDocumentSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const document = await db.document.create({
      data: {
        ampaId: scopedAmpaId,
        title: parsed.title,
        url: parsed.url,
        category: parsed.category,
      },
    });
    return { id: document.id };
  });
}

export async function listDocuments(ampaId: string): Promise<DocumentSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const documents = await db.document.findMany({ orderBy: { createdAt: "desc" } });
    return documents.map((document) => ({
      id: document.id,
      title: document.title,
      url: document.url,
      category: document.category,
      createdAt: document.createdAt,
    }));
  });
}
