'use client';

import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import { FUNCAO_LABEL } from '../lib/roles';

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" /> },
  { id: 'solicitacao', label: 'Solicitar Peça', icon: <path d="M12 5v14M5 12h14" /> },
  { id: 'comprador', label: 'Aba do Comprador', icon: null },
  { id: 'relatorio', label: 'Relatório', icon: <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7M9 13h6M9 17h6" /> },
  { id: 'atualizacoes', label: 'Atualizações', icon: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /> },
  { id: 'configuracoes', label: 'Configurações', icon: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 12h2M19 12h2M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /> },
];

export default function Sidebar({ view, setView, role, userEmail, allowedTabs, notificacoesAtivas, onAtivarNotificacoes }) {
  const visiveis = ITEMS.filter((item) => allowedTabs.includes(item.id));
  const gerenciaCompras = allowedTabs.includes('comprador');

  return (
    <div className="sidebar">
      <div className="brand">
        <img src="/logo.png" alt="São Miguel" />
      </div>
      <div className="sub" style={{ padding: '0 8px 14px' }}>Controle de Peças</div>

      {visiveis.map((item) => (
        <button
          key={item.id}
          className={'navbtn' + (view === item.id ? ' active' : '')}
          onClick={() => setView(item.id)}
        >
          <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {item.id === 'comprador' ? (
              <>
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </>
            ) : item.icon}
          </svg>
          <span className="label-text">{item.label}</span>
        </button>
      ))}

      {gerenciaCompras && (
        <>
          <div style={{ height: 1, background: 'var(--borda)', margin: '10px 4px' }} />
          {notificacoesAtivas ? (
            <div className="navbtn" style={{ color: 'var(--verde-escuro)', cursor: 'default' }}>
              <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="label-text">Notificações ativas</span>
            </div>
          ) : (
            <button className="navbtn" onClick={onAtivarNotificacoes} title="Receber um aviso sonoro e pop-up quando chegar um pedido novo">
              <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="label-text">Ativar notificações</span>
            </button>
          )}
        </>
      )}

      <div className="sidebar-foot">
        <div style={{ fontSize: 12.5, color: 'var(--texto)', fontWeight: 600, marginBottom: 2 }}>
          {FUNCAO_LABEL[role] || role}
        </div>
        <div style={{ marginBottom: 10, wordBreak: 'break-all' }}>{userEmail}</div>
        <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => signOut(auth)}>
          Sair
        </button>
      </div>
    </div>
  );
}
