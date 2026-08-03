import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { getFamilyCardByToken } from "@/lib/card";

interface PageProps {
  params: Promise<{ ampa: string; token: string }>;
}

async function resolveCardUrl(ampaSubdomain: string, token: string): Promise<string> {
  // El QR codifica la URL absoluta de esta misma página — quien lo escanea (un
  // monitor, en la entrada de un evento) llega a la misma vista de verificación
  // que la familia ya tiene guardada en su móvil, sin sesión.
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}/${ampaSubdomain}/carnet/${token}`;
}

export default async function CarnetPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampa: subdomain, token } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  const card = await getFamilyCardByToken(ampa.id, token);
  if (!card) notFound();

  const cardUrl = await resolveCardUrl(subdomain, token);
  const qrDataUrl = await QRCode.toDataURL(cardUrl, { margin: 1, width: 240 });

  return <CarnetContent card={card} qrDataUrl={qrDataUrl} />;
}

function CarnetContent({
  card,
  qrDataUrl,
}: {
  card: NonNullable<Awaited<ReturnType<typeof getFamilyCardByToken>>>;
  qrDataUrl: string;
}): React.ReactElement {
  const t = useTranslations("carnet");

  const statusLabel = {
    ACTIVE: t("statusActive"),
    PENDING: t("statusPending"),
    CANCELLED: t("statusCancelled"),
    NONE: t("statusNone"),
  }[card.membershipStatus];

  return (
    <main className="mx-auto max-w-sm p-8 text-center">
      <h1 className="text-xl font-semibold">{card.ampaName}</h1>
      <p className="mt-1 text-gray-600">{t("subtitle")}</p>

      {/* eslint-disable-next-line @next/next/no-img-element -- data URI generado en servidor, no una imagen optimizable de Next */}
      <img src={qrDataUrl} alt={t("qrAlt")} className="mx-auto mt-6" width={240} height={240} />

      <div className="mt-6">
        <p className="font-semibold">{card.referenceCode}</p>
        <p>
          {t("status")}: {statusLabel}
        </p>
        {card.academicYearLabel && (
          <p>
            {t("academicYear")}: {card.academicYearLabel}
          </p>
        )}
      </div>
    </main>
  );
}
