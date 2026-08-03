"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createAnnouncementAction } from "./actions";

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
      <div>
        <label htmlFor="announcement-title">{t("titleLabel")}</label>
        <input id="announcement-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="announcement-body">{t("bodyLabel")}</label>
        <textarea id="announcement-body" required value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      {status === "error" && error && <p role="alert">{error}</p>}
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("publish")}
      </button>
    </form>
  );
}
