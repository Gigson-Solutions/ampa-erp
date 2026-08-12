"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { EventSummary } from "@/lib/board-directory";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const WEEKDAY_LABELS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function buildMonthGrid(year: number, month: number): Array<Date | null> {
  const firstOfMonth = new Date(year, month, 1);
  // Lunes = 0 ... Domingo = 6 (getDay() da Domingo = 0, se rota).
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Feedback de usuario (2026-08-11): la tabla de eventos se sustituye por una
// vista de calendario mensual (no conviven las dos, decisión explícita del
// usuario). Cuadrícula simple con Tailwind — no hace falta ninguna librería
// de calendario nueva, solo hay que pintar día + eventos, sin interacción
// compleja tipo arrastrar/soltar.
export function EventsCalendar({ events }: { events: EventSummary[] }): React.ReactElement {
  const t = useTranslations("board.events");
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  function goToPreviousMonth(): void {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth(): void {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-ink-900 capitalize">{monthLabel}</h2>
        <div className="flex gap-2">
          <Button type="button" variant="tertiary" size="sm" onClick={goToPreviousMonth}>
            {t("previousMonth")}
          </Button>
          <Button type="button" variant="tertiary" size="sm" onClick={goToNextMonth}>
            {t("nextMonth")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border bg-surface">
        {WEEKDAY_LABELS_ES.map((label) => (
          <div key={label} className="border-b border-border bg-page px-2 py-2 text-center text-xs font-semibold text-ink-400 uppercase">
            {label}
          </div>
        ))}
        {cells.map((cellDate, index) => {
          const dayEvents = cellDate ? events.filter((event) => sameDay(new Date(event.date), cellDate)) : [];
          return (
            <div
              key={index}
              className="min-h-[88px] border-b border-r border-border p-1.5 last:border-r-0"
            >
              {cellDate && (
                <>
                  <div className="text-xs text-ink-400">{cellDate.getDate()}</div>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`events/${event.id}`}
                        className="block truncate rounded bg-info-bg px-1.5 py-0.5 text-xs text-info-fg hover:underline"
                        title={event.name}
                      >
                        {event.name}
                        {event.waitlistedCount > 0 && (
                          <Badge variant="warning">{event.waitlistedCount}</Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
