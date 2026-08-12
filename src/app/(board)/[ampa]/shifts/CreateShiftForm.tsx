"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createShiftAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

export function CreateShiftForm({ taskId }: { taskId: string }): React.ReactElement {
  const t = useTranslations("board.shifts");
  const router = useRouter();

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await createShiftAction({
      taskId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      location,
      capacity: capacity ? Number(capacity) : undefined,
    });

    if (result.ok) {
      setStartsAt("");
      setEndsAt("");
      setLocation("");
      setCapacity("");
      setStatus("idle");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <Label htmlFor={`shift-starts-${taskId}`}>{t("shiftStartsAt")}</Label>
          <Input
            id={`shift-starts-${taskId}`}
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </FormField>
        <FormField>
          <Label htmlFor={`shift-ends-${taskId}`}>{t("shiftEndsAt")}</Label>
          <Input
            id={`shift-ends-${taskId}`}
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </FormField>
      </div>
      <FormField>
        <Label htmlFor={`shift-location-${taskId}`}>{t("shiftLocation")}</Label>
        <Input
          id={`shift-location-${taskId}`}
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </FormField>
      <FormField>
        <Label htmlFor={`shift-capacity-${taskId}`}>{t("shiftCapacity")}</Label>
        <Input
          id={`shift-capacity-${taskId}`}
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder={t("shiftCapacityPlaceholder")}
        />
      </FormField>
      {status === "error" && error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" size="sm" variant="tertiary" disabled={status === "submitting"} className="self-start">
        {status === "submitting" ? t("submitting") : t("createShift")}
      </Button>
    </form>
  );
}
