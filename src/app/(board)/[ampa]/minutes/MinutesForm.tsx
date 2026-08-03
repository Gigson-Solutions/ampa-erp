"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createMinutesEntryAction } from "./actions";

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
      <p className="text-sm text-gray-600">{t("immutableNotice")}</p>
      <div>
        <label htmlFor="minutes-title">{t("titleLabel")}</label>
        <input id="minutes-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="minutes-body">{t("bodyLabel")}</label>
        <textarea id="minutes-body" required value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div>
        <label htmlFor="minutes-signed-by">{t("signedByLabel")}</label>
        <input
          id="minutes-signed-by"
          required
          value={signedByName}
          onChange={(e) => setSignedByName(e.target.value)}
        />
      </div>
      {status === "error" && error && <p role="alert">{error}</p>}
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("addEntry")}
      </button>
    </form>
  );
}
