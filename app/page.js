'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  setDoc, getDoc, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import { TAB_ACCESS } from '../lib/roles';
import {
  tocarBipAlerta, permissaoNotificacaoConcedida, solicitarPermissaoNotificacao, notificarNavegador,
} from '../lib/notificacoes';
import { notificarEmEstoque } from '../lib/adminApi';
import LoginGate, { useAuthInfo } from '../components/LoginGate';
import Sidebar from '../components/Sidebar';
import DashboardTab from '../components/DashboardTab';
import SolicitarTab from '../components/SolicitarTab';
import CompradorTab from '../components/CompradorTab';
import AtualizacoesTab from '../components/AtualizacoesTab';
import RelatorioTab from '../components/RelatorioTab';
import ConfiguracoesTab from '../components/ConfiguracoesTab';

function AppInner() {
  const { user, role } = useAuthInfo();
  const allowedTabs = TAB_ACCESS[role] || [];

  const [view, setView] = useState(allowedTabs[0] || 'dashboard');
  const [frota, setFrota] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [config, setConfig] = useState({ alertaDias: 7, alertEmails: [] });
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(false);

  const roleRef = useRef(role);
  useEffect(() => { roleRef.current = role; }, [role]);

  const frotaRef = useRef(frota);
  useEffect(() => { frotaRef.current = frota; }, [frota]);

  useEffect(() => {
    setNotificacoesAtivas(permissaoNotificacaoConcedida());
  }, []);

  const ativarNotificacoes = useCallback(async () => {
    const concedida = await solicitarPermissaoNotificacao();
    setNotificacoesAtivas(concedida);
  }, []);

  const notify = useCallback((msg, type = '') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // Garante que a aba atual é permitida para a função do usuário
  useEffect(() => {
    if (allowedTabs.length && !allowedTabs.includes(view)) {
      setView(allowedTabs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    const unsubFrota = onSnapshot(
      query(collection(db, 'frota'), orderBy('numeroFrota')),
      (snap) => setFrota(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => notify('Erro ao carregar a frota do Firebase.', 'err')
    );

    let primeiraCarga = true;
    const unsubSol = onSnapshot(
      collection(db, 'solicitacoes'),
      (snap) => {
        const podeReceberAlerta = ['comprador', 'gerente', 'developer'].includes(roleRef.current);
        if (!primeiraCarga && podeReceberAlerta) {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const s = change.doc.data();
              if (s.status === 'Pendente') {
                const v = frotaRef.current.find((f) => f.id === s.veiculoId);
                const veiculoTxt = v ? `Nº ${v.numeroFrota} · ${v.fabricante}` : 'veículo';
                notify(`🆕 Nova solicitação: ${s.peca} (qtd ${s.quantidade}) — ${veiculoTxt}`, 'ok');
                tocarBipAlerta();
                if (document.hidden) {
                  notificarNavegador('Nova solicitação de peça', `${s.peca} — ${veiculoTxt}`);
                }
              }
            }
          });
        }
        primeiraCarga = false;
        setSolicitacoes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => notify('Erro ao carregar as solicitações do Firebase.', 'err')
    );

    (async () => {
      const cfgRef = doc(db, 'config', 'geral');
      const cfgSnap = await getDoc(cfgRef);
      if (!cfgSnap.exists()) {
        await setDoc(cfgRef, { alertaDias: 7, alertEmails: [] });
      }
      setLoading(false);
    })();

    const unsubCfg = onSnapshot(doc(db, 'config', 'geral'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    return () => { unsubFrota(); unsubSol(); unsubCfg(); };
  }, [notify]);

  // --- ações: frota ---
  const upsertFrotaLote = async (parsed) => {
    let novos = 0, atualizados = 0;
    for (const p of parsed) {
      const existente = frota.find((v) => v.numeroFrota === p.numeroFrota);
      if (existente) {
        await updateDoc(doc(db, 'frota', existente.id), {
          fabricante: p.fabricante || existente.fabricante,
          ano: p.ano || existente.ano || '',
        });
        atualizados++;
      } else {
        await addDoc(collection(db, 'frota'), { numeroFrota: p.numeroFrota, fabricante: p.fabricante, ano: p.ano || '' });
        novos++;
      }
    }
    notify(`Frota atualizada: ${novos} nova(s), ${atualizados} atualizada(s).`, 'ok');
  };

  const removerVeiculo = async (id) => {
    await deleteDoc(doc(db, 'frota', id));
    notify('Veículo removido.', 'ok');
  };

  // --- ações: solicitações ---
  const criarSolicitacao = async (dados) => {
    const ref = await addDoc(collection(db, 'solicitacoes'), {
      ...dados,
      status: 'Pendente',
      dataSolicitacao: serverTimestamp(),
      dataStatus: serverTimestamp(),
      dataResolucao: null,
      alertaEnviado: false,
      instalada: null,
    });
    notify('Solicitação enviada com sucesso!', 'ok');
    return { id: ref.id };
  };

  const atualizarStatus = async (id, novoStatus) => {
    const patch = {
      status: novoStatus,
      dataStatus: serverTimestamp(),
      dataResolucao: novoStatus === 'Em Estoque' ? serverTimestamp() : null,
    };
    if (novoStatus !== 'Em Estoque') patch.alertaEnviado = false;
    await updateDoc(doc(db, 'solicitacoes', id), patch);
    notify('Status atualizado: ' + novoStatus, 'ok');

    if (novoStatus === 'Em Estoque') {
      try {
        const resultado = await notificarEmEstoque(id);
        if (!resultado.skipped) {
          notify('📧 E-mail avisando que a peça chegou foi enviado.', 'ok');
        }
      } catch (err) {
        notify('Status salvo, mas o e-mail de aviso falhou: ' + err.message, 'err');
      }
    }
  };

  const atualizarInstalada = async (id, valor, motivo) => {
    const patch = { instalada: valor, dataInstalada: serverTimestamp() };
    patch.motivoNaoInstalada = valor === false ? (motivo || '') : null;
    await updateDoc(doc(db, 'solicitacoes', id), patch);
    notify(valor ? 'Marcado: peça instalada no veículo.' : 'Marcado: peça não instalada no veículo.', 'ok');
  };

  const excluirSolicitacao = async (id) => {
    await deleteDoc(doc(db, 'solicitacoes', id));
    notify('Solicitação excluída.', 'ok');
  };

  const atualizarConfig = async (novoConfig) => {
    await setDoc(doc(db, 'config', 'geral'), novoConfig, { merge: true });
  };

  return (
    <>
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={'toast ' + t.type}>{t.msg}</div>
        ))}
      </div>

      <div className="app">
        <Sidebar
          view={view} setView={setView} role={role} userEmail={user.email} allowedTabs={allowedTabs}
          notificacoesAtivas={notificacoesAtivas} onAtivarNotificacoes={ativarNotificacoes}
        />
        <div className="main">
          {loading ? (
            <p className="muted">Carregando dados do Firebase…</p>
          ) : (
            <>
              {view === 'dashboard' && allowedTabs.includes('dashboard') && (
                <DashboardTab frota={frota} solicitacoes={solicitacoes} config={config} role={role} onUpdateInstalada={atualizarInstalada} onDelete={excluirSolicitacao} />
              )}
              {view === 'solicitacao' && allowedTabs.includes('solicitacao') && (
                <SolicitarTab frota={frota} solicitacoes={solicitacoes} onSubmit={criarSolicitacao} onDelete={excluirSolicitacao} />
              )}
              {view === 'comprador' && allowedTabs.includes('comprador') && (
                <CompradorTab
                  frota={frota}
                  solicitacoes={solicitacoes}
                  config={config}
                  role={role}
                  onUpdateStatus={atualizarStatus}
                  onDelete={excluirSolicitacao}
                />
              )}
              {view === 'atualizacoes' && allowedTabs.includes('atualizacoes') && (
                <AtualizacoesTab frota={frota} solicitacoes={solicitacoes} onUpsertLote={upsertFrotaLote} onRemover={removerVeiculo} />
              )}
              {view === 'relatorio' && allowedTabs.includes('relatorio') && (
                <RelatorioTab frota={frota} solicitacoes={solicitacoes} config={config} />
              )}
              {view === 'configuracoes' && allowedTabs.includes('configuracoes') && (
                <ConfiguracoesTab config={config} onConfigChange={atualizarConfig} notify={notify} solicitacoes={solicitacoes} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <LoginGate>
      <AppInner />
    </LoginGate>
  );
}
