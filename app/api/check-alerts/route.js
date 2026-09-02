import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebaseAdmin';
import { enviarEmail } from '../../../lib/mailer';

export const dynamic = 'force-dynamic';

function daysSince(timestamp) {
  const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export async function GET(request) {
  // Protege o endpoint: só aceita chamadas do Vercel Cron (ou com o segredo correto)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const db = getAdminDb();

    const configSnap = await db.collection('config').doc('geral').get();
    const alertaDias = configSnap.exists ? (configSnap.data().alertaDias || 7) : 7;

    const alertasAtivos = configSnap.exists ? (configSnap.data().alertasAtivos || {}) : {};
    if (alertasAtivos.atraso === false) {
      return NextResponse.json({ ok: true, skipped: true, message: 'Alerta de peça atrasada está desativado na aba Configurações.' });
    }

    const frotaSnap = await db.collection('frota').get();
    const frotaMap = {};
    frotaSnap.forEach((d) => { frotaMap[d.id] = d.data(); });

    const solSnap = await db.collection('solicitacoes')
      .where('status', 'in', ['Pendente', 'Em Cotação'])
      .get();

    const atrasadas = [];
    solSnap.forEach((d) => {
      const s = d.data();
      if (s.alertaEnviado) return; // já alertado antes, evita spam diário
      if (daysSince(s.dataSolicitacao) > alertaDias) {
        atrasadas.push({ id: d.id, ...s });
      }
    });

    if (atrasadas.length === 0) {
      return NextResponse.json({ ok: true, message: 'Nenhuma peça atrasada encontrada.', count: 0 });
    }

    const toEmails = (configSnap.exists && Array.isArray(configSnap.data().alertEmails) && configSnap.data().alertEmails.length)
      ? configSnap.data().alertEmails
      : (process.env.ALERT_TO_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);

    if (toEmails.length === 0) {
      return NextResponse.json({ error: 'Nenhum e-mail de alerta configurado. Adicione na aba Configurações.' }, { status: 500 });
    }

    const linhas = atrasadas.map((s) => {
      const v = frotaMap[s.veiculoId];
      const veiculoTxt = v ? `Nº ${v.numeroFrota} · ${v.fabricante}` : 'Veículo removido';
      const dias = daysSince(s.dataSolicitacao);
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${veiculoTxt}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${s.peca}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${s.status}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;"><strong>${dias} dia(s)</strong></td>
      </tr>`;
    }).join('');

    const html = `
      <div style="font-family:Arial,sans-serif; max-width:600px;">
        <h2 style="color:#00622D;">⚠ Peças com pedido atrasado</h2>
        <p>As peças abaixo estão pendentes há mais de ${alertaDias} dia(s):</p>
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <thead>
            <tr style="background:#F5F6F8; text-align:left;">
              <th style="padding:8px;">Veículo</th><th style="padding:8px;">Peça</th>
              <th style="padding:8px;">Status</th><th style="padding:8px;">Tempo</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
        <p style="color:#5B6472; font-size:12px; margin-top:20px;">
          Alerta automático do sistema de Controle de Peças — São Miguel.
        </p>
      </div>`;

    try {
      await enviarEmail({
        to: toEmails,
        subject: `⚠ ${atrasadas.length} peça(s) com pedido atrasado`,
        html,
      });
    } catch (err) {
      console.error('Falha ao enviar o alerta diário:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    const batch = db.batch();
    atrasadas.forEach((s) => {
      batch.update(db.collection('solicitacoes').doc(s.id), { alertaEnviado: true });
    });
    await batch.commit();

    return NextResponse.json({ ok: true, count: atrasadas.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
