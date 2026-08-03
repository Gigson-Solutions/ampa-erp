"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { registerFamilyForEventAction } from "./actions";
import type { EventSummary, FamilySummary } from "@/lib/board-directory";

interface RegisterFamilyFormProps {
  events: EventSummary[];
  families: FamilySummary[];
}

export function RegisterFamilyForm({ events, families }: RegisterFamilyFormProps): React.ReactElement {
  const t = useTranslations("board.events");
  const router = useRouter();

  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [familyId, setFamilyId] = useState(families[0]?.id ?? "");
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const result = await registerFamilyForEventAction({ eventId, familyId, attendeeCount });

    if (result.ok) {
      setStatus("idle");
      setMessage(result.status === "WAITLISTED" ? t("waitlisted") : t("registered"));
      router.refresh();
    } else {
      setStatus("error");
      setMessage(result.error ?? t("genericError"));
    }
  }

  if (events.length === 0 || families.length === 0) {
    return <p role="alert">{t("noEventsOrFamilies")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="register-event">{t("event")}</label>
        <select id="register-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} ({event.registeredAttendees}
              {event.capacity !== null ? `/${event.capacity}` : ""})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="register-family">{t("family")}</label>
        <select id="register-family" value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
          {families.map((family) => (
            <option key={family.id} value={family.id}>
              {family.referenceCode}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="register-attendees">{t("attendeeCount")}</label>
        <input
          id="register-attendees"
          type="number"
          min={1}
          value={attendeeCount}
          onChange={(e) => setAttendeeCount(Number(e.target.value))}
        />
      </div>
      {message && <p role={status === "error" ? "alert" : "status"}>{message}</p>}
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("register")}
      </button>
    </form>
  );
}
