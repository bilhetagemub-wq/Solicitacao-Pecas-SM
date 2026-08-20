'use client';

import { useEffect, useState } from 'react';
import { fmtDate, veiculoLabel } from '../lib/utils';
import { gerarComprovantePDF } from '../lib/pdfReceipt';

function statusBadge(status) {
  const map = { Pendente: 'badge-pendente', 'Em Cotação': 'badge-cotacao', 'Em Estoque': 'badge-estoque' };
  const dot = { Pendente: 'dot-pendente', 'Em Cotação': 'dot-cotacao', 'Em Estoque': 'dot-estoque' };
  return <span className={'badge ' + map[status]}><span className={'dot ' + dot[status]}></span>{status}</span>;
}

const LEMBRETE_KEY = 'sm_ultima_identificacao';

export default function SolicitarTab({ frota, solicitacoes, onSubmit, onDelete }) {
  const [numeroFrota, setNumeroFrota] = useState('');
  const [peca, setPeca] = useState('');
  const [qtd, setQtd] = useState(1);
  const [matSol, setMatSol] = useState('');
  const [matEnc, setMatEnc] = useState('');
  const [prioridade, setPrioridade] = useState('Média');
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(LEMBRETE_KEY) || 'null');
      if (salvo) {
        setMatSol(salvo.matSol || '');
        setMatEnc(salvo.matEnc || '');
      }
    } catch {}
  }, []);

  const veiculoEncontrado = frota.find((v) => v.numeroFrota.toString().trim() === numeroFrota.trim());

  async function handleSubmit(e) {
    e.preventDefault();
    if (!veiculoEncontrado) {
      setErro('Nº de frota não encontrado. Confira o número ou atualize a frota na aba Atualizações.');
      return;
    }
    setEnviando(true);
    const dadosPedido = {
      veiculoId: veiculoEncontrado.id,
      peca: peca.trim(),
      quantidade: qtd,
      prioridade,
      matriculaSolicitante: matSol.trim(),
      matriculaEncarregado: matEnc.trim(),
      observacoes: obs.trim(),
    };

    try {
      const resultado = await onSubmit(dadosPedido);
      try {
        await gerarComprovantePDF({
          id: resultado?.id,
          veiculo: veiculoEncontrado,
          peca: dadosPedido.peca,
          quantidade: dadosPedido.quantidade,
          matriculaSolicitante: dadosPedido.matriculaSolicitante,
          matriculaEncarregado: dadosPedido.matriculaEncarregado,
          observacoes: dadosPedido.observacoes,
          data: new Date(),
        });
      } catch (errPdf) {
        console.error('Erro ao gerar comprovante PDF:', errPdf);
      }

      localStorage.setItem(LEMBRETE_KEY, JSON.stringify({ matSol: matSol.trim(), matEnc: matEnc.trim() }));
      setNumeroFrota('');
      setPeca('');
      setQtd(1);
      setPrioridade('Média');
      setObs('');
      setErro('');
    } finally {
      setEnviando(false);
    }
  }

  async function reimprimirComprovante(s) {
    const v = frota.find((f) => f.id === s.veiculoId);
    const dataSolic = s.dataSolicitacao?.toDate ? s.dataSolicitacao.toDate() : new Date(s.dataSolicitacao || Date.now());
    try {
      await gerarComprovantePDF({
        id: s.id,
        veiculo: v,
        peca: s.peca,
        quantidade: s.quantidade,
        matriculaSolicitante: s.matriculaSolicitante,
        matriculaEncarregado: s.matriculaEncarregado,
        observacoes: s.observacoes,
        data: dataSolic,
      });
    } catch (err) {
      console.error('Erro ao gerar comprovante PDF:', err);
    }
  }

  const ultimas = [...solicitacoes]
    .sort((a, b) => {
      const da = a.dataSolicitacao?.toDate ? a.dataSolicitacao.toDate() : new Date(a.dataSolicitacao || 0);
      const db_ = b.dataSolicitacao?.toDate ? b.dataSolicitacao.toDate() : new Date(b.dataSolicitacao || 0);
      return db_ - da;
    })
    .slice(0, 8);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Solicitação de Peças</h1>
          <p>Preencha os dados para enviar um pedido de peça ao almoxarifado</p>
        </div>
      </div>

      <div className="panel">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nº da frota *</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Digite o número do ônibus"
              list="veiculosDatalist"
              autoComplete="off"
              required
              value={numeroFrota}
              onChange={(e) => { setNumeroFrota(e.target.value); setErro(''); }}
            />
            <datalist id="veiculosDatalist">
              {frota.map((v) => <option key={v.id} value={v.numeroFrota}>{v.fabricante}</option>)}
            </datalist>
            <div style={{ marginTop: 7, fontSize: 12.5 }}>
              {numeroFrota.trim() && (
                veiculoEncontrado
                  ? <span style={{ color: 'var(--verde-escuro)', fontWeight: 600 }}>✓ {veiculoEncontrado.fabricante}</span>
                  : <span style={{ color: 'var(--vermelho)', fontWeight: 600 }}>Número não encontrado na frota atual</span>
              )}
            </div>
          </div>

          <div className="field">
            <label>Peça *</label>
            <input type="text" placeholder="Ex: Amortecedor dianteiro" required value={peca} onChange={(e) => setPeca(e.target.value)} />
          </div>

          <div className="grid2">
            <div className="field">
              <label>Quantidade</label>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" style={{ width: 40 }} onClick={() => setQtd((q) => Math.max(1, q - 1))}>−</button>
                <input type="number" min="1" value={qtd} style={{ textAlign: 'center' }} onChange={(e) => setQtd(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                <button type="button" className="btn btn-ghost btn-sm" style={{ width: 40 }} onClick={() => setQtd((q) => q + 1)}>+</button>
              </div>
            </div>
            <div className="field">
              <label>Prioridade *</label>
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Matrícula do solicitante *</label>
            <input type="text" inputMode="numeric" placeholder="Ex: 12345" required value={matSol} onChange={(e) => setMatSol(e.target.value)} />
          </div>

          <div className="field">
            <label>Matrícula do encarregado *</label>
            <input type="text" inputMode="numeric" placeholder="Ex: 67890" required value={matEnc} onChange={(e) => setMatEnc(e.target.value)} />
          </div>

          <div className="field">
            <label>Observações <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
            <textarea rows="2" placeholder="Detalhes adicionais" value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>

          {erro && <p style={{ color: 'var(--vermelho)', fontSize: 12.5, marginBottom: 12 }}>{erro}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 13 }} disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar solicitação'}
          </button>
          <p className="muted" style={{ marginTop: 8, textAlign: 'center' }}>
            Ao enviar, o comprovante em PDF é baixado automaticamente para impressão e assinatura.
          </p>
        </form>
      </div>

      <div className="panel">
        <h2>Últimas solicitações enviadas</h2>
        {ultimas.length === 0 ? (
          <div className="empty"><h3>Nenhuma solicitação ainda</h3><p>As solicitações enviadas aparecerão aqui.</p></div>
        ) : (
          <table>
            <thead><tr><th>Data</th><th>Veículo</th><th>Peça</th><th>Qtd</th><th>Matrícula solicitante</th><th>Status</th><th colSpan={2}></th></tr></thead>
            <tbody>
              {ultimas.map((s) => {
                const v = frota.find((f) => f.id === s.veiculoId);
                return (
                  <tr key={s.id}>
                    <td className="muted">{s.dataSolicitacao ? fmtDate(s.dataSolicitacao) : '—'}</td>
                    <td>{veiculoLabel(v)}</td>
                    <td>{s.peca}</td>
                    <td>{s.quantidade}</td>
                    <td>{s.matriculaSolicitante}</td>
                    <td>{statusBadge(s.status)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => reimprimirComprovante(s)}>
                        🖨 Comprovante
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger-ghost"
                        onClick={() => { if (confirm('Excluir esta solicitação? Essa ação não pode ser desfeita.')) onDelete(s.id); }}
                      >
                        Excluir
                      </button>
                    </td>
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
