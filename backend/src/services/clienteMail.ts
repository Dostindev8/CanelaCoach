import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { escapeHtml } from '../utils/escapeHtml.js';

function transport() {
  if (!env.smtp.host || !env.smtp.user) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    tls: { minVersion: 'TLSv1.2' },
  });
}

export async function enviarVerificacionEmailCliente(opts: {
  email: string;
  nombre: string;
  token: string;
}): Promise<{ simulated: boolean }> {
  const url = `${env.frontendUrl}/portal/verificar?token=${encodeURIComponent(opts.token)}`;
  const t = transport();
  if (!t) {
    console.log(`[mail:cliente] verificación simulada → ${opts.email} | ${url}`);
    return { simulated: true };
  }
  await t.sendMail({
    from: env.smtp.from,
    to: opts.email,
    subject: 'Verifica tu cuenta — Canela Coach®',
    html: `<p>Hola ${escapeHtml(opts.nombre)},</p>
      <p>Confirma tu correo para activar el portal:</p>
      <p><a href="${escapeHtml(url)}">Verificar email</a></p>
      <p>El enlace expira en 24 horas.</p>`,
  });
  return { simulated: false };
}

export async function enviarResetPasswordCliente(opts: {
  email: string;
  nombre: string;
  token: string;
}): Promise<{ simulated: boolean }> {
  const url = `${env.frontendUrl}/portal/reset-password?token=${encodeURIComponent(opts.token)}`;
  const t = transport();
  if (!t) {
    console.log(`[mail:cliente] reset simulado → ${opts.email} | ${url}`);
    return { simulated: true };
  }
  await t.sendMail({
    from: env.smtp.from,
    to: opts.email,
    subject: 'Restablecer contraseña — Canela Coach®',
    html: `<p>Hola ${escapeHtml(opts.nombre)},</p>
      <p><a href="${escapeHtml(url)}">Restablecer contraseña</a> (válido 1 hora).</p>
      <p>Si no pediste esto, ignora el mensaje.</p>`,
  });
  return { simulated: false };
}
