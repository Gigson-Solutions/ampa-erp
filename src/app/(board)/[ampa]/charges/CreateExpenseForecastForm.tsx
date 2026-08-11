"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createExpenseForecastAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

export function CreateExpenseForecastForm(): React.ReactElement {
  const t = useTranslations("board.treasury");
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await createExpenseForecastAction({
      description,
      amount: Number(amount),
      expectedDate: new Date(expectedDate),
    });

    if (result.ok) {
      setStatus("idle");
      setDescription("");
      setAmount("");
      setExpectedDate("");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FormField>
        <Label htmlFor="expense-description">{t("expenseDescription")}</Label>
        <Input
          id="expense-description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>
      <FormField>
        <Label htmlFor="expense-amount">{t("expenseAmount")}</Label>
        <Input
          id="expense-amount"
          type="number"
          min={0.01}
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </FormField>
      <FormField>
        <Label htmlFor="expense-date">{t("expenseExpectedDate")}</Label>
        <Input
          id="expense-date"
          type="date"
          required
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
        />
      </FormField>
      {status === "error" && error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" variant="secondary" size="sm" disabled={status === "submitting"} className="self-start">
        {status === "submitting" ? t("submitting") : t("addExpense")}
      </Button>
    </form>
  );
}
