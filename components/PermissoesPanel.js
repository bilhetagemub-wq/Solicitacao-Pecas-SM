'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FUNCOES, FUNCAO_LABEL, ABAS, resolverAcessos, alternarAcesso, validarAcessos,
  acessosIguais, acessoBloqueado, funcaoPodeEditar,
} from '../lib/roles';
import { fmtDate } from '../lib/utils';

export default function PermissoesPanel({ permissoes, meta, usuarios = [], onSalvar }) {
  const [rascunho, setRascunho] = useState(permissoes);
  const [salvando, setSalvando] = useState(false);
  const ultimoSalvo = useRef(permissoes);

  // Se outra pessoa salvar enquanto esta tela está aberta, o rascunho acompanha —
  // mas só quando você ainda não mexeu em nada, para nunca apagar uma edição em andamento.
  useEffect(() => {
    const anterior = ultimoSalvo.current;
    ultimoSalvo.current = permissoes;
    setRascunho((atual) => (acessosIguais(atual, anterior) ? permissoes : atual));
  }, [permissoes]);

  const alterado = !acessosIguais(rascunho, permissoes);
  const erros = validarAcessos(rascunho);

  function alternar(funcao, abaId) {
    setRascunho((r) => alternarAcesso(r, funcao, abaId));
  }

  async function salvar() {
    if (erros.length > 0) return;
    setSalvando(true);
    try {
      await onSalvar(resolverAcessos(rascunho));
    } finally {
      setSalvando(false);
    }
  }

  const quantos = (funcao) => usuarios.filter((u) => u.role === funcao).length;

  return (
    <div className="panel">
      <h2>Permissões por função</h2>
      <p className="muted" style={{ margin: '0 0 16px' }}>
        Marque o que cada função enxerga no menu. Depois de salvar, a mudança vale na hora
        para quem já estiver com o sistema aberto.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Aba</th>
              {FUNCOES.map((f) => (
                <th key={f} style={{ textAlign: 'center', minWidth: 110 }}>
                  {FUNCAO_LABEL[f]}
                  <div className="muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginTop: 2 }}>
                    {quantos(f)} usuário(s)
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ABAS.map((aba) => (
              <tr key={aba.id}>
                <td>
                  <strong>{aba.label}</strong>
                  <div className="muted">{aba.desc}</div>
                </td>
                {FUNCOES.map((f) => {
                  const marcado = rascunho[f].includes(aba.id);
                  const travado = acessoBloqueado(aba.id);
                  const mudou = marcado !== permissoes[f].includes(aba.id);
                  const somenteLeitura = marcado && !funcaoPodeEditar(f, aba.id);
                  return (
                    <td
                      key={f}
                      style={{
                        textAlign: 'center',
                        background: mudou ? '#FFF6E0' : marcado ? '#F2FAF5' : undefined,
                      }}
                    >
                      <label
                        style={{
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          margin: 0, padding: '6px 0', cursor: travado ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={travado}
                          onChange={() => alternar(f, aba.id)}
                          aria-label={`${FUNCAO_LABEL[f]} — ${aba.label}`}
                          style={{ width: 18, height: 18, margin: 0, padding: 0, accentColor: 'var(--verde)' }}
                        />
                      </label>
                      {travado && (
                        <div className="muted" title="Exclusiva do Developer: é onde se gerenciam usuários e permissões.">
                          🔒 {marcado ? 'exclusiva' : ''}
                        </div>
                      )}
                      {somenteLeitura && (
                        <div
                          className="muted"
                          style={{ color: '#946B00' }}
                          title="Essa função vê a aba, mas as regras de segurança do banco não permitem que ela altere nada nela."
                        >
                          somente leitura
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {erros.length > 0 && (
        <div style={{ marginTop: 14, color: 'var(--vermelho)', fontSize: 13 }}>
          {erros.map((e) => <div key={e}>⚠ {e}</div>)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 16 }}>
        <button className="btn btn-primary" onClick={salvar} disabled={!alterado || erros.length > 0 || salvando}>
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
        <button className="btn btn-ghost" onClick={() => setRascunho(permissoes)} disabled={!alterado || salvando}>
          Descartar
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setRascunho(resolverAcessos(null))}
          disabled={salvando}
          title="Volta ao que o sistema traz de fábrica. Só vale depois de clicar em Salvar."
        >
          Restaurar padrão do sistema
        </button>
        {alterado && <span className="muted" style={{ color: '#946B00' }}>Alterações ainda não salvas (células em amarelo)</span>}
      </div>

      {meta?.por && (
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Última alteração por <strong>{meta.por}</strong>{meta.em ? ` em ${fmtDate(meta.em)}` : ''}.
        </p>
      )}

      <div style={{ marginTop: 16, background: '#F5F6F8', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: 'var(--texto-suave)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--texto)' }}>O que esta tela controla — e o que não controla.</strong>{' '}
        Aqui você define o que cada função <em>enxerga</em> no menu. O que cada uma pode{' '}
        <em>alterar</em> (criar, editar, excluir) continua definido pelas regras de segurança do
        banco de dados — por isso aparece <strong>"somente leitura"</strong> quando uma função
        enxerga uma aba mas não pode modificar nada nela. A aba Configurações é exclusiva do
        Developer e não pode ser liberada para outras funções.
      </div>
    </div>
  );
}
