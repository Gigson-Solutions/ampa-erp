"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createDocumentAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

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
      <FormField>
        <Label htmlFor="document-title">{t("titleLabel")}</Label>
        <Input id="document-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormField>
      <FormField>
        <Label htmlFor="document-url">{t("urlLabel")}</Label>
        <Input
          id="document-url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />
      </FormField>
      <FormField>
        <Label htmlFor="document-category">{t("categoryLabel")}</Label>
        <Input id="document-category" value={category} onChange={(e) => setCategory(e.target.value)} />
      </FormField>
      {status === "error" && error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("add")}
      </Button>
    </form>
  );
}
