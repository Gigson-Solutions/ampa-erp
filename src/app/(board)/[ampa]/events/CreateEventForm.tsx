"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createEventAction } from "./actions";

export function CreateEventForm(): React.ReactElement {
  const t = useTranslations("board.events");
  const router = useRouter();

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await createEventAction({
      name,
      date: new Date(date),
      capacity: capacity ? Number(capacity) : undefined,
      price: price ? Number(price) : undefined,
    });

    if (result.ok) {
      setName("");
      setDate("");
      setCapacity("");
      setPrice("");
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
        <label htmlFor="event-name">{t("name")}</label>
        <input id="event-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="event-date">{t("date")}</label>
        <input id="event-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label htmlFor="event-capacity">{t("capacity")}</label>
        <input
          id="event-capacity"
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder={t("capacityPlaceholder")}
        />
      </div>
      <div>
        <label htmlFor="event-price">{t("price")}</label>
        <input
          id="event-price"
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t("pricePlaceholder")}
        />
      </div>
      {status === "error" && error && <p role="alert">{error}</p>}
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("createEvent")}
      </button>
    </form>
  );
}
