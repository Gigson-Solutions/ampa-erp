"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createDocumentAction } from "./actions";

export function DocumentForm(): React.ReactElement {
  const t = useTranslations("board.documents");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await createDocumentAction({ title, url, category: category || undefined });

    if (result.ok) {
      setTitle("");
      setUrl("");
      setCategory("");
      setStatus("idle");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="document-title">{t("titleLabel")}</label>
        <input id="document-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="document-url">{t("urlLabel")}</label>
        <input
          id="document-url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div>
        <label htmlFor="document-category">{t("categoryLabel")}</label>
        <input id="document-category" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      {status === "error" && error && <p role="alert">{error}</p>}
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("add")}
      </button>
    </form>
  );
}
