'use client';

import { useState } from 'react';
import { daysSince, fmtDate, veiculoLabel, dentroDoPeriodo } from '../lib/utils';

function Sail({ color }) {
  return (
    <svg className="sail" viewBox="0 0 100 100" fill="none">
      <path d="M10 90 L60 10 L90 90 Z" fill={color} />
    </svg>
  );
}

function statusBadge(status) {
  const map = { Pendente: 'badge-pendente', 'Em Cotação': 'badge-cotacao', 'Em Estoque': 'badge-estoque' };
  const dot = { Pendente: 'dot-pendente', 'Em Cotação': 'dot-cotacao', 'Em Estoque': 'dot-estoque' };
  return <span className={'badge ' + map[status]}><span className={'dot ' + dot[status]}></span>{status}</span>;
}
function prioridadeBadgeClass(p) {
  return p === 'Alta' ? 'badge-alta' : p === 'Média' ? 'badge-media' : 'badge-baixa';
}

function ControleInstalada({ solicitacao, podeEditar, onUpdateInstalada }) {
  if (solicitacao.status !== 'Em Estoque') {
    return <span className="muted">—</span>;
  }

  const valor = solicitacao.instalada;
  const definido = valor === true || valor === false;

  if (!podeEditar) {
    if (!definido) return <span className="muted">Aguardando confirmação</span>;
    return valor
      ? <span className="badge badge-estoque">✓ Instalada</span>
      : <span className="badge badge-alta">✗ Não instalada</span>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        className="btn btn-sm"
        style={{
          background: valor === true ? '#00843D' : '#fff',
          color: valor === true ? '#fff' : 'var(--texto)',
          border: '1px solid ' + (valor === true ? '#00843D' : 'var(--borda)'),
        }}
        onClick={() => onUpdateInstalada(solicitacao.id, true)}
      >
        Sim
      </button>
      <button
        className="btn btn-sm"
        style={{
          background: valor === false ? '#E4242B' : '#fff',
          color: valor === false ? '#fff' : 'var(--texto)',
          border: '1px solid ' + (valor === false ? '#E4242B' : 'var(--borda)'),
        }}
        onClick={() => onUpdateInstalada(solicitacao.id, false)}
      >
        Não
      </button>
    </div>
  );
}

