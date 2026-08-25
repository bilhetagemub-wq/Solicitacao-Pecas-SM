'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import { FUNCOES, FUNCAO_LABEL } from '../lib/roles';
import { criarUsuario, atualizarFuncaoUsuario, excluirUsuario, testarEmailAlerta } from '../lib/adminApi';

export default function ConfiguracoesTab({ config, onConfigChange, notify, solicitacoes = [] }) {
  const [emails, setEmails] = useState(config.alertEmails || []);
  const [novoEmail, setNovoEmail] = useState('');
  const [alertaDias, setAlertaDias] = useState(config.alertaDias || 7);

  const [usuarios, setUsuarios] = useState([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);
  const [novoUsuario, setNovoUsuario] = useState({ email: '', senha: '', role: 'encarregado' });
  const [criando, setCriando] = useState(false);
  const [erroUsuario, setErroUsuario] = useState('');
  const [testandoEmail, setTestandoEmail] = useState(false);
  const [reprocessando, setReprocessando] = useState(false);

  useEffect(() => { setEmails(config.alertEmails || []); }, [config.alertEmails]);
  useEffect(() => { setAlertaDias(config.alertaDias || 7); }, [config.alertaDias]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'usuarios'),
      (snap) => {
        setUsuarios(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
        setCarregandoUsuarios(false);
      },
      () => setCarregandoUsuarios(false)
    );
    return unsub;
  }, []);

  function adicionarEmail() {
    const v = novoEmail.trim().toLowerCase();
    if (!v) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { notify('Digite um e-mail válido.', 'err'); return; }
    if (emails.includes(v)) { notify('Esse e-mail já está na lista.', 'err'); return; }
    const nova = [...emails, v];
    setEmails(nova);
    setNovoEmail('');
    onConfigChange({ alertEmails: nova });
  }

  function removerEmail(email) {
    const nova = emails.filter((e) => e !== email);
    setEmails(nova);
    onConfigChange({ alertEmails: nova });
  }

  function salvarAlertaDias() {
    const v = parseInt(alertaDias, 10);
    onConfigChange({ alertaDias: isNaN(v) || v < 1 ? 7 : v });
  }

  async function handleTestarEmail() {
    setTestandoEmail(true);
    try {
      const resultado = await testarEmailAlerta();
      const lista = (resultado.destinatarios || []).join(', ');
      notify(`E-mail de teste enviado para: ${lista}`, 'ok');
    } catch (err) {
      notify(err.message, 'err');
    } finally {
      setTestandoEmail(false);
    }
  }

  async function handleReprocessarAlertas() {
    const emAberto = solicitacoes.filter((s) => s.status !== 'Em Estoque' && s.alertaEnviado === true);
    if (emAberto.length === 0) {
      notify('Nenhuma peça em aberto está marcada como "já alertada" — nada para reprocessar.', 'ok');
      return;
    }
    if (!confirm(
      `${emAberto.length} peça(s) em aberto estão marcadas como já alertadas. ` +
      'Isso vai limpar essa marcação para que o próximo alerta (diário ou manual) as reavalie. Continuar?'
    )) return;

    setReprocessando(true);
    try {
      const batch = writeBatch(db);
      emAberto.forEach((s) => {
        batch.update(doc(db, 'solicitacoes', s.id), { alertaEnviado: false });
      });
      await batch.commit();
      notify(`${emAberto.length} peça(s) liberada(s) para reavaliação no próximo alerta.`, 'ok');
    } catch (err) {
      notify('Erro ao reprocessar: ' + err.message, 'err');
    } finally {
      setReprocessando(false);
    }
  }

  async function handleCriarUsuario(e) {
    e.preventDefault();
    setErroUsuario('');
    setCriando(true);
    try {
      await criarUsuario(novoUsuario.email.trim(), novoUsuario.senha, novoUsuario.role);
      notify('Usuário criado com sucesso.', 'ok');
      setNovoUsuario({ email: '', senha: '', role: 'encarregado' });
    } catch (err) {
      setErroUsuario(err.message);
    } finally {
      setCriando(false);
    }
  }

  async function handleMudarRole(uid, role) {
    try {
      await atualizarFuncaoUsuario(uid, role);
      notify('Função atualizada.', 'ok');
    } catch (err) {
      notify(err.message, 'err');
    }
  }

  async function handleExcluirUsuario(uid, email) {
    if (!confirm(`Excluir o usuário ${email}? Essa ação não pode ser desfeita.`)) return;
    try {
      await excluirUsuario(uid);
      notify('Usuário excluído.', 'ok');
    } catch (err) {
      notify(err.message, 'err');
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Configurações</h1>
          <p>Alertas por e-mail e gerenciamento de usuários — acesso restrito a Developer</p>
        </div>
      </div>

      <div className="panel">
        <h2>E-mails de alerta</h2>
        <p className="muted" style={{ margin: '0 0 14px' }}>
          Esses e-mails recebem o resumo diário de peças atrasadas.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {emails.length === 0 && <span className="muted">Nenhum e-mail cadastrado ainda.</span>}
          {emails.map((email) => (
            <span key={email} className="badge badge-baixa" style={{ paddingRight: 6 }}>
              {email}
              <button
                onClick={() => removerEmail(email)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--vermelho)', fontWeight: 700, padding: '0 2px' }}
              >×</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, maxWidth: 420, marginBottom: 14 }}>
          <input type="email" placeholder="novo-email@saomiguel.com.br" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={adicionarEmail}>Adicionar</button>
        </div>
        <button className="btn btn-ghost" onClick={handleTestarEmail} disabled={testandoEmail}>
          {testandoEmail ? 'Enviando teste…' : '✉ Enviar e-mail de teste'}
        </button>
        <p className="muted" style={{ marginTop: 8 }}>
          Envia uma mensagem de teste para os e-mails cadastrados acima, sem esperar o alerta automático diário.
        </p>
      </div>

      <div className="panel">
        <h2>Configurar alertas</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, marginBottom: 18 }}>
          Alertar peça pendente há mais de
          <input type="number" min="1" value={alertaDias} style={{ width: 70, textAlign: 'center' }}
            onChange={(e) => setAlertaDias(e.target.value)} onBlur={salvarAlertaDias} />
          dias
        </div>
        <button className="btn btn-ghost" onClick={handleReprocessarAlertas} disabled={reprocessando}>
          {reprocessando ? 'Reprocessando…' : '🔄 Reprocessar alertas de atraso'}
        </button>
        <p className="muted" style={{ marginTop: 8 }}>
          Use se uma peça está atrasada mas o e-mail nunca chegou (por exemplo, depois de resolver um
          problema no envio) — libera as peças em aberto para serem reavaliadas no próximo alerta,
          sem precisar esperar o status mudar.
        </p>
      </div>

      <div className="panel">
        <h2>Adicionar usuário</h2>
        <form onSubmit={handleCriarUsuario}>
          <div className="grid3">
            <div className="field">
              <label>E-mail</label>
              <input type="email" required value={novoUsuario.email}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Senha temporária</label>
              <input type="text" required minLength={6} placeholder="mín. 6 caracteres" value={novoUsuario.senha}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })} />
            </div>
            <div className="field">
              <label>Função</label>
              <select value={novoUsuario.role} onChange={(e) => setNovoUsuario({ ...novoUsuario, role: e.target.value })}>
                {FUNCOES.map((f) => <option key={f} value={f}>{FUNCAO_LABEL[f]}</option>)}
              </select>
            </div>
          </div>
          {erroUsuario && <p style={{ color: 'var(--vermelho)', fontSize: 12.5, marginBottom: 10 }}>{erroUsuario}</p>}
          <button type="submit" className="btn btn-primary" disabled={criando}>
            {criando ? 'Criando…' : 'Criar usuário'}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Usuários do sistema</h2>
        {carregandoUsuarios ? (
          <p className="muted">Carregando…</p>
        ) : usuarios.length === 0 ? (
          <div className="empty"><h3>Nenhum usuário cadastrado ainda</h3><p>Use o formulário acima para criar o primeiro.</p></div>
        ) : (
          <table>
            <thead><tr><th>E-mail</th><th>Função</th><th></th></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.uid}>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} onChange={(e) => handleMudarRole(u.uid, e.target.value)}>
                      {FUNCOES.map((f) => <option key={f} value={f}>{FUNCAO_LABEL[f]}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger-ghost" onClick={() => handleExcluirUsuario(u.uid, u.email)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
