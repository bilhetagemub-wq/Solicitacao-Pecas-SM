import jsPDF from 'jspdf';

async function toDataURL(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Gera e baixa o comprovante em PDF de uma solicitação de peça, com campos
 * para assinatura do solicitante e do encarregado.
 */
export async function gerarComprovantePDF({
  id, veiculo, peca, quantidade, matriculaSolicitante, matriculaEncarregado, observacoes, data,
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const dataEmissao = data || new Date();
  const codigo = (id || '').slice(-8).toUpperCase() || '—';

  let logoDataUrl = null;
  try { logoDataUrl = await toDataURL('/logo.png'); } catch { /* segue sem logo se falhar */ }
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 15, 12, 55, 18.7);
  }

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('COMPROVANTE DE SOLICITAÇÃO DE PEÇA', 105, 40, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Nº do pedido: ${codigo}`, 15, 50);
  doc.text(
    `Emitido em: ${dataEmissao.toLocaleDateString('pt-BR')} às ${dataEmissao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    15, 56
  );

  doc.setLineWidth(0.3);
  doc.line(15, 62, 195, 62);

  const campos = [
    ['Veículo', veiculo ? `Nº ${veiculo.numeroFrota} · ${veiculo.fabricante}` : '—'],
    ['Peça solicitada', peca || '—'],
    ['Quantidade', String(quantidade ?? '—')],
    ['Matrícula do solicitante', matriculaSolicitante || '—'],
    ['Matrícula do encarregado', matriculaEncarregado || '—'],
    ['Observações', observacoes || '—'],
  ];

  let y = 72;
  doc.setFontSize(11);
  campos.forEach(([label, valor]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label + ':', 15, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(valor), 70, y, { maxWidth: 120 });
    y += 10;
  });

  y += 18;
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  y += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Assinaturas', 15, y);

  y += 22;
  doc.line(15, y, 90, y);
  doc.line(115, y, 190, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`Solicitante — matrícula ${matriculaSolicitante || '—'}`, 15, y);
  doc.text(`Encarregado — matrícula ${matriculaEncarregado || '—'}`, 115, y);

  y += 6;
  doc.setFontSize(8);
  doc.text('Data: ___/___/______', 15, y);
  doc.text('Data: ___/___/______', 115, y);

  y += 16;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    'Este comprovante deve ser impresso e assinado no momento da entrega/retirada da peça. ' +
    'Sistema de Controle de Peças — São Miguel.',
    15, y, { maxWidth: 180 }
  );

  doc.save(`comprovante-pedido-${codigo}.pdf`);
}
