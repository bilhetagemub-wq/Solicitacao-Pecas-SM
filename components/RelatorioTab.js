'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { daysSince, fmtDate, veiculoLabel, dentroDoPeriodo } from '../lib/utils';

export default function RelatorioTab({ frota, solicitacoes, config }) {
  const [incluirResolvidas, setIncluirResolvidas] = useState(false);
  const [somenteAtrasadas, setSomenteAtrasadas] = useState(false);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  let lista = solicitacoes.filter((s) => incluirResolvidas || s.status !== 'Em Estoque');
  if (somenteAtrasadas) {
    lista = lista.filter((s) => s.status !== 'Em Estoque' && daysSince(s.dataSolicitacao) > (config.alertaDias || 7));
  }
  if (periodoInicio || periodoFim) {
    lista = lista.filter((s) => dentroDoPeriodo(s.dataSolicitacao, periodoInicio, periodoFim));
  }
  lista = [...lista].sort((a, b) => {
    const da = a.dataSolicitacao?.toDate ? a.dataSolicitacao.toDate() : new Date(a.dataSolicitacao || 0);
    const db_ = b.dataSolicitacao?.toDate ? b.dataSolicitacao.toDate() : new Date(b.dataSolicitacao || 0);
    return db_ - da;
  });

  function limparPeriodo() {
    setPeriodoInicio('');
    setPeriodoFim('');
  }

  function textoInstalada(s) {
    if (s.status !== 'Em Estoque') return '';
    if (s.instalada === true) return 'Sim';
    if (s.instalada === false) return 'Não';
    return 'Aguardando confirmação';
  }

  function montarLinha(s) {
    const v = frota.find((f) => f.id === s.veiculoId);
    const atrasada = s.status !== 'Em Estoque' && daysSince(s.dataSolicitacao) > (config.alertaDias || 7);
    return {
      'Data da Solicitação': s.dataSolicitacao ? fmtDate(s.dataSolicitacao) : '',
      'Nº Frota': v ? v.numeroFrota : '',
      'Fabricante': v ? v.fabricante : '',
      'Ano': v ? (v.ano || '') : '',
      'Peça': s.peca,
      'Quantidade': s.quantidade,
      'Status': s.status,
      'Instalada no Veículo': textoInstalada(s),
      'Prioridade': s.prioridade,
      'Matrícula Solicitante': s.matriculaSolicitante,
      'Matrícula Encarregado': s.matriculaEncarregado,
      'Dias em Aberto': s.status !== 'Em Estoque' ? daysSince(s.dataSolicitacao) : '',
      'Atrasada': atrasada ? 'Sim' : 'Não',
      'Observações': s.observacoes || '',
    };
  }

  function baixarExcel() {
    const linhas = lista.map(montarLinha);
    const ws = XLSX.utils.json_to_sheet(linhas);
    ws['!cols'] = [
      { wch: 17 }, { wch: 9 }, { wch: 12 }, { wch: 7 }, { wch: 26 }, { wch: 10 }, { wch: 12 },
      { wch: 18 }, { wch: 11 }, { wch: 18 }, { wch: 18 }, { wch: 13 }, { wch: 10 }, { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peças');
    const dataHoje = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `relatorio-pecas-pendentes-${dataHoje}.xlsx`);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Relatório de Peças</h1>
          <p>Exporte um resumo em Excel para usar em outra ferramenta de alertas ou controle</p>
        </div>
      </div>

      <div className="panel">
        <div className="filters">
          <div className="field">
            <label>Período — de</label>
            <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
          </div>
          <div className="field">
            <label>até</label>
            <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
          </div>
          {(periodoInicio || periodoFim) && (
            <div className="field" style={{ alignSelf: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={limparPeriodo}>Limpar período</button>
            </div>
          )}
        </div>
        <div className="filters">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13.5, color: 'var(--texto)' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={incluirResolvidas} onChange={(e) => setIncluirResolvidas(e.target.checked)} />
            Incluir peças já em estoque (resolvidas)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13.5, color: 'var(--texto)' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={somenteAtrasadas} onChange={(e) => setSomenteAtrasadas(e.target.checked)} />
            Mostrar somente atrasadas
          </label>
        </div>
        <p className="muted" style={{ margin: '0 0 14px' }}>{lista.length} solicitação(ões) nesse filtro.</p>
        <button className="btn btn-primary" onClick={baixarExcel} disabled={lista.length === 0}>
          Baixar relatório (.xlsx)
        </button>
      </div>

      <div className="panel">
        <h2>Pré-visualização</h2>
        {lista.length === 0 ? (
          <div className="empty"><h3>Nada para mostrar com esse filtro</h3><p>Ajuste os filtros ou o período acima.</p></div>
        ) : (
          <>
            <table>
              <thead><tr><th>Data</th><th>Veículo</th><th>Peça</th><th>Qtd</th><th>Status</th><th>Instalada</th><th>Prioridade</th><th>Tempo</th></tr></thead>
              <tbody>
                {lista.slice(0, 50).map((s) => {
                  const v = frota.find((f) => f.id === s.veiculoId);
                  const atrasada = s.status !== 'Em Estoque' && daysSince(s.dataSolicitacao) > (config.alertaDias || 7);
                  return (
                    <tr key={s.id} className={atrasada ? 'row-alerta' : ''}>
                      <td className="muted">{s.dataSolicitacao ? fmtDate(s.dataSolicitacao) : '—'}</td>
                      <td><span className="veh-tag">{veiculoLabel(v)}</span></td>
                      <td>{s.peca}</td>
                      <td>{s.quantidade}</td>
                      <td>{s.status}</td>
                      <td className="muted">{textoInstalada(s) || '—'}</td>
                      <td>{s.prioridade}</td>
                      <td>{s.status !== 'Em Estoque' ? daysSince(s.dataSolicitacao) + 'd' : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {lista.length > 50 && (
              <p className="muted" style={{ marginTop: 10 }}>Mostrando 50 de {lista.length}. O arquivo Excel baixado contém todos.</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