export default function DashboardTab({ frota, solicitacoes, config, role, onUpdateInstalada }) {
  const podeMarcarInstalada = ['encarregado', 'developer'].includes(role);
  const [filtro, setFiltro] = useState(null); // null | 'Pendente' | 'Em Cotação' | 'Em Estoque' | 'atrasadas'
  const [busca, setBusca] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  const noPeriodo = solicitacoes.filter((s) => dentroDoPeriodo(s.dataSolicitacao, periodoInicio, periodoFim));

  const abertos = noPeriodo.filter((s) => s.status !== 'Em Estoque');
  const pendentes = noPeriodo.filter((s) => s.status === 'Pendente');
  const cotacao = noPeriodo.filter((s) => s.status === 'Em Cotação');
  const resolvidas = noPeriodo.filter((s) => s.status === 'Em Estoque');
  const alertas = abertos.filter((s) => daysSince(s.dataSolicitacao) > (config.alertaDias || 7));

  const tempos = resolvidas
    .filter((s) => s.dataResolucao)
    .map((s) => {
      const ini = s.dataSolicitacao?.toDate ? s.dataSolicitacao.toDate() : new Date(s.dataSolicitacao);
      const fim = s.dataResolucao?.toDate ? s.dataResolucao.toDate() : new Date(s.dataResolucao);
      return Math.max(0, Math.floor((fim - ini) / 86400000));
    });
  const media = tempos.length ? (tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1) : '—';

  function alternarFiltro(valor) {
    setFiltro((atual) => (atual === valor ? null : valor));
  }

  function limparPeriodo() {
    setPeriodoInicio('');
    setPeriodoFim('');
  }

  let lista = [...noPeriodo];
  if (filtro === 'atrasadas') {
    lista = lista.filter((s) => s.status !== 'Em Estoque' && daysSince(s.dataSolicitacao) > (config.alertaDias || 7));
  } else if (filtro) {
    lista = lista.filter((s) => s.status === filtro);
  }
  if (busca.trim()) {
    const b = busca.toLowerCase();
    lista = lista.filter((s) => {
      const v = frota.find((f) => f.id === s.veiculoId);
      const texto = [s.peca, v ? veiculoLabel(v) : ''].join(' ').toLowerCase();
      return texto.includes(b);
    });
  }
  lista.sort((a, b) => {
    const da = a.dataSolicitacao?.toDate ? a.dataSolicitacao.toDate() : new Date(a.dataSolicitacao || 0);
    const db_ = b.dataSolicitacao?.toDate ? b.dataSolicitacao.toDate() : new Date(b.dataSolicitacao || 0);
    return db_ - da;
  });

  const cardStyle = (ativo) => ({
    cursor: 'pointer',
    outline: ativo ? '2px solid var(--verde)' : 'none',
    outlineOffset: -1,
  });

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Situação da Frota</h1>
          <p>Clique em um card para filtrar a lista abaixo por situação</p>
        </div>
        <div className="config-inline">
          Alertando peça pendente há mais de <strong>{config.alertaDias || 7} dia(s)</strong>
        </div>
      </div>

      <div className="panel" style={{ paddingBottom: 16 }}>
        <div className="filters" style={{ marginBottom: 0 }}>
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
        {(periodoInicio || periodoFim) && (
          <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
            Mostrando solicitações {periodoInicio ? `de ${periodoInicio.split('-').reverse().join('/')}` : 'desde o início'}
            {' '}{periodoFim ? `até ${periodoFim.split('-').reverse().join('/')}` : 'até hoje'}.
          </p>
        )}
      </div>

      <div className="cards">
        <div className="card alerta" style={cardStyle(filtro === 'atrasadas')} onClick={() => alternarFiltro('atrasadas')}>
          <Sail color="#E4242B" /><div className="kpi">{alertas.length}</div><div className="lbl">Alertas de atraso</div>
        </div>
        <div className="card" style={cardStyle(filtro === 'Pendente')} onClick={() => alternarFiltro('Pendente')}>
          <Sail color="#E4242B" /><div className="kpi">{pendentes.length}</div><div className="lbl">Peças pendentes</div>
        </div>
        <div className="card cotacao" style={cardStyle(filtro === 'Em Cotação')} onClick={() => alternarFiltro('Em Cotação')}>
          <Sail color="#3B3E8C" /><div className="kpi">{cotacao.length}</div><div className="lbl">Em cotação</div>
        </div>
        <div className="card ok" style={cardStyle(filtro === 'Em Estoque')} onClick={() => alternarFiltro('Em Estoque')}>
          <Sail color="#00843D" /><div className="kpi">{resolvidas.length}</div><div className="lbl">Já em estoque</div>
        </div>
        <div className="card">
          <Sail color="#00843D" /><div className="kpi">{media}{media !== '—' ? ' d' : ''}</div><div className="lbl">Média p/ atendimento</div>
        </div>
      </div>

      <div className="panel">
        <h2>
          Todas as peças solicitadas
          {filtro && (
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setFiltro(null)}>
              Limpar filtro ({filtro === 'atrasadas' ? 'Atrasadas' : filtro})
            </button>
          )}
        </h2>
        <div className="filters">
          <div className="field">
            <label>Buscar</label>
            <input type="text" placeholder="Peça ou nº de frota..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="empty">
            <svg className="sailicon" viewBox="0 0 100 100" fill="none"><path d="M10 90 L50 10 L90 90 Z" fill="#E7EAEE" /></svg>
            <h3>Nada encontrado</h3>
            <p>Ajuste os filtros, o período ou a busca acima.</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Data</th><th>Veículo</th><th>Peça</th><th>Qtd</th>
                  <th>Status</th><th>Última atualização</th><th>Prioridade</th><th>Tempo</th>
                  <th>Instalada no veículo?</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((s) => {
                  const v = frota.find((f) => f.id === s.veiculoId);
                  const atraso = s.status !== 'Em Estoque' && daysSince(s.dataSolicitacao) > (config.alertaDias || 7);
                  const tempo = s.status === 'Em Estoque'
                    ? 'concluído'
                    : daysSince(s.dataSolicitacao) + 'd em aberto';
                  return (
                    <tr key={s.id} className={atraso ? 'row-alerta' : ''}>
                      <td className="muted">{s.dataSolicitacao ? fmtDate(s.dataSolicitacao) : '—'}</td>
                      <td><span className="veh-tag">{veiculoLabel(v)}</span></td>
                      <td>{s.peca}</td>
                      <td>{s.quantidade}</td>
                      <td>{statusBadge(s.status)}</td>
                      <td className="muted">{s.dataStatus ? fmtDate(s.dataStatus) : '—'}</td>
                      <td><span className={'badge ' + prioridadeBadgeClass(s.prioridade)}>{s.prioridade}</span></td>
                      <td className="muted" style={atraso ? { color: '#C0431B', fontWeight: 700 } : {}}>
                        {tempo}{atraso ? ' ⚠' : ''}
                      </td>
                      <td>
                        <ControleInstalada solicitacao={s} podeEditar={podeMarcarInstalada} onUpdateInstalada={onUpdateInstalada} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="muted" style={{ marginTop: 12 }}>{lista.length} peça(s) nesse filtro.</p>
          </>
        )}
      </div>
    </>
  );
}
