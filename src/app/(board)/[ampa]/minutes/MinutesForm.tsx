"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createMinutesEntryAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label, Textarea } from "@/components/ui/Input";

export function MinutesForm(): React.ReactElement {
  const t = useTranslations("board.minutes");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [signedByName, setSignedByName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await createMinutesEntryAction({ title, body, signedByName });

    if (result.ok) {
      setTitle("");
      setBody("");
      setSignedByName("");
      setStatus("idle");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-700">{t("immutableNotice")}</p>
      <FormField>
        <Label htmlFor="minutes-title">{t("titleLabel")}</Label>
        <Input id="minutes-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormField>
      <FormField>
        <Label htmlFor="minutes-body">{t("bodyLabel")}</Label>
        <Textarea id="minutes-body" required value={body} onChange={(e) => setBody(e.target.value)} />
      </FormField>
      <FormField>
        <Label htmlFor="minutes-signed-by">{t("signedByLabel")}</Label>
        <Input
          id="minutes-signed-by"
          required
          value={signedByName}
          onChange={(e) => setSignedByName(e.target.value)}
        />
      </FormField>
      {status === "error" && error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("addEntry")}
      </Button>
    </form>
  );
}
