"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createAnnouncementAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label, Textarea } from "@/components/ui/Input";

export function AnnouncementForm(): React.ReactElement {
  const t = useTranslations("board.announcements");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await createAnnouncementAction({ title, body });

    if (result.ok) {
      setTitle("");
      setBody("");
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
        <Label htmlFor="announcement-title">{t("titleLabel")}</Label>
        <Input id="announcement-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormField>
      <FormField>
        <Label htmlFor="announcement-body">{t("bodyLabel")}</Label>
        <Textarea id="announcement-body" required value={body} onChange={(e) => setBody(e.target.value)} />
      </FormField>
      {status === "error" && error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("publish")}
      </Button>
    </form>
  );
}
