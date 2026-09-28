'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { normalizarFabricante } from '../lib/utils';

function getCampo(row, chaves) {
  for (const k of Object.keys(row)) {
    if (chaves.includes(k.trim().toLowerCase())) return String(row[k] ?? '').trim();
  }
  return '';
}

function baixarModelo(frota) {
  const linhas = frota.length > 0
    ? frota.map((v) => [v.numeroFrota, v.fabricante, v.ano || ''])
    : [['1234', 'Marcopolo', '2020'], ['5678', 'Caio', '2019']];
  const wsData = [['Nº Frota', 'Fabricante', 'Ano'], ...linhas];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Frota');
  XLSX.writeFile(wb, 'modelo-frota-sao-miguel.xlsx');
}

export default function AtualizacoesTab({ frota, solicitacoes, onUpsertLote, onRemover }) {
  const [preview, setPreview] = useState(null);
  const [erro, setErro] = useState('');

  function handleUpload(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const parsed = rows
          .map((r) => ({
            numeroFrota: getCampo(r, ['nº frota', 'n frota', 'numero frota', 'nº da frota', 'frota', 'prefixo']).replace(/\s+/g, ''),
            fabricante: normalizarFabricante(getCampo(r, ['fabricante', 'marca', 'modelo'])),
            ano: getCampo(r, ['ano', 'ano de fabricação', 'ano fabricação', 'ano do veículo', 'ano veiculo', 'ano/modelo']),
          }))
          .filter((v) => v.numeroFrota);

        if (parsed.length === 0) {
          setErro('Não encontrei nenhuma linha com o nº da frota preenchido na planilha.');
          setPreview(null);
          return;
        }
        setErro('');
        setPreview(parsed);
      } catch {
        setErro('Não foi possível ler essa planilha. Verifique o formato e tente novamente.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function confirmar() {
    if (!preview) return;
    await onUpsertLote(preview);
    setPreview(null);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Atualizações</h1>
          <p>Envie a planilha da frota para atualizar os veículos disponíveis no sistema</p>
        </div>
      </div>

      <div className="panel">
        <h2>1. Baixe o modelo de planilha</h2>
        <p className="muted" style={{ margin: '0 0 14px' }}>
          {frota.length > 0
            ? 'O arquivo já vem preenchido com os veículos atualmente cadastrados no sistema — edite o que precisar e envie de volta no passo 2.'
            : 'Preencha o modelo com a relação atual de veículos e depois envie o arquivo no passo 2.'}
          {' '}Colunas aceitas: <strong>Nº Frota</strong> (obrigatória), <strong>Fabricante</strong> (Marcopolo ou Caio) e <strong>Ano</strong>.
        </p>
        <button className="btn btn-ghost" onClick={() => baixarModelo(frota)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" />
          </svg>
          {frota.length > 0 ? 'Baixar planilha atual (.xlsx)' : 'Baixar modelo (.xlsx)'}
        </button>
      </div>

      <div className="panel">
        <h2>2. Envie a planilha preenchida</h2>
        <div className="field" style={{ maxWidth: 420 }}>
          <label>Arquivo (.xlsx ou .xls)</label>
          <input type="file" accept=".xlsx,.xls" onChange={handleUpload} />
        </div>
        {erro && <p style={{ color: 'var(--vermelho)', fontSize: 13 }}>{erro}</p>}

        {preview && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, margin: '0 0 10px' }}>
              <strong>{preview.length}</strong> veículo(s) encontrados na planilha{preview.length > 8 ? ' (mostrando os 8 primeiros)' : ''}:
            </p>
            <table>
              <thead><tr><th>Nº Frota</th><th>Fabricante</th><th>Ano</th></tr></thead>
              <tbody>
                {preview.slice(0, 8).map((v, i) => (
                  <tr key={i}><td className="veh-tag">Nº {v.numeroFrota}</td><td>{v.fabricante}</td><td>{v.ano || '—'}</td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={confirmar}>Atualizar frota do sistema</button>
              <button className="btn btn-ghost" onClick={() => setPreview(null)}>Cancelar</button>
            </div>
            <p className="muted" style={{ marginTop: 10 }}>
              Veículos com nº de frota já existente no sistema são atualizados (fabricante e ano); números novos são adicionados.
              Veículos que não aparecerem mais na planilha continuam no sistema até serem removidos manualmente.
            </p>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Frota atual no sistema</h2>
        <p className="muted" style={{ margin: '0 0 14px' }}>
          {frota.length ? `${frota.length} veículo(s) atualmente cadastrados no sistema.` : 'Nenhum veículo cadastrado ainda.'}
        </p>
        {frota.length === 0 ? (
          <div className="empty">
            <svg className="sailicon" viewBox="0 0 100 100" fill="none"><path d="M10 90 L50 10 L90 90 Z" fill="#E7EAEE" /></svg>
            <h3>Nenhum veículo cadastrado</h3>
            <p>Envie a planilha da frota acima para começar.</p>
          </div>
        ) : (
          <table>
            <thead><tr><th>Nº Frota</th><th>Fabricante</th><th>Ano</th><th>Pendências</th><th></th></tr></thead>
            <tbody>
              {frota.map((v) => {
                const pend = solicitacoes.filter((s) => s.veiculoId === v.id && s.status !== 'Em Estoque').length;
                return (
                  <tr key={v.id}>
                    <td className="veh-tag">Nº {v.numeroFrota}</td>
                    <td>{v.fabricante}</td>
                    <td>{v.ano || <span className="muted">—</span>}</td>
                    <td>{pend > 0 ? <span className="badge badge-pendente">{pend} pendente(s)</span> : <span className="muted">Sem pendências</span>}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger-ghost"
                        onClick={() => {
                          const emUso = solicitacoes.some((s) => s.veiculoId === v.id);
                          const msg = emUso
                            ? 'Este veículo tem solicitações associadas. Remover mesmo assim? O histórico dessas solicitações será mantido.'
                            : 'Remover este veículo do sistema?';
                          if (confirm(msg)) onRemover(v.id);
                        }}
                      >
                        Remover
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
