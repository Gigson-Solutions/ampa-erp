"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createActivityAction } from "./actions";
import type { AcademicYearSummary } from "@/lib/board-directory";

export function CreateActivityForm({ academicYears }: { academicYears: AcademicYearSummary[] }): React.ReactElement {
  const t = useTranslations("board.activities");
  const router = useRouter();

  const [name, setName] = useState("");
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id ?? "");
  const [capacity, setCapacity] = useState<string>("");
  const [price, setPrice] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await createActivityAction({
      name,
      academicYearId,
      price,
      capacity: capacity ? Number(capacity) : undefined,
    });

    if (result.ok) {
      setName("");
      setCapacity("");
      setPrice(0);
      setStatus("idle");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  if (academicYears.length === 0) {
    return <p role="alert">{t("noAcademicYears")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="activity-name">{t("name")}</label>
        <input id="activity-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="activity-year">{t("academicYear")}</label>
        <select id="activity-year" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="activity-capacity">{t("capacity")}</label>
        <input
          id="activity-capacity"
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder={t("capacityPlaceholder")}
        />
      </div>
      <div>
        <label htmlFor="activity-price">{t("price")}</label>
        <input
          id="activity-price"
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
      </div>
      {status === "error" && error && <p role="alert">{error}</p>}
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("createActivity")}
      </button>
    </form>
  );
}
