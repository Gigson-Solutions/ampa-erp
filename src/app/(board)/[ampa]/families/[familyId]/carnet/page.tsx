import { redirect } from "next/navigation";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { getOrCreateFamilyCardToken } from "@/lib/card";

interface PageProps {
  params: Promise<{ ampa: string; familyId: string }>;
}

// Puente para la junta: genera (si no existía) el token de carnet de una familia
// y redirige a la misma vista pública que ve la familia — útil para familias que
// se dieron de alta antes de que existiera esta pieza, o que perdieron su enlace.
export default async function BoardCarnetRedirectPage({ params }: PageProps): Promise<never> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");
  const { ampa: ampaSubdomain, familyId } = await params;

  const token = await getOrCreateFamilyCardToken(ampaId, familyId);
  redirect(`/${ampaSubdomain}/carnet/${token}`);
}
