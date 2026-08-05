"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { exportDataAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function ExportButton(): React.ReactElement {
  const t = useTranslations("board.export");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleExport(): Promise<void> {
    setStatus("submitting");
    setError(null);

    const result = await exportDataAction();

    if (result.ok && result.json) {
      const blob = new Blob([result.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ampa-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  return (
    <div>
      <Button type="button" onClick={handleExport} disabled={status === "submitting"} variant="secondary">
        <Download size={16} />
        {status === "submitting" ? t("exporting") : t("export")}
      </Button>
      {status === "error" && error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </div>
  );
}
