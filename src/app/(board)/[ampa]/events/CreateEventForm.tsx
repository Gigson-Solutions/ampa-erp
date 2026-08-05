"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createEventAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

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
      <FormField>
        <Label htmlFor="event-name">{t("name")}</Label>
        <Input id="event-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField>
        <Label htmlFor="event-date">{t("date")}</Label>
        <Input id="event-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </FormField>
      <FormField>
        <Label htmlFor="event-capacity">{t("capacity")}</Label>
        <Input
          id="event-capacity"
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder={t("capacityPlaceholder")}
        />
      </FormField>
      <FormField>
        <Label htmlFor="event-price">{t("price")}</Label>
        <Input
          id="event-price"
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t("pricePlaceholder")}
        />
      </FormField>
      {status === "error" && error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" disabled={status === "submitting"} variant="secondary">
        {status === "submitting" ? t("submitting") : t("createEvent")}
      </Button>
    </form>
  );
}
