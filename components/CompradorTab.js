'use client';

import { useState } from 'react';
import { fmtDate, daysSince, veiculoLabel, STATUS, PRIORIDADES } from '../lib/utils';

function prioridadeBadgeClass(p) {
  return p === 'Alta' ? 'badge-alta' : p === 'Média' ? 'badge-media' : 'badge-baixa';
}

export default function CompradorTab({ frota, solicitacoes, config, role, onUpdateStatus, onDelete }) {
  const podeExcluir = role !== 'comprador';
  const [busca, setBusca] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPrio, setFPrio] = useState('');
  const [mostrarEstoque, setMostrarEstoque] = useState(false);

  const statusOpcoes = mostrarEstoque ? STATUS : STATUS.filter((s) => s !== 'Em Estoque');

  function alternarMostrarEstoque(marcado) {
    setMostrarEstoque(marcado);
    if (!marcado && fStatus === 'Em Estoque') setFStatus('');
  }

  let lista = [...solicitacoes];
  if (!mostrarEstoque) lista = lista.filter((s) => s.status !== 'Em Estoque');
  if (fStatus) lista = lista.filter((s) => s.status === fStatus);
  if (fPrio) lista = lista.filter((s) => s.prioridade === fPrio);
  if (busca.trim()) {
    const b = busca.toLowerCase();
    lista = lista.filter((s) => {
      const v = frota.find((f) => f.id === s.veiculoId);
      const texto = [s.peca, s.matriculaSolicitante, s.matriculaEncarregado, v ? veiculoLabel(v) : ''].join(' ').toLowerCase();
      return texto.includes(b);
    });
  }
  const ordem = { Alta: 0, Média: 1, Baixa: 2 };
  lista.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'Pendente' ? -1 : (b.status === 'Pendente' ? 1 : 0);
    return ordem[a.prioridade] - ordem[b.prioridade];
  });

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Aba do Comprador</h1>
          <p>Atualize o status de cada peça solicitada — a prioridade é definida pelo solicitante</p>
        </div>
      </div>

      <div className="panel">
        <div className="filters">
          <div className="field">
            <label>Buscar</label>
            <input type="text" placeholder="Peça, veículo, matrícula..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">Todos</option>
              {statusOpcoes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Prioridade</label>
            <select value={fPrio} onChange={(e) => setFPrio(e.target.value)}>
              <option value="">Todas</option>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13.5, color: 'var(--texto)', padding: '9px 0' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={mostrarEstoque} onChange={(e) => alternarMostrarEstoque(e.target.checked)} />
              Mostrar já em estoque
            </label>
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="empty">
            <svg className="sailicon" viewBox="0 0 100 100" fill="none"><path d="M10 90 L50 10 L90 90 Z" fill="#E7EAEE" /></svg>
            <h3>Nenhuma solicitação encontrada</h3>
            <p>
              Ajuste os filtros ou aguarde novas solicitações chegarem.
              {!mostrarEstoque && ' Peças já em estoque estão ocultas — marque "Mostrar já em estoque" para vê-las.'}
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Veículo</th><th>Peça</th><th>Qtd</th><th>Solicitante</th><th>Encarregado</th>
                <th>Status</th><th>Prioridade</th><th>Tempo</th>{podeExcluir && <th></th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => {
                const v = frota.find((f) => f.id === s.veiculoId);
                const atraso = s.status !== 'Em Estoque' && daysSince(s.dataSolicitacao) > (config.alertaDias || 7);
                const diasAberto = s.status === 'Em Estoque' && s.dataResolucao
                  ? Math.floor(((s.dataResolucao?.toDate ? s.dataResolucao.toDate() : new Date(s.dataResolucao)) -
                      (s.dataSolicitacao?.toDate ? s.dataSolicitacao.toDate() : new Date(s.dataSolicitacao))) / 86400000) + 'd (concluído)'
                  : daysSince(s.dataSolicitacao) + 'd em aberto';
                return (
                  <tr key={s.id} className={atraso ? 'row-alerta' : ''}>
                    <td className="muted">{s.dataSolicitacao ? fmtDate(s.dataSolicitacao) : '—'}</td>
                    <td><span className="veh-tag">{veiculoLabel(v)}</span></td>
                    <td>{s.peca}</td>
                    <td>{s.quantidade}</td>
                    <td>mat. {s.matriculaSolicitante}</td>
                    <td>mat. {s.matriculaEncarregado}</td>
                    <td>
                      <select
                        value={s.status}
                        className={'status-' + (s.status === 'Pendente' ? 'pendente' : s.status === 'Em Cotação' ? 'cotacao' : 'estoque')}
                        onChange={(e) => onUpdateStatus(s.id, e.target.value)}
                      >
                        {STATUS.map((st) => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={'badge ' + prioridadeBadgeClass(s.prioridade)}>{s.prioridade}</span>
                    </td>
                    <td className="muted" style={atraso ? { color: '#C0431B', fontWeight: 700 } : {}}>
                      {diasAberto}{atraso ? ' ⚠' : ''}
                    </td>
                    {podeExcluir && (
                      <td>
                        <button className="btn btn-sm btn-danger-ghost" onClick={() => { if (confirm('Excluir esta solicitação? Essa ação não pode ser desfeita.')) onDelete(s.id); }}>
                          Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
