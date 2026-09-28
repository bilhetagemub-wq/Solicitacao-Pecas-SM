import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebaseAdmin';
import { enviarEmail } from '../../../lib/mailer';
import { verificarPapel } from '../../../lib/adminAuth';

export async function POST(request) {
  try {
    // Só quem pode atualizar status (mesmas funções permitidas nas regras do Firestore)
    // pode disparar esse alerta.
    await verificarPapel(request, ['comprador', 'gerente', 'developer']);

    const { solicitacaoId } = await request.json();
    if (!solicitacaoId) {
      return NextResponse.json({ error: 'ID da solicitação ausente.' }, { status: 400 });
    }

    const db = getAdminDb();
    const solSnap = await db.collection('solicitacoes').doc(solicitacaoId).get();
    if (!solSnap.exists) {
      return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
    }
    const s = solSnap.data();

    let veiculoTxt = 'veículo removido';
    if (s.veiculoId) {
      const vSnap = await db.collection('frota').doc(s.veiculoId).get();
      if (vSnap.exists) {
        const v = vSnap.data();
        veiculoTxt = `Nº ${v.numeroFrota} · ${v.fabricante}` + (v.ano ? ` · ${v.ano}` : '');
      }
    }

    const configSnap = await db.collection('config').doc('geral').get();

    const alertasAtivos = configSnap.exists ? (configSnap.data().alertasAtivos || {}) : {};
    if (alertasAtivos.emEstoque === false) {
      return NextResponse.json({ ok: true, skipped: true, message: 'Alerta de peça em estoque está desativado na aba Configurações.' });
    }

    const toEmails = (configSnap.exists && Array.isArray(configSnap.data().alertEmails) && configSnap.data().alertEmails.length)
      ? configSnap.data().alertEmails
      : (process.env.ALERT_TO_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);

    if (toEmails.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum e-mail de alerta cadastrado na aba Configurações.' },
        { status: 400 }
      );
    }

    const dataSolic = s.dataSolicitacao?.toDate ? s.dataSolicitacao.toDate() : new Date(s.dataSolicitacao);
    const diasTotal = Math.max(0, Math.floor((Date.now() - dataSolic.getTime()) / 86400000));

    const html = `
      <div style="font-family:Arial,sans-serif; max-width:600px;">
        <h2 style="color:#00622D;">✅ Peça chegou em estoque</h2>
        <table style="width:100%; border-collapse:collapse; font-size:14px; margin-top:10px;">
          <tr><td style="padding:6px 10px 6px 0; color:#5B6472;">Veículo</td><td style="padding:6px 0;"><strong>${veiculoTxt}</strong></td></tr>
          <tr><td style="padding:6px 10px 6px 0; color:#5B6472;">Peça</td><td style="padding:6px 0;"><strong>${s.peca}</strong></td></tr>
          <tr><td style="padding:6px 10px 6px 0; color:#5B6472;">Quantidade</td><td style="padding:6px 0;">${s.quantidade}</td></tr>
          <tr><td style="padding:6px 10px 6px 0; color:#5B6472;">Matrícula solicitante</td><td style="padding:6px 0;">${s.matriculaSolicitante}</td></tr>
          <tr><td style="padding:6px 10px 6px 0; color:#5B6472;">Matrícula encarregado</td><td style="padding:6px 0;">${s.matriculaEncarregado}</td></tr>
          <tr><td style="padding:6px 10px 6px 0; color:#5B6472;">Tempo até chegar</td><td style="padding:6px 0;">${diasTotal} dia(s)</td></tr>
        </table>
        <p style="color:#5B6472; font-size:12px; margin-top:20px;">
          Sistema de Controle de Peças — São Miguel.
        </p>
      </div>`;

    await enviarEmail({
      to: toEmails,
      subject: `✅ Peça em estoque: ${s.peca}`,
      html,
    });

    return NextResponse.json({ ok: true, count: toEmails.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
