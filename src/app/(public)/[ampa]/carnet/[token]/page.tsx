import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { getFamilyCardByToken } from "@/lib/card";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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

const STATUS_VARIANT = {
  ACTIVE: "success",
  PENDING: "warning",
  CANCELLED: "danger",
  NONE: "neutral",
} as const;

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
    <div className="mx-auto max-w-sm">
      <Card className="text-center">
        <p className="text-sm text-ink-700">{t("subtitle")}</p>

        {/* eslint-disable-next-line @next/next/no-img-element -- data URI generado en servidor, no una imagen optimizable de Next */}
        <img src={qrDataUrl} alt={t("qrAlt")} className="mx-auto mt-4" width={240} height={240} />

        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-lg font-semibold text-ink-900">{card.referenceCode}</p>
          <Badge variant={STATUS_VARIANT[card.membershipStatus]}>{statusLabel}</Badge>
          {card.academicYearLabel && <p className="text-sm text-ink-700">{card.academicYearLabel}</p>}
        </div>
      </Card>
    </div>
  );
}
