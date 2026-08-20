import nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * Envia um e-mail usando o serviço configurado:
 * 1. Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) — se configurado, tem prioridade.
 *    Não exige verificação de domínio, funciona para qualquer destinatário.
 * 2. Resend (RESEND_API_KEY) — usado como alternativa, caso um domínio próprio
 *    já tenha sido verificado no Resend.
 *
 * Lança um erro com mensagem clara caso o envio falhe ou nada esteja configurado.
 */
export async function enviarEmail({ to, subject, html }) {
  const destinatarios = Array.isArray(to) ? to : [to];

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    try {
      await transporter.sendMail({
        from: `"Controle de Peças São Miguel" <${process.env.GMAIL_USER}>`,
        to: destinatarios.join(', '),
        subject,
        html,
      });
      return { provider: 'gmail' };
    } catch (err) {
      throw new Error(
        `Gmail recusou o envio: ${err.message}. Confira se GMAIL_USER e GMAIL_APP_PASSWORD estão ` +
        'corretos e se a senha de app ainda é válida (veja o README).'
      );
    }
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.ALERT_FROM_EMAIL || 'onboarding@resend.dev',
      to: destinatarios,
      subject,
      html,
    });
    if (error) {
      throw new Error(`Resend recusou o envio: ${error.message || JSON.stringify(error)}`);
    }
    return { provider: 'resend' };
  }

  throw new Error(
    'Nenhum serviço de e-mail configurado. Defina GMAIL_USER + GMAIL_APP_PASSWORD (recomendado, ' +
    'veja o README) ou RESEND_API_KEY nas variáveis de ambiente.'
  );
}
