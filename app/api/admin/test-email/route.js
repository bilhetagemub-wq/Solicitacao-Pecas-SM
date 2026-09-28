import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin';
import { enviarEmail } from '../../../../lib/mailer';
import { verificarDeveloper } from '../../../../lib/adminAuth';

export async function POST(request) {
  try {
    await verificarDeveloper(request);

    const db = getAdminDb();
    const configSnap = await db.collection('config').doc('geral').get();
    const toEmails = (configSnap.exists && Array.isArray(configSnap.data().alertEmails) && configSnap.data().alertEmails.length)
      ? configSnap.data().alertEmails
      : (process.env.ALERT_TO_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);

    if (toEmails.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum e-mail de alerta cadastrado. Adicione pelo menos um e-mail acima antes de testar.' },
        { status: 400 }
      );
    }

    const agora = new Date();
    await enviarEmail({
      to: toEmails,
      subject: '✅ Teste de envio — Controle de Peças São Miguel',
      html: `
        <div style="font-family:Arial,sans-serif; max-width:600px;">
          <h2 style="color:#00622D;">Teste de envio de e-mail</h2>
          <p>Se você está lendo esta mensagem, a configuração de alertas por e-mail do
          sistema de Controle de Peças está funcionando corretamente.</p>
          <p style="color:#5B6472; font-size:12px; margin-top:20px;">
            Enviado em ${agora.toLocaleString('pt-BR')} a partir da aba Configurações.
          </p>
        </div>`,
    });

    return NextResponse.json({ ok: true, count: toEmails.length, destinatarios: toEmails });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
