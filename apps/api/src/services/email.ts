import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function buildInviteHtml(restaurantName: string, link: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitation Orvexa</title>
</head>
<body style="margin:0;padding:0;background-color:#f2efe8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2efe8;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#faf8f4;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(36,28,20,0.06),0 1px 2px rgba(36,28,20,0.04);">

          <!-- Header band -->
          <tr>
            <td style="background-color:#d97a2c;padding:32px 40px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Orvexa</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#19140e;line-height:1.3;">
                Bienvenue sur Orvexa
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:rgba(25,20,14,0.62);line-height:1.6;">
                Votre établissement a été configuré sur la plateforme.
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr><td style="height:1px;background-color:rgba(25,20,14,0.08);"></td></tr>
              </table>

              <!-- Restaurant pill -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#fbeed9;border:1px solid rgba(217,122,44,0.32);border-radius:8px;padding:12px 16px;">
                    <span style="font-size:11px;font-weight:600;color:#d97a2c;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:2px;">Restaurant</span>
                    <span style="font-size:16px;font-weight:700;color:#7c3f12;">${restaurantName}</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:15px;color:#19140e;line-height:1.7;">
                Cliquez sur le bouton ci-dessous pour <strong>créer votre mot de passe</strong> et finaliser la configuration de votre espace Orvexa. Vous aurez ensuite accès au tableau de bord, à la gestion des menus, et bien plus.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:8px;background-color:#d97a2c;box-shadow:0 1px 2px rgba(217,122,44,0.32),0 8px 24px rgba(217,122,44,0.24);">
                    <a href="${link}"
                       target="_blank"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.1px;">
                      Configurer mon compte →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0;font-size:12px;color:rgba(25,20,14,0.42);line-height:1.6;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
                <a href="${link}" style="color:#d97a2c;word-break:break-all;">${link}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f2efe8;border-top:1px solid rgba(25,20,14,0.08);padding:20px 40px;">
              <p style="margin:0;font-size:12px;color:rgba(25,20,14,0.42);line-height:1.6;">
                Ce lien est valable <strong>7 jours</strong>. Si vous n'attendiez pas cet e-mail, vous pouvez l'ignorer en toute sécurité.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:rgba(25,20,14,0.28);">
                © ${new Date().getFullYear()} Orvexa — orvexa.tn
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetHtml(restaurantName: string, link: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Réinitialisation du mot de passe</title>
</head>
<body style="margin:0;padding:0;background-color:#f2efe8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2efe8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#faf8f4;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(36,28,20,0.06),0 1px 2px rgba(36,28,20,0.04);">
          <tr>
            <td style="background-color:#d97a2c;padding:32px 40px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Orvexa</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#19140e;line-height:1.3;">
                Réinitialisation du mot de passe
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:rgba(25,20,14,0.62);line-height:1.6;">
                Vous avez demandé à réinitialiser votre mot de passe pour <strong>${restaurantName}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr><td style="height:1px;background-color:rgba(25,20,14,0.08);"></td></tr>
              </table>
              <p style="margin:0 0 28px;font-size:15px;color:#19140e;line-height:1.7;">
                Cliquez sur le bouton ci-dessous pour <strong>choisir un nouveau mot de passe</strong>. Ce lien est valable <strong>1 heure</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:8px;background-color:#d97a2c;box-shadow:0 1px 2px rgba(217,122,44,0.32),0 8px 24px rgba(217,122,44,0.24);">
                    <a href="${link}" target="_blank"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.1px;">
                      Réinitialiser mon mot de passe →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:rgba(25,20,14,0.42);line-height:1.6;">
                Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail — votre mot de passe ne changera pas.<br /><br />
                Si le bouton ne fonctionne pas :<br />
                <a href="${link}" style="color:#d97a2c;word-break:break-all;">${link}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f2efe8;border-top:1px solid rgba(25,20,14,0.08);padding:20px 40px;">
              <p style="margin:0;font-size:12px;color:rgba(25,20,14,0.28);">
                © ${new Date().getFullYear()} Orvexa — orvexa.tn
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

export interface LeadDetails {
  name: string;
  restaurant: string;
  phone: string;
  email?: string;
  message?: string;
}

function buildLeadHtml(lead: LeadDetails): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:rgba(25,20,14,0.55);width:130px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;font-size:15px;color:#19140e;font-weight:600;">${value}</td>
    </tr>`;
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Nouveau prospect Orvexa</title></head>
<body style="margin:0;padding:0;background-color:#f2efe8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2efe8;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#faf8f4;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(36,28,20,0.06),0 1px 2px rgba(36,28,20,0.04);">
        <tr><td style="background-color:#d97a2c;padding:32px 40px;">
          <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Orvexa</span>
        </td></tr>
        <tr><td style="padding:40px 40px 32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#19140e;line-height:1.3;">Nouvelle demande d'essai</h1>
          <p style="margin:0 0 24px;font-size:15px;color:rgba(25,20,14,0.62);line-height:1.6;">Un établissement souhaite commencer avec Orvexa.</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${row('Nom', lead.name)}
            ${row('Restaurant', lead.restaurant)}
            ${row('Téléphone', lead.phone)}
            ${lead.email ? row('E-mail', lead.email) : ''}
            ${lead.message ? row('Message', lead.message) : ''}
          </table>
        </td></tr>
        <tr><td style="background-color:#f2efe8;border-top:1px solid rgba(25,20,14,0.08);padding:20px 40px;">
          <p style="margin:0;font-size:12px;color:rgba(25,20,14,0.28);">© ${new Date().getFullYear()} Orvexa — orvexa.tn</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendLeadEmail(lead: LeadDetails) {
  const to = process.env.LEAD_NOTIFY_EMAIL ?? process.env.SMTP_USER;
  const from = process.env.SMTP_FROM ?? 'Orvexa <noreply@orvexa.tn>';

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !to) {
    console.log('[email] SMTP not configured — new lead received:');
    console.log(`[email] ${JSON.stringify(lead)}`);
    return;
  }

  await createTransport().sendMail({
    from,
    to,
    replyTo: lead.email || undefined,
    subject: `Nouveau prospect Orvexa — ${lead.restaurant}`,
    html: buildLeadHtml(lead),
  });
}

export async function sendPasswordResetEmail(to: string, restaurantName: string, token: string) {
  const adminUrl = process.env.ADMIN_APP_URL ?? 'http://localhost:5176';
  const link = `${adminUrl}/reset-password?token=${token}`;
  const from = process.env.SMTP_FROM ?? 'Orvexa <noreply@orvexa.tn>';

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[email] SMTP not configured — password reset link for ${to}:`);
    console.log(`[email] ${link}`);
    return;
  }

  await createTransport().sendMail({
    from,
    to,
    subject: `Réinitialisation de votre mot de passe Orvexa`,
    html: buildPasswordResetHtml(restaurantName, link),
  });
}

export async function sendInviteEmail(to: string, restaurantName: string, token: string) {
  const adminUrl = process.env.ADMIN_APP_URL ?? 'http://localhost:5176';
  const link = `${adminUrl}/setup?token=${token}`;
  const from = process.env.SMTP_FROM ?? 'Orvexa <noreply@orvexa.tn>';

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[email] SMTP not configured — invite link for ${to}:`);
    console.log(`[email] ${link}`);
    return;
  }

  await createTransport().sendMail({
    from,
    to,
    subject: `Invitation — configurez votre compte Orvexa`,
    html: buildInviteHtml(restaurantName, link),
  });
}
