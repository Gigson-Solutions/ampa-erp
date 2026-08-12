import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listShiftTasks } from "@/lib/shifts";
import { listGuardians } from "@/lib/board-directory";
import { CreateShiftTaskForm } from "./CreateShiftTaskForm";
import { CreateShiftForm } from "./CreateShiftForm";
import { AssignGuardianForm } from "./AssignGuardianForm";
import { CancelShiftSignupButton } from "./CancelShiftSignupButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

// Gestión de turnos (Fase 2, renombrada de "voluntariado por turnos" a
// petición del usuario, 2026-08-11).
export default async function ShiftsPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");

  const [tasks, guardians] = await Promise.all([listShiftTasks(ampaId), listGuardians(ampaId)]);

  return <ShiftsPageContent tasks={tasks} guardians={guardians} />;
}

function ShiftsPageContent({
  tasks,
  guardians,
}: {
  tasks: Awaited<ReturnType<typeof listShiftTasks>>;
  guardians: Awaited<ReturnType<typeof listGuardians>>;
}): React.ReactElement {
  const t = useTranslations("board.shifts");

  return (
    <>
      <PageHeader title={t("title")} />

      <div className="mb-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("createTask")}</h2>
          <CreateShiftTaskForm />
        </Card>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">{t("noTasks")}</p>
        </Card>
      ) : (
        tasks.map((task) => (
          <div key={task.id} className="mb-6">
            <Card>
              <h2 className="font-semibold text-ink-900">{task.name}</h2>
              {task.description && <p className="mt-1 text-sm text-ink-700">{task.description}</p>}

              <div className="mt-4 flex flex-col gap-4">
                {task.shifts.map((shift) => (
                  <div key={shift.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium text-ink-900">
                          {new Date(shift.startsAt).toLocaleString("es-ES")} —{" "}
                          {new Date(shift.endsAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-ink-700">{shift.location}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ink-900">
                          {shift.signedUpCount}
                          {shift.capacity !== null ? `/${shift.capacity}` : ""}
                        </span>
                        {shift.waitlistedCount > 0 && (
                          <Badge variant="warning">
                            +{shift.waitlistedCount} {t("waitlistShort")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {shift.signups.length > 0 && (
                      <Table>
                        <THead>
                          <TR>
                            <TH>{t("person")}</TH>
                            <TH>{t("family")}</TH>
                            <TH>{t("status")}</TH>
                            <TH />
                          </TR>
                        </THead>
                        <TBody>
                          {shift.signups.map((signup) => (
                            <TR key={signup.id}>
                              <TD>{signup.guardianName}</TD>
                              <TD>{signup.familyReferenceCode}</TD>
                              <TD>
                                <Badge variant={signup.status === "WAITLISTED" ? "warning" : "success"}>
                                  {signup.status === "WAITLISTED" ? t("waitlisted") : t("signedUp")}
                                </Badge>
                              </TD>
                              <TD>
                                <CancelShiftSignupButton signupId={signup.id} />
                              </TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    )}

                    <div className="mt-3">
                      <AssignGuardianForm shiftId={shift.id} guardians={guardians} />
                    </div>
                  </div>
                ))}

                <div className="rounded-lg border border-dashed border-border p-4">
                  <p className="mb-3 text-sm font-medium text-ink-900">{t("createShift")}</p>
                  <CreateShiftForm taskId={task.id} />
                </div>
              </div>
            </Card>
          </div>
        ))
      )}
    </>
  );
}
