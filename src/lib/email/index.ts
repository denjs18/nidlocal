/**
 * Bibliothèque d'envoi d'e-mails — NidLocal
 *
 * Utilise Nodemailer avec un transport SMTP configuré via les variables
 * d'environnement. En l'absence de configuration, les e-mails sont affichés
 * dans la console (mode développement).
 *
 * Variables d'environnement requises en production :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */

import { formatDate } from "@/lib/utils/formatting";

// ─── Configuration ────────────────────────────────────────────────────────────

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "NidLocal <noreply@nidlocal.fr>";

function isConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

// ─── Transporter (chargé à la demande) ───────────────────────────────────────

type Transporter = {
  sendMail: (options: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }) => Promise<unknown>;
};

let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter | null> {
  if (!isConfigured()) return null;
  if (_transporter) return _transporter;

  // Import dynamique pour éviter les erreurs de build si nodemailer est absent
  const nodemailer = await import("nodemailer");
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  }) as Transporter;

  return _transporter;
}

// ─── Envoi générique ──────────────────────────────────────────────────────────

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transporter = await getTransporter();

  if (!transporter) {
    // Mode développement : afficher dans la console
    console.log(
      [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        `[EMAIL] À : ${options.to}`,
        `[EMAIL] Sujet : ${options.subject}`,
        "[EMAIL] (SMTP non configuré — e-mail non envoyé)",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    );
    return;
  }

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

// ─── Helpers de formatage ─────────────────────────────────────────────────────

function formatAmount(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(euros);
}

// ─── Base HTML ────────────────────────────────────────────────────────────────

function wrapHtml(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- En-tête -->
          <tr>
            <td style="background:#10b981;padding:24px 32px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">NidLocal</span>
            </td>
          </tr>
          <!-- Contenu -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Pied de page -->
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
                Vous recevez cet e-mail car vous êtes inscrit sur NidLocal.<br />
                NidLocal — La location de vacances responsable en France.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Fonctions publiques ──────────────────────────────────────────────────────

/**
 * Confirmation de réservation envoyée au voyageur.
 */
export async function sendBookingConfirmationEmail(params: {
  to: string;
  guestName: string;
  listingTitle: string;
  checkIn: Date;
  checkOut: Date;
  totalAmount: number; // centimes
  bookingId: string;
}): Promise<void> {
  const { to, guestName, listingTitle, checkIn, checkOut, totalAmount, bookingId } = params;

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
      Réservation confirmée !
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;">
      Bonjour ${guestName}, votre réservation a bien été enregistrée.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">
            ${listingTitle}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#374151;width:50%;">
                <strong>Arrivée</strong>
              </td>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                ${formatDate(checkIn)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                <strong>Départ</strong>
              </td>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                ${formatDate(checkOut)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                <strong>Total</strong>
              </td>
              <td style="padding:4px 0;font-size:14px;font-weight:600;color:#10b981;">
                ${formatAmount(totalAmount)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                <strong>Référence</strong>
              </td>
              <td style="padding:4px 0;font-size:12px;font-family:monospace;color:#6b7280;">
                #${bookingId}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">
      Retrouvez tous les détails de votre séjour dans votre espace personnel.
    </p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://nidlocal.fr"}/account/bookings/${bookingId}"
      style="display:inline-block;background:#10b981;color:#ffffff;font-weight:600;font-size:14px;
             text-decoration:none;padding:12px 24px;border-radius:10px;">
      Voir ma réservation
    </a>
  `;

  await sendEmail({
    to,
    subject: `Réservation confirmée — ${listingTitle}`,
    html: wrapHtml(content, "Confirmation de réservation"),
  });
}

/**
 * Notification de nouvelle demande de réservation envoyée à l'hôte.
 */
export async function sendBookingRequestEmail(params: {
  to: string; // email de l'hôte
  hostName: string;
  guestName: string;
  listingTitle: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  bookingId: string;
}): Promise<void> {
  const { to, hostName, guestName, listingTitle, checkIn, checkOut, guests, bookingId } = params;

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
      Nouvelle demande de réservation
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;">
      Bonjour ${hostName}, vous avez reçu une demande de séjour pour votre logement.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">
            ${listingTitle}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#374151;width:50%;">
                <strong>Voyageur</strong>
              </td>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                ${guestName}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                <strong>Arrivée</strong>
              </td>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                ${formatDate(checkIn)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                <strong>Départ</strong>
              </td>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                ${formatDate(checkOut)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                <strong>Voyageurs</strong>
              </td>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                ${guests} voyageur${guests > 1 ? "s" : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#374151;">
                <strong>Référence</strong>
              </td>
              <td style="padding:4px 0;font-size:12px;font-family:monospace;color:#6b7280;">
                #${bookingId}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:14px;color:#4b5563;">
      Vous avez <strong>24 heures</strong> pour accepter ou refuser cette demande.
      Passé ce délai, elle sera automatiquement annulée.
    </p>

    <p style="margin:0 0 20px;font-size:14px;color:#4b5563;">
      Rendez-vous dans votre espace hôte pour répondre à cette demande.
    </p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://nidlocal.fr"}/host/bookings/${bookingId}"
      style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:600;font-size:14px;
             text-decoration:none;padding:12px 24px;border-radius:10px;">
      Répondre à la demande
    </a>
  `;

  await sendEmail({
    to,
    subject: `Nouvelle demande de réservation — ${listingTitle}`,
    html: wrapHtml(content, "Demande de réservation"),
  });
}

/**
 * Notification d'annulation envoyée au voyageur ou à l'hôte.
 */
export async function sendCancellationEmail(params: {
  to: string;
  name: string;
  listingTitle: string;
  bookingId: string;
}): Promise<void> {
  const { to, name, listingTitle, bookingId } = params;

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
      Réservation annulée
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;">
      Bonjour ${name}, votre réservation pour le logement suivant a été annulée.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#111827;">
            ${listingTitle}
          </p>
          <p style="margin:0;font-size:14px;font-family:monospace;color:#6b7280;">
            Réf. #${bookingId}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:14px;color:#4b5563;">
      Si un remboursement est prévu selon la politique d&apos;annulation applicable,
      il sera effectué dans les <strong>5 à 10 jours ouvrés</strong>.
    </p>

    <p style="margin:0 0 20px;font-size:14px;color:#4b5563;">
      Si vous avez des questions, n&apos;hésitez pas à nous contacter.
    </p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://nidlocal.fr"}/search"
      style="display:inline-block;background:#10b981;color:#ffffff;font-weight:600;font-size:14px;
             text-decoration:none;padding:12px 24px;border-radius:10px;">
      Chercher un autre logement
    </a>
  `;

  await sendEmail({
    to,
    subject: `Annulation de réservation — ${listingTitle}`,
    html: wrapHtml(content, "Annulation de réservation"),
  });
}
