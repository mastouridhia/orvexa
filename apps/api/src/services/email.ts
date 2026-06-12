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

export async function sendInviteEmail(to: string, restaurantName: string, token: string) {
  const adminUrl = process.env.ADMIN_APP_URL ?? 'http://localhost:5176';
  const link = `${adminUrl}/setup?token=${token}`;
  const from = process.env.SMTP_FROM ?? 'Orvexa <noreply@orvexa.tn>';

  await createTransport().sendMail({
    from,
    to,
    subject: `Invitation — configurez votre compte Orvexa`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <h2 style="color:#1a1a1a">Bienvenue sur Orvexa 👋</h2>
        <p>Votre restaurant <strong>${restaurantName}</strong> a été invité sur la plateforme Orvexa.</p>
        <p>Cliquez sur le bouton ci-dessous pour créer votre mot de passe et finaliser la configuration :</p>
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Configurer mon compte
        </a>
        <p style="color:#666;font-size:13px">Ce lien expire dans 7 jours. Si vous n'avez pas demandé cet accès, ignorez cet e-mail.</p>
      </div>
    `,
  });
}
