// Tipo local en vez de importar el de @auth/core/providers/nodemailer: ese tipo
// interno referencia el paquete "nodemailer" completo (transports SMTP/SES/etc.)
// que no necesitamos, ya que sustituimos `sendVerificationRequest` por completo.
interface MagicLinkRequest {
  identifier: string;
  url: string;
  provider: { from?: string };
}

// Envío del email de magic link vía Amazon SES (decisión de infra: SES en vez de
// Resend — ver plan de visión, sección "Infra"). En desarrollo, si no hay
// credenciales de AWS configuradas, se limita a loguear el enlace en consola para
// no bloquear el flujo de desarrollo local.
export async function sendVerificationRequest({
  identifier: email,
  url,
  provider,
}: MagicLinkRequest): Promise<void> {
  const hasAwsCredentials =
    !!process.env["AWS_ACCESS_KEY_ID"] && !!process.env["AWS_SECRET_ACCESS_KEY"];

  if (!hasAwsCredentials) {
    console.log(`[dev] Magic link para ${email}: ${url}`);
    return;
  }

  const { SESv2Client, SendEmailCommand } = await import("@aws-sdk/client-sesv2");
  const client = new SESv2Client({ region: process.env["AWS_REGION"] ?? "eu-west-1" });

  await client.send(
    new SendEmailCommand({
      FromEmailAddress: provider.from ?? process.env["AUTH_EMAIL_FROM"],
      Destination: { ToAddresses: [email] },
      Content: {
        Simple: {
          Subject: { Data: "Tu enlace de acceso al AMPA" },
          Body: {
            Html: { Data: `<p>Accede haciendo clic en el siguiente enlace:</p><p><a href="${url}">${url}</a></p>` },
            Text: { Data: `Accede con este enlace: ${url}` },
          },
        },
      },
    }),
  );
}
