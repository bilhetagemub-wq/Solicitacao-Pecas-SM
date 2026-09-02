export function fmtDate(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function daysSince(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function veiculoLabel(v) {
  if (!v) return 'Veículo removido';
  const partes = [`Nº ${v.numeroFrota}`, v.fabricante];
  if (v.ano) partes.push(v.ano);
  return partes.join(' · ');
}

export function normalizarFabricante(txt) {
  const t = (txt || '').trim().toLowerCase();
  if (t.startsWith('marco')) return 'Marcopolo';
  if (t.startsWith('caio')) return 'Caio';
  return (txt || '').trim() || 'Marcopolo';
}

export const PECAS_RAPIDAS = [
  'Pastilha de freio', 'Disco de freio', 'Amortecedor', 'Correia',
  'Filtro de óleo', 'Filtro de ar', 'Filtro de combustível',
  'Lâmpada', 'Bateria', 'Pneu', 'Retrovisor', 'Limpador de para-brisa',
];

export function dentroDoPeriodo(dataValor, inicioStr, fimStr) {
  if (!inicioStr && !fimStr) return true;
  const d = dataValor?.toDate ? dataValor.toDate() : new Date(dataValor);
  if (inicioStr) {
    const inicio = new Date(inicioStr + 'T00:00:00');
    if (d < inicio) return false;
  }
  if (fimStr) {
    const fim = new Date(fimStr + 'T23:59:59.999');
    if (d > fim) return false;
  }
  return true;
}
export const STATUS = ['Pendente', 'Em Cotação', 'Em Estoque'];
export const PRIORIDADES = ['Baixa', 'Média', 'Alta'];
