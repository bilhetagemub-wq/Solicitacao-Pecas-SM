'use client';

import { useState, Fragment } from 'react';
import { daysSince, fmtDate, veiculoLabel } from '../lib/utils';

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

function ControleInstalada({ solicitacao, podeEditar, onUpdateInstalada, onPedirMotivo, onLimpar }) {
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
        onClick={() => onPedirMotivo(solicitacao.id)}
      >
        Não
      </button>
      {definido && (
        <button
          className="btn btn-ghost btn-sm"
          title="Limpar resposta (volta para 'Aguardando confirmação')"
          onClick={() => { if (confirm('Limpar a resposta desta peça? Ela volta para "Aguardando confirmação".')) onLimpar(solicitacao.id); }}
        >
          🗑
        </button>
      )}
    </div>
  );
}

function ModalMotivo({ onCancelar, onConfirmar }) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');

  function confirmar() {
    if (!texto.trim()) { setErro('Escreva o motivo antes de confirmar.'); return; }
    onConfirmar(texto.trim());
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Por que a peça não foi instalada?</h3>
        <p className="muted" style={{ marginBottom: 14 }}>
          Esse motivo fica salvo com a solicitação e aparece no Relatório.
        </p>
        <div className="field">
          <textarea
            rows="3"
            autoFocus
            placeholder="Ex: peça errada, veículo já saiu de manutenção, aguardando outra peça complementar..."
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setErro(''); }}
          />
        </div>
        {erro && <p style={{ color: 'var(--vermelho)', fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
          <button className="btn btn-primary" onClick={confirmar}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardTab({ frota, solicitacoes, config, role, onUpdateInstalada, onLimparInstalada, onDelete }) {
  const podeMarcarInstalada = ['encarregado', 'developer'].includes(role);
  const podeExcluir = role === 'developer';
  const [filtro, setFiltro] = useState(null); // null | 'Pendente' | 'Em Cotação' | 'Em Estoque' | 'Instalada' | 'atrasadas'
  const [busca, setBusca] = useState('');
  const [notasAbertas, setNotasAbertas] = useState(new Set());
  const [modalMotivoId, setModalMotivoId] = useState(null);

  function alternarNota(id) {
    setNotasAbertas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  }

  const abertos = solicitacoes.filter((s) => s.status !== 'Em Estoque');
  const pendentes = solicitacoes.filter((s) => s.status === 'Pendente');
  const cotacao = solicitacoes.filter((s) => s.status === 'Em Cotação');
  const todasEmEstoque = solicitacoes.filter((s) => s.status === 'Em Estoque');
  const emEstoqueAguardando = todasEmEstoque.filter((s) => s.instalada !== true); // ainda não foi pro veículo
  const instaladas = todasEmEstoque.filter((s) => s.instalada === true); // já foi pro veículo
  const alertas = abertos.filter((s) => daysSince(s.dataSolicitacao) > (config.alertaDias || 7));

  const tempos = todasEmEstoque
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

  let lista = [...solicitacoes];
  if (filtro === 'atrasadas') {
    lista = lista.filter((s) => s.status !== 'Em Estoque' && daysSince(s.dataSolicitacao) > (config.alertaDias || 7));
  } else if (filtro === 'Instalada') {
    lista = lista.filter((s) => s.status === 'Em Estoque' && s.instalada === true);
  } else if (filtro === 'Em Estoque') {
    lista = lista.filter((s) => s.status === 'Em Estoque' && s.instalada !== true);
  } else if (filtro) {
    lista = lista.filter((s) => s.status === filtro);
  } else {
    // Sem nenhum card selecionado: peças já instaladas ficam fora da visão geral por padrão.
    lista = lista.filter((s) => !(s.status === 'Em Estoque' && s.instalada === true));
  }
  if (busca.trim()) {
    const b = busca.toLowerCase();
    lista = lista.filter((s) => {
      const v = frota.find((f) => f.id === s.veiculoId);
      const texto = [s.peca, v ? veiculoLabel(v) : '', s.matriculaEncarregado, s.observacoes, s.motivoNaoInstalada].join(' ').toLowerCase();
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

  function confirmarMotivo(motivo) {
    onUpdateInstalada(modalMotivoId, false, motivo);
    setModalMotivoId(null);
  }

  return (
    <>
      {modalMotivoId && (
        <ModalMotivo onCancelar={() => setModalMotivoId(null)} onConfirmar={confirmarMotivo} />
      )}

      <div className="topbar">
        <div>
          <h1>Situação da Frota</h1>
          <p>Clique em um card para filtrar a lista abaixo por situação</p>
        </div>
        <div className="config-inline">
          Alertando peça pendente há mais de <strong>{config.alertaDias || 7} dia(s)</strong>
        </div>
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
          <Sail color="#00843D" /><div className="kpi">{emEstoqueAguardando.length}</div><div className="lbl">Já em estoque</div>
        </div>
        <div className="card ok" style={cardStyle(filtro === 'Instalada')} onClick={() => alternarFiltro('Instalada')}>
          <Sail color="#00622D" /><div className="kpi">{instaladas.length}</div><div className="lbl">Instaladas no veículo</div>
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
            <input type="text" placeholder="Peça, nº de frota ou matrícula..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="empty">
            <svg className="sailicon" viewBox="0 0 100 100" fill="none"><path d="M10 90 L50 10 L90 90 Z" fill="#E7EAEE" /></svg>
            <h3>Nada encontrado</h3>
            <p>
              Ajuste os filtros ou a busca acima.
              {!filtro && ' Peças já instaladas no veículo ficam no card "Instaladas no veículo".'}
            </p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Data</th><th>Veículo</th><th>Peça</th><th>Qtd</th><th>Encarregado</th>
                  <th>Status</th><th>Última atualização</th><th>Prioridade</th><th>Tempo</th>
                  <th>Nota</th><th>Instalada no veículo?</th>{podeExcluir && <th></th>}
                </tr>
              </thead>
              <tbody>
                {lista.map((s) => {
                  const v = frota.find((f) => f.id === s.veiculoId);
                  const atraso = s.status !== 'Em Estoque' && daysSince(s.dataSolicitacao) > (config.alertaDias || 7);
                  const tempo = s.status === 'Em Estoque'
                    ? 'concluído'
                    : daysSince(s.dataSolicitacao) + 'd em aberto';
                  const temNota = Boolean(s.observacoes || s.motivoNaoInstalada);
                  return (
                    <Fragment key={s.id}>
                      <tr className={atraso ? 'row-alerta' : ''}>
                        <td className="muted">{s.dataSolicitacao ? fmtDate(s.dataSolicitacao) : '—'}</td>
                        <td><span className="veh-tag">{veiculoLabel(v)}</span></td>
                        <td>{s.peca}</td>
                        <td>{s.quantidade}</td>
                        <td>mat. {s.matriculaEncarregado}</td>
                        <td>{statusBadge(s.status)}</td>
                        <td className="muted">{s.dataStatus ? fmtDate(s.dataStatus) : '—'}</td>
                        <td><span className={'badge ' + prioridadeBadgeClass(s.prioridade)}>{s.prioridade}</span></td>
                        <td className="muted" style={atraso ? { color: '#C0431B', fontWeight: 700 } : {}}>
                          {tempo}{atraso ? ' ⚠' : ''}
                        </td>
                        <td>
                          {temNota ? (
                            <button className="btn btn-ghost btn-sm" onClick={() => alternarNota(s.id)}>
                              📝 {notasAbertas.has(s.id) ? 'Ocultar' : 'Ver'}
                            </button>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <ControleInstalada
                            solicitacao={s}
                            podeEditar={podeMarcarInstalada}
                            onUpdateInstalada={onUpdateInstalada}
                            onPedirMotivo={setModalMotivoId}
                            onLimpar={onLimparInstalada}
                          />
                        </td>
                        {podeExcluir && (
                          <td>
                            <button
                              className="btn btn-sm btn-danger-ghost"
                              onClick={() => { if (confirm('Excluir esta solicitação? Essa ação não pode ser desfeita.')) onDelete(s.id); }}
                            >
                              Excluir
                            </button>
                          </td>
                        )}
                      </tr>
                      {notasAbertas.has(s.id) && temNota && (
                        <tr>
                          <td colSpan={podeExcluir ? 12 : 11} style={{ background: '#FAFBFC', fontSize: 13, padding: '10px 14px' }}>
                            {s.observacoes && <div><strong>Observação:</strong> {s.observacoes}</div>}
                            {s.motivoNaoInstalada && (
                              <div style={{ marginTop: s.observacoes ? 6 : 0 }}>
                                <strong>Motivo não instalada:</strong> {s.motivoNaoInstalada}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
